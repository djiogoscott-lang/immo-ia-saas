/**
 * POST /api/conversations — crée une conversation vide pour un agent donné.
 *
 * Utilisée par AgentChat pour permettre à l'utilisateur d'uploader un fichier
 * AVANT d'avoir envoyé son premier message (sinon la FK agent_files.conversation_id
 * ne peut être renseignée).
 *
 * Body : { agentId: string, title?: string }
 * Response : { id, agent_id, title, created_at }
 */

import { z } from 'zod';

import { canAccessAgent, getAgent, isValidAgentId } from '@/lib/agents/registry';
import { getCurrentProfile } from '@/lib/auth/get-current-user';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createConversation } from '@/lib/supabase/conversations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  agentId: z.string().min(1),
  title: z.string().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentProfile();
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
  if (!canAccessAgent(getAgent(agentId), user.role)) {
    return Response.json(
      { error: 'forbidden_agent', message: "Cet agent n'est pas disponible pour votre rôle." },
      { status: 403 }
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
