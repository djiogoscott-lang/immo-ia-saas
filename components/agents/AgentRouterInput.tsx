'use client';

/**
 * AgentRouterInput — barre de saisie en langage naturel placée en haut de la
 * page d'accueil `/agents`. Permet à l'utilisateur de décrire son besoin sans
 * choisir manuellement un agent.
 *
 * Flow :
 *   1. user tape sa demande et soumet
 *   2. POST /api/route-agent { query }
 *   3. réponse { agentId, confidence, reasoning }
 *   4. redirection vers /agents/[agentId]?prefill=<query>
 *   5. AgentChat lit `prefill` via useSearchParams et l'envoie comme 1er message
 *
 * Si la confiance est faible (< 0.5), on affiche un avertissement avant de
 * laisser l'utilisateur confirmer (ou choisir manuellement).
 */

import { ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface RoutingResult {
  agentId: string;
  confidence: number;
  reasoning: string;
}

const LOW_CONFIDENCE_THRESHOLD = 0.5;

export function AgentRouterInput() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<RoutingResult | null>(null);

  const reset = () => {
    setPending(null);
  };

  const goToAgent = (agentId: string, prefill: string) => {
    const params = new URLSearchParams({ prefill });
    router.push(`/agents/${agentId}?${params.toString()}`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    reset();
    setLoading(true);
    try {
      const response = await fetch('/api/route-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(data.message ?? `Erreur ${response.status}`);
      }

      const result = (await response.json()) as RoutingResult;

      if (result.confidence < LOW_CONFIDENCE_THRESHOLD) {
        // On bloque la redirection pour laisser l'utilisateur confirmer
        setPending(result);
      } else {
        goToAgent(result.agentId, trimmed);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error("Impossible de router la requête", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-cyan-50/50 to-white p-1 shadow-sm dark:border-zinc-800 dark:from-cyan-950/20 dark:to-zinc-900">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2">
        <Sparkles
          className="ml-2 h-5 w-5 shrink-0 text-cyan-600 dark:text-cyan-400"
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Décris ton besoin, je trouve l'agent (ex : « j'ai un RDV vendeur à synthétiser »)"
          disabled={loading}
          aria-label="Décris ton besoin pour qu'un agent soit choisi automatiquement"
          className="flex-1 bg-transparent px-2 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:opacity-60 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-700"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span>Analyse…</span>
            </>
          ) : (
            <>
              <span>Trouver l'agent</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </form>

      {/* Confiance faible : on demande confirmation */}
      {pending && (
        <div className="mt-2 rounded-lg bg-amber-50 p-4 text-sm dark:bg-amber-950/40">
          <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="flex-1">
              <p>
                <strong>Confiance faible</strong> ({Math.round(pending.confidence * 100)} %).
                Je propose l'agent <code className="font-mono">{pending.agentId}</code> :
                {' '}
                <em>{pending.reasoning}</em>
              </p>
              <p className="mt-1 text-xs opacity-80">
                Tu peux confirmer ce choix ou sélectionner manuellement un agent dans la liste ci-dessous.
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => goToAgent(pending.agentId, query.trim())}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
            >
              Continuer avec {pending.agentId}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
            >
              Choisir manuellement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
