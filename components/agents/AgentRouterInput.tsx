'use client';

/**
 * AgentRouterInput — barre de saisie en langage naturel placée en haut de la
 * page d'accueil `/agents`. Permet à l'utilisateur de décrire son besoin sans
 * choisir manuellement un agent.
 *
 * Flow (NAIOM-inspired, orchestrateur visible) :
 *   1. user tape sa demande et soumet
 *   2. POST /api/route-agent → stream SSE de 3 phases
 *   3. <OrchestratorBubble> affiche progressivement Charly qui qualifie + handoff
 *   4. Auto-redirect vers /agents/[agentId]?prefill=<query> après ~2s
 *      (sauf si confiance < 0.5 → confirmation manuelle)
 */

import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  OrchestratorBubble,
  type OrchestratorEvent,
} from '@/components/agents/OrchestratorBubble';

export function AgentRouterInput() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<OrchestratorEvent[]>([]);

  const reset = () => {
    setEvents([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setEvents([]);
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

      if (!response.body) {
        throw new Error('Réponse sans flux de streaming.');
      }

      // Lecture du stream SSE événement par événement.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Format SSE : "data: ${json}\n\n" → on découpe sur \n\n
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const ev = JSON.parse(payload) as OrchestratorEvent;
            setEvents((prev) => [...prev, ev]);
          } catch {
            // Chunk JSON mal formé : on ignore silencieusement.
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error('Charly est indisponible', {
        description: message,
      });
      setEvents([{ phase: 'error', message }]);
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
          placeholder="Décris ton besoin, Charly te connecte au bon expert (ex : « j'ai un RDV vendeur à synthétiser »)"
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
              <span>Demander à Charly</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </form>

      {/* Bulle Charly — affichée pendant le streaming et après le handoff. */}
      {events.length > 0 && (
        <div className="px-2 pb-2">
          <OrchestratorBubble
            events={events}
            query={query.trim()}
            onReset={reset}
          />
        </div>
      )}
    </div>
  );
}
