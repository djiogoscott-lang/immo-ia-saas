/**
 * POST /api/chat — route de streaming pour le chat multi-agents Nestenn.
 *
 * Flow complet :
 *   1. Authentification : l'utilisateur doit être connecté (Supabase Auth).
 *   2. Rate limit : 30 messages / minute / user (in-memory MVP).
 *   3. Validation du body (Zod) : agentId valide, messages non vides,
 *      conversationId optionnel.
 *   4. Récupération/création de la conversation côté Supabase :
 *        - si conversationId fourni → vérifié + récupéré
 *        - sinon → créé avec un titre généré à partir du 1er message
 *   5. Persistance du dernier message user (insert messages).
 *   6. Streaming OpenRouter via Vercel AI SDK (`streamText`).
 *   7. Dans `onFinish`, persistance du message assistant + tokens consommés.
 *   8. Le client reçoit le streaming + l'ID de conversation dans le header
 *      `X-Conversation-Id` pour pouvoir le ré-utiliser sur les messages suivants.
 *
 * Variables d'environnement requises :
 *   - OPENROUTER_API_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (utilisés par
 *     le client serveur Supabase via cookies — refresh assuré par le middleware)
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, type CoreMessage } from 'ai';
import { z } from 'zod';

import { buildRagContext } from '@/lib/agents/rag-context';
import { canAccessAgent, getAgent, isValidAgentId } from '@/lib/agents/registry';
import { getCurrentProfile } from '@/lib/auth/get-current-user';
import { APP_NAME } from '@/lib/branding';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import {
  addMessage,
  createConversation,
  generateConversationTitle,
  getConversation,
} from '@/lib/supabase/conversations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Schéma de validation du body
// ---------------------------------------------------------------------------

// Bornes anti-abus : un client ne doit ni injecter de messages `system`
// (qui écraseraient le system prompt de l'agent) ni faire exploser les coûts.
const MAX_MESSAGE_CHARS = 20_000;
const MAX_MESSAGES = 60;
const MAX_TOTAL_CHARS = 150_000;

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant']),
  content: z.string().max(MAX_MESSAGE_CHARS),
});

const bodySchema = z.object({
  agentId: z.string().min(1),
  messages: z
    .array(messageSchema)
    .min(1)
    .max(MAX_MESSAGES)
    .refine((msgs) => msgs[msgs.length - 1]?.role === 'user', {
      message: 'Le dernier message doit provenir de l’utilisateur.',
    })
    .refine(
      (msgs) => msgs.reduce((sum, m) => sum + m.content.length, 0) <= MAX_TOTAL_CHARS,
      { message: 'Conversation trop longue.' }
    ),
  /** ID de conversation Supabase. Si absent, une nouvelle conversation est créée. */
  conversationId: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Client OpenRouter
// ---------------------------------------------------------------------------

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY manquante dans process.env. ' +
        "Vérifie ton .env.local (et le dashboard Vercel/Lovable pour la prod)."
    );
  }
  return createOpenRouter({
    apiKey,
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': `${APP_NAME} - Multi-Agents`,
    },
  });
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Auth : user connecté + profil obligatoires (le rôle sert au contrôle
  //    d'accès aux agents plus bas).
  const profile = await getCurrentProfile();
  if (!profile) {
    return Response.json(
      { error: 'unauthorized', message: 'Connexion requise.' },
      { status: 401 }
    );
  }

  // 2. Rate limit
  const rl = rateLimit({
    identifier: `chat:${profile.id}`,
    ...RATE_LIMITS.chat,
  });
  if (!rl.success) {
    return Response.json(
      {
        error: 'rate_limit_exceeded',
        message: 'Limite de messages atteinte. Réessaie dans une minute.',
        resetAt: rl.resetAt,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rl.resetAt),
        },
      }
    );
  }

  // 3. Parsing + validation
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      { error: 'invalid_json', message: 'Le body doit être du JSON valide.' },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'invalid_body',
        message: 'Body de requête invalide.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }
  const { agentId, messages, conversationId: incomingConvId } = parsed.data;

  // 4. Validation de l'agent
  if (!isValidAgentId(agentId)) {
    return Response.json(
      {
        error: 'unknown_agent',
        message: `L'agent "${agentId}" n'existe pas dans le registre.`,
      },
      { status: 400 }
    );
  }
  const agent = getAgent(agentId);

  // 4bis. Contrôle d'accès par rôle — le filtrage de la sidebar n'est que
  //       cosmétique, c'est ici que l'audience de l'agent est appliquée.
  if (!canAccessAgent(agent, profile.role)) {
    return Response.json(
      { error: 'forbidden_agent', message: "Cet agent n'est pas disponible pour votre rôle." },
      { status: 403 }
    );
  }

  // 5. Récupération ou création de la conversation (RLS Supabase).
  let conversation: { id: string; user_id: string; agent_id: string } | null;

  if (incomingConvId) {
    conversation = await getConversation(incomingConvId);
    if (!conversation || conversation.user_id !== profile.id || conversation.agent_id !== agentId) {
      return Response.json(
        { error: 'conversation_not_found', message: 'Conversation introuvable.' },
        { status: 404 }
      );
    }
  } else {
    const firstUserMsg = messages.find((m) => m.role === 'user');
    conversation = await createConversation({
      userId: profile.id,
      agentId,
      title: firstUserMsg
        ? generateConversationTitle(firstUserMsg.content)
        : undefined,
    });
    if (!conversation) {
      return Response.json(
        { error: 'conversation_create_failed', message: 'Création de conversation impossible.' },
        { status: 500 }
      );
    }
  }
  const conversationId = conversation.id;

  // 6. Préparation du client OpenRouter (avant toute écriture en base : une
  //    config manquante ne doit pas laisser un message user orphelin)
  let openrouter: ReturnType<typeof createOpenRouter>;
  try {
    openrouter = getOpenRouterClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur de configuration';
    return Response.json(
      { error: 'configuration_error', message },
      { status: 500 }
    );
  }

  // 7. En parallèle (indépendants) : persistance du dernier message user
  //    (garanti par le schéma Zod) + construction du contexte RAG.
  //    Le RAG est robuste aux pannes : si Nomic est down, le chat continue.
  const lastUserMessage = messages[messages.length - 1]!;
  const [, rag] = await Promise.all([
    addMessage({
      conversationId,
      role: 'user',
      content: lastUserMessage.content,
    }),
    buildRagContext(lastUserMessage.content, profile.id, { conversationId }),
  ]);

  let systemPrompt = agent.systemPrompt;
  if (rag.systemPromptAddon) {
    systemPrompt = `${rag.systemPromptAddon}\n${agent.systemPrompt}`;
    console.log(
      `[/api/chat] RAG injected: ${rag.sources.length} sources for user ${profile.id.slice(0, 8)}`
    );
  }

  // 8. Streaming
  try {
    const result = streamText({
      model: openrouter.chat(agent.model),
      system: systemPrompt,
      messages: messages as CoreMessage[],
      temperature: agent.temperature,
      onFinish: async ({ text, usage }) => {
        await addMessage({
          conversationId,
          role: 'assistant',
          content: text,
          tokensIn: usage?.promptTokens ?? null,
          tokensOut: usage?.completionTokens ?? null,
          modelUsed: agent.model,
        });
      },
    });

    const responseHeaders: Record<string, string> = {
      'X-RateLimit-Remaining': String(rl.remaining),
      'X-RateLimit-Reset': String(rl.resetAt),
      'X-Conversation-Id': conversationId,
    };

    return result.toDataStreamResponse({
      sendUsage: true,
      headers: responseHeaders,
      getErrorMessage: (error) => {
        console.error('[/api/chat] stream error:', error);
        if (error == null) return 'Erreur inconnue';
        if (typeof error === 'string') return error;
        if (error instanceof Error) return error.message;
        try { return JSON.stringify(error); } catch { return 'Erreur non sérialisable'; }
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return Response.json(
      { error: 'streaming_error', message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Rejet explicite des autres méthodes
// ---------------------------------------------------------------------------

export async function GET() {
  return Response.json(
    { error: 'method_not_allowed', message: 'Utilisez POST /api/chat.' },
    { status: 405 }
  );
}
