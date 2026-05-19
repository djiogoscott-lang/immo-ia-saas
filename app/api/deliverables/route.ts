/**
 * /api/deliverables — CRUD livrables d'agents (Markdown + frontmatter YAML).
 *
 * - POST : crée un livrable depuis un message d'agent.
 * - GET  : liste les livrables de l'utilisateur connecté (filtres optionnels
 *          via query params : ?agentId=julia&campagne=...&status=draft).
 *
 * Mode démo : renvoie 403 (auth Supabase requise pour la persistance).
 */

import { z } from 'zod';

import { isValidAgentId, type AgentId } from '@/lib/agents/registry';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import {
  createDeliverable,
  listDeliverables,
  type DeliverableStatus,
} from '@/lib/supabase/deliverables';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES: readonly DeliverableStatus[] = ['draft', 'final', 'archived'];

const createBodySchema = z.object({
  agentId: z.string().min(1),
  type: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Le slug doit être en kebab-case (a-z 0-9 -).'),
  markdownBody: z.string().min(1).max(100_000),
  campagne: z.string().max(200).optional(),
  conversationId: z.string().uuid().optional(),
  modelUsed: z.string().max(100).optional(),
  tokensIn: z.number().int().nonnegative().optional(),
  tokensOut: z.number().int().nonnegative().optional(),
  promptSource: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// POST — création d'un livrable
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const isDemoMode = process.env.DEMO_MODE !== 'false';
  if (isDemoMode) {
    return Response.json(
      {
        error: 'demo_mode',
        message:
          "La sauvegarde de livrables n'est pas disponible en mode démo. Connecte-toi pour archiver tes productions d'agents.",
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

  const rl = rateLimit({
    identifier: `deliverable:create:${user.id}`,
    ...RATE_LIMITS.chat,
  });
  if (!rl.success) {
    return Response.json(
      { error: 'rate_limit_exceeded', resetAt: rl.resetAt },
      { status: 429 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(
      { error: 'invalid_json', message: 'Le body doit être du JSON valide.' },
      { status: 400 }
    );
  }

  const parsed = createBodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'invalid_body',
        message: 'Body invalide.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  if (!isValidAgentId(parsed.data.agentId)) {
    return Response.json(
      { error: 'unknown_agent', message: `Agent "${parsed.data.agentId}" inconnu.` },
      { status: 400 }
    );
  }

  const deliverable = await createDeliverable({
    userId: user.id,
    agentId: parsed.data.agentId as AgentId,
    type: parsed.data.type,
    slug: parsed.data.slug,
    markdownBody: parsed.data.markdownBody,
    campagne: parsed.data.campagne,
    conversationId: parsed.data.conversationId,
    modelUsed: parsed.data.modelUsed,
    tokensIn: parsed.data.tokensIn,
    tokensOut: parsed.data.tokensOut,
    promptSource: parsed.data.promptSource,
  });

  if (!deliverable) {
    return Response.json(
      {
        error: 'create_failed',
        message: 'La sauvegarde a échoué. Réessaie dans un instant.',
      },
      { status: 500 }
    );
  }

  return Response.json(deliverable, { status: 201 });
}

// ---------------------------------------------------------------------------
// GET — liste paginée des livrables de l'utilisateur
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const isDemoMode = process.env.DEMO_MODE !== 'false';
  if (isDemoMode) {
    return Response.json({ deliverables: [], demoMode: true });
  }

  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: 'unauthorized', message: 'Connexion requise.' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const agentIdParam = url.searchParams.get('agentId');
  const statusParam = url.searchParams.get('status');
  const campagneParam = url.searchParams.get('campagne');
  const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '50', 10);
  const offsetParam = Number.parseInt(url.searchParams.get('offset') ?? '0', 10);

  const deliverables = await listDeliverables(user.id, {
    agentId:
      agentIdParam && isValidAgentId(agentIdParam) ? (agentIdParam as AgentId) : undefined,
    status:
      statusParam && (VALID_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as DeliverableStatus)
        : undefined,
    campagne: campagneParam ?? undefined,
    limit: Number.isFinite(limitParam) ? Math.min(limitParam, 200) : 50,
    offset: Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0,
  });

  return Response.json({ deliverables });
}
