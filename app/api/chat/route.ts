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

import { getAgent, isValidAgentId } from '@/lib/agents/registry';
import { getCurrentUser } from '@/lib/auth/get-current-user';
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

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['system', 'user', 'assistant', 'tool', 'data']),
  content: z.string(),
});

const bodySchema = z.object({
  agentId: z.string().min(1),
  messages: z.array(messageSchema).min(1),
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
      'X-Title': 'Nestenn IA — Multi-Agents',
    },
  });
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const isDemoMode = process.env.DEMO_MODE === 'true';

  // 1. Auth : skip en mode démo (auth désactivée pour l'accès libre).
  //    Sinon : user connecté obligatoire.
  let user: { id: string } | null = null;
  let identifier: string;

  if (isDemoMode) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    identifier = `chat:ip:${ip}`;
  } else {
    user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { error: 'unauthorized', message: 'Connexion requise.' },
        { status: 401 }
      );
    }
    identifier = `chat:${user.id}`;
  }

  // 2. Rate limit
  const rl = rateLimit({
    identifier,
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

  // 5. Récupération ou création de la conversation — SKIP en mode démo
  //    (les tables Supabase ne sont pas requises). En mode normal : RLS Supabase.
  let conversation: { id: string; user_id: string } | null = null;

  if (!isDemoMode) {
    if (incomingConvId) {
      conversation = await getConversation(incomingConvId);
      if (!conversation || conversation.user_id !== user!.id) {
        return Response.json(
          { error: 'conversation_not_found', message: 'Conversation introuvable.' },
          { status: 404 }
        );
      }
    } else {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      conversation = await createConversation({
        userId: user!.id,
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

    // 6. Persistance du dernier message user
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      await addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: lastUserMessage.content,
      });
    }
  }

  // 7. Préparation du client OpenRouter
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

  // 8. Streaming
  try {
    const result = streamText({
      model: openrouter.chat(agent.model),
      system: agent.systemPrompt,
      messages: messages as CoreMessage[],
      temperature: agent.temperature,
      onFinish: async ({ text, usage }) => {
        // Persistance assistant — SKIP en mode démo.
        if (!isDemoMode && conversation) {
          await addMessage({
            conversationId: conversation.id,
            role: 'assistant',
            content: text,
            tokensIn: usage?.promptTokens ?? null,
            tokensOut: usage?.completionTokens ?? null,
            modelUsed: agent.model,
          });
        }
      },
    });

    const responseHeaders: Record<string, string> = {
      'X-RateLimit-Remaining': String(rl.remaining),
      'X-RateLimit-Reset': String(rl.resetAt),
    };
    if (conversation) {
      responseHeaders['X-Conversation-Id'] = conversation.id;
    }

    return result.toDataStreamResponse({
      sendUsage: true,
      headers: responseHeaders,
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
