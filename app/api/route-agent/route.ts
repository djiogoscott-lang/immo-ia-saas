/**
 * POST /api/route-agent — orchestrateur visible (Charly) en streaming SSE.
 *
 * Reçoit { query: string } et streame 3-4 événements JSON :
 *
 *   1. { phase: "analyzing" }
 *        → la UI affiche "Charly analyse votre demande..." (pulse).
 *   2. { phase: "classified", agentId, confidence, reasoning }
 *        → résultat de la classification LLM (Mistral Large via routeQuery).
 *   3. { phase: "handoff", agentName, openingMessage }
 *        → message de relais ("Je passe la main à Tom...").
 *   4. { phase: "done" }
 *        → fin du stream.
 *
 * En cas d'erreur (rate limit, LLM down, etc.) : { phase: "error", message }.
 *
 * Format wire : SSE (Server-Sent Events) — chaque événement est encodé en
 * `data: ${JSON.stringify(event)}\n\n`. Compatible fetch + ReadableStream
 * côté client (pas besoin d'EventSource, qui ne supporte pas le POST).
 */

import { z } from 'zod';

import { getAgent } from '@/lib/agents/registry';
import { routeQuery, type RoutingResult } from '@/lib/agents/router';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const bodySchema = z.object({
  query: z.string().min(2).max(2000),
});

// ---------------------------------------------------------------------------
// Helpers de streaming SSE
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

function sseEvent(payload: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function jsonError(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // Mode démo activé par défaut — désactiver via DEMO_MODE=false en prod.
  const isDemoMode = process.env.DEMO_MODE !== 'false';

  // 1. Auth : skip en mode démo. Sinon : user connecté obligatoire.
  let identifier: string;
  if (isDemoMode) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    identifier = `router:ip:${ip}`;
  } else {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError(401, 'unauthorized', 'Connexion requise.');
    }
    identifier = `router:${user.id}`;
  }

  // 2. Rate limit (in-memory MVP).
  const rl = rateLimit({
    identifier,
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
    return jsonError(400, 'invalid_json', 'Le body doit être du JSON valide.');
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(
      400,
      'invalid_body',
      'Body invalide : "query" doit être une chaîne de 2 à 2000 caractères.'
    );
  }

  // 4. Stream SSE
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // ÉVÉNEMENT 1 — phase "analyzing" : envoyé immédiatement pour que
        // l'UI affiche "Charly analyse..." pendant que le LLM tourne.
        controller.enqueue(sseEvent({ phase: 'analyzing' }));

        // ÉVÉNEMENT 2 — phase "classified" : appel LLM (Mistral Large via
        // generateObject avec schéma Zod). 0.5-2s de latence typique.
        const result: RoutingResult = await routeQuery(parsed.data.query);
        controller.enqueue(
          sseEvent({
            phase: 'classified',
            agentId: result.agentId,
            confidence: result.confidence,
            reasoning: result.reasoning,
          })
        );

        // ÉVÉNEMENT 3 — phase "handoff" : message de relais avec persona
        // (template déterministe, pas de 2e appel LLM pour rester rapide).
        const agent = getAgent(result.agentId);
        const personaFirstName = agent.name.split('—')[0]?.trim() ?? agent.name;
        const openingMessage =
          result.confidence >= 0.5
            ? `Je passe la main à **${personaFirstName}** — ${agent.tagline}.`
            : `Je propose **${personaFirstName}** (${Math.round(
                result.confidence * 100
              )} % de confiance). Confirme ou choisis un autre agent.`;

        controller.enqueue(
          sseEvent({
            phase: 'handoff',
            agentName: agent.name,
            openingMessage,
          })
        );

        // ÉVÉNEMENT 4 — fin du stream.
        controller.enqueue(sseEvent({ phase: 'done' }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur de routage';
        controller.enqueue(sseEvent({ phase: 'error', message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      // Désactive le buffering côté reverse proxy (Vercel + Nginx).
      'X-Accel-Buffering': 'no',
      'X-RateLimit-Remaining': String(rl.remaining),
      'X-RateLimit-Reset': String(rl.resetAt),
    },
  });
}

export async function GET() {
  return jsonError(405, 'method_not_allowed', 'Utilisez POST /api/route-agent.');
}
