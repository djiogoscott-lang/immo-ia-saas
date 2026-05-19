'use client';

/**
 * OrchestratorBubble — bulle Charly affichée pendant le routage.
 *
 * Reçoit le flux d'événements SSE produit par /api/route-agent et affiche
 * progressivement les 3 phases :
 *
 *   1. "Charly analyse votre demande..." (icône Sparkles pulsée)
 *   2. Le reasoning de la classification
 *   3. Le handoff ("Je passe la main à Tom — ...") + bouton "Continuer →"
 *
 * Auto-redirect 2s après le handoff si confidence >= 0.5. En dessous,
 * affiche un avertissement et laisse l'utilisateur choisir.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types des événements SSE (en miroir de /api/route-agent)
// ---------------------------------------------------------------------------

export type OrchestratorEvent =
  | { phase: 'analyzing' }
  | { phase: 'classified'; agentId: string; confidence: number; reasoning: string }
  | { phase: 'handoff'; agentName: string; openingMessage: string }
  | { phase: 'done' }
  | { phase: 'error'; message: string };

interface OrchestratorBubbleProps {
  events: OrchestratorEvent[];
  /** Requête originale (réinjectée comme prefill côté agent cible). */
  query: string;
  /** Délai avant auto-redirect après handoff (en ms). 0 désactive. */
  autoRedirectMs?: number;
  /** Appelé quand l'utilisateur clique "Choisir manuellement". */
  onReset: () => void;
}

const LOW_CONFIDENCE_THRESHOLD = 0.5;

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export function OrchestratorBubble({
  events,
  query,
  autoRedirectMs = 2000,
  onReset,
}: OrchestratorBubbleProps) {
  const router = useRouter();

  const classified = events.find(
    (e): e is Extract<OrchestratorEvent, { phase: 'classified' }> => e.phase === 'classified'
  );
  const handoff = events.find(
    (e): e is Extract<OrchestratorEvent, { phase: 'handoff' }> => e.phase === 'handoff'
  );
  const error = events.find(
    (e): e is Extract<OrchestratorEvent, { phase: 'error' }> => e.phase === 'error'
  );
  const isHighConfidence =
    !!classified && classified.confidence >= LOW_CONFIDENCE_THRESHOLD;
  const isAnalyzing = !classified && !error;

  // Auto-redirect après handoff si confiance suffisante.
  useEffect(() => {
    if (!handoff || !classified || !isHighConfidence || autoRedirectMs <= 0) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ prefill: query });
      router.push(`/agents/${classified.agentId}?${params.toString()}`);
    }, autoRedirectMs);
    return () => clearTimeout(timer);
  }, [handoff, classified, isHighConfidence, autoRedirectMs, query, router]);

  // ---- Cas erreur ----
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm dark:border-red-900 dark:bg-red-950/40"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div className="flex-1 text-red-800 dark:text-red-200">
          <p className="font-medium">Charly n'a pas pu router votre demande</p>
          <p className="mt-1 text-xs opacity-80">{error.message}</p>
        </div>
      </motion.div>
    );
  }

  // ---- Cas normal ----
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-3 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white p-5 shadow-sm dark:border-indigo-900/60 dark:from-indigo-950/40 dark:to-zinc-900"
    >
      <div className="flex items-start gap-3">
        {/* Avatar Charly */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200/60 dark:bg-indigo-900/40 dark:ring-indigo-800/60">
          <motion.div
            animate={isAnalyzing ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ repeat: isAnalyzing ? Infinity : 0, duration: 1.2 }}
          >
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-300" aria-hidden />
          </motion.div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Charly · Orchestratrice
            </span>
            {classified && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                title={`Confiance : ${Math.round(classified.confidence * 100)} %`}
              >
                {Math.round(classified.confidence * 100)} %
              </motion.span>
            )}
          </div>

          <div className="mt-2 space-y-2 text-sm">
            <AnimatePresence mode="popLayout" initial={false}>
              {/* Phase 1 : analyzing */}
              {isAnalyzing && (
                <motion.p
                  key="analyzing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-zinc-500 dark:text-zinc-400"
                >
                  J'analyse votre demande…
                </motion.p>
              )}

              {/* Phase 2 : reasoning */}
              {classified && (
                <motion.p
                  key="reasoning"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="italic text-zinc-600 dark:text-zinc-300"
                >
                  {classified.reasoning}
                </motion.p>
              )}

              {/* Phase 3 : handoff */}
              {handoff && (
                <motion.p
                  key="handoff"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-zinc-800 dark:text-zinc-100"
                  dangerouslySetInnerHTML={{
                    __html: renderInlineBold(escapeHtml(handoff.openingMessage)),
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          {handoff && classified && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {isHighConfidence ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams({ prefill: query });
                      router.push(`/agents/${classified.agentId}?${params.toString()}`);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    Continuer maintenant
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Redirection auto dans {Math.round(autoRedirectMs / 1000)} s…
                  </span>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams({ prefill: query });
                      router.push(`/agents/${classified.agentId}?${params.toString()}`);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-amber-700"
                  >
                    Confirmer {classified.agentId}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={onReset}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Choisir manuellement
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Helpers : rendu inline minimal (gras Markdown -> <strong>)
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
