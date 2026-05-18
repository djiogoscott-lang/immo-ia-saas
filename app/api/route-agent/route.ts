/**
 * POST /api/route-agent — classifie une requête en langage naturel
 * et renvoie l'agent le plus adapté.
 *
 * Body : { query: string }
 * Réponse 200 : { agentId, confidence, reasoning }
 *
 * Utilisé par <AgentRouterInput> sur la page d'accueil `/agents` :
 * l'utilisateur tape sa demande, on l'envoie ici, on récupère l'agentId,
 * on redirige vers /agents/[agentId]?prefill=... pour démarrer la conversation.
 */

import { z } from 'zod';

import { routeQuery } from '@/lib/agents/router';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const bodySchema = z.object({
  query: z.string().min(2).max(2000),
});

export async function POST(request: Request) {
  // 1. Auth : seuls les utilisateurs connectés peuvent utiliser le router
  //    (sinon n'importe qui peut cramer notre crédit Haiku).
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: 'unauthorized', message: 'Connexion requise.' },
      { status: 401 }
    );
  }

  // 2. Rate limit par user (in-memory MVP).
  const rl = rateLimit({
    identifier: `router:${user.id}`,
    ...RATE_LIMITS.router,
  });
  if (!rl.success) {
    return Response.json(
      {
        error: 'rate_limit_exceeded',
        message: 'Limite de routage atteinte. Réessaie dans une minute.',
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

  // 3. Validation du body
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(
      { error: 'invalid_json', message: 'Le body doit être du JSON valide.' },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'invalid_body',
        message: 'Body invalide : "query" doit être une chaîne de 2 à 2000 caractères.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // 4. Classification LLM
  try {
    const result = await routeQuery(parsed.data.query);
    return Response.json(result, {
      headers: {
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Reset': String(rl.resetAt),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur de routage';
    return Response.json(
      { error: 'routing_error', message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json(
    { error: 'method_not_allowed', message: 'Utilisez POST /api/route-agent.' },
    { status: 405 }
  );
}
