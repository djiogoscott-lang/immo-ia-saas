import 'server-only';

/**
 * Rate limiter in-memory en sliding window simple.
 *
 * Suffisant pour : single-instance Node (dev, Vercel hobby preview, self-hosted).
 *
 * NE marche PAS pour : serverless multi-instance (chaque instance a son propre
 * Map, donc un user peut tripler son quota en frappant différentes lambdas).
 * Pour la prod scalable → migrer vers Upstash Redis (drop-in replacement,
 * même signature `rateLimit({ identifier, limit, windowMs })`).
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export interface RateLimitConfig {
  /** Identifiant unique : userId, IP, ou combinaison (`${userId}:chat`). */
  identifier: string;
  /** Nombre maximum de requêtes autorisées dans la fenêtre. */
  limit: number;
  /** Durée de la fenêtre en millisecondes. */
  windowMs: number;
}

export interface RateLimitResult {
  /** true si la requête est autorisée, false si dépassement. */
  success: boolean;
  /** Nombre de requêtes restantes dans la fenêtre actuelle. */
  remaining: number;
  /** Timestamp (ms epoch) auquel la fenêtre se réinitialise. */
  resetAt: number;
}

export function rateLimit({
  identifier,
  limit,
  windowMs,
}: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  // Nouvelle fenêtre ou fenêtre expirée
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(identifier, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

// ---------------------------------------------------------------------------
// Profils de rate limit prédéfinis (à étendre selon les besoins)
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  /** Chat : 30 messages par minute par user. Confortable mais bloque le spam. */
  chat: { limit: 30, windowMs: 60_000 },
  /** Router : 20 classifications par minute par user (coût modéré). */
  router: { limit: 20, windowMs: 60_000 },
  /** Auth : 5 tentatives de login par 15 min par IP (brute-force protection). */
  auth: { limit: 5, windowMs: 15 * 60_000 },
} as const;

// ---------------------------------------------------------------------------
// Cleanup périodique des entries expirées (évite la fuite mémoire)
// ---------------------------------------------------------------------------

const GLOBAL_KEY = '__nestennRateLimitCleanup' as const;
type GlobalWithCleanup = typeof globalThis & {
  [GLOBAL_KEY]?: ReturnType<typeof setInterval>;
};
const g = globalThis as GlobalWithCleanup;

if (!g[GLOBAL_KEY]) {
  g[GLOBAL_KEY] = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60_000);
}
