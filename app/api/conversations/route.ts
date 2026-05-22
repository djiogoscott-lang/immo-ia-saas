/**
 * POST /api/conversations — crée une conversation vide pour un agent donné.
 *
 * Utilisée par AgentChat pour permettre à l'utilisateur d'uploader un fichier
 * AVANT d'avoir envoyé son premier message (sinon la FK agent_files.conversation_id
 * ne peut être renseignée).
 *
 * Body : { agentId: string, title?: string }
 * Response : { id, agent_id, title, created_at }
 *
 * Mode démo : refuse car DB inaccessible. L'UI doit gérer ce cas.
 */

import { z } from 'zod';

import { isValidAgentId } from '@/lib/agents/registry';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createConversation } from '@/lib/supabase/conversations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  agentId: z.string().min(1),
  title: z.string().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  const isDemoMode = process.env.DEMO_MODE !== 'false';
  if (isDemoMode) {
    return Response.json(
      {
        error: 'demo_mode',
        message:
          "La création de conversation persistante n'est pas disponible en mode démo. Connecte-toi pour activer cette fonctionnalité.",
      },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: 'unauthorized', message: 'Connexion requise.' },
      { status: 401 }
    );
  }

  // Rate limit (réutilise le même limiter que l'upload pour éviter le spam de
  // créations de conv vides — la création est légère en BDD mais peut être abusée)
  const rl = rateLimit({
    identifier: `conversations:create:${user.id}`,
    ...RATE_LIMITS.chat,
  });
  if (!rl.success) {
    return Response.json(
      {
        error: 'rate_limit_exceeded',
        message: 'Trop de créations récentes. Réessaie dans une minute.',
        resetAt: rl.resetAt,
      },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'invalid_json', message: 'Body JSON invalide.' },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'invalid_body',
        message: 'Champs requis : agentId.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { agentId, title } = parsed.data;

  if (!isValidAgentId(agentId)) {
    return Response.json(
      { error: 'unknown_agent', message: `Agent "${agentId}" inconnu.` },
      { status: 400 }
    );
  }

  const conversation = await createConversation({
    userId: user.id,
    agentId,
    title: title ?? 'Nouvelle conversation',
  });

  if (!conversation) {
    return Response.json(
      { error: 'create_failed', message: 'Création de conversation impossible (RLS / BDD).' },
      { status: 500 }
    );
  }

  return Response.json(
    {
      id: conversation.id,
      agent_id: conversation.agent_id,
      title: conversation.title,
      created_at: conversation.created_at,
    },
    { status: 201 }
  );
}

export async function GET() {
  return Response.json(
    { error: 'method_not_allowed', message: 'Utilisez POST /api/conversations.' },
    { status: 405 }
  );
}
