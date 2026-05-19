/**
 * Page d'accueil du dashboard agents (`/agents`).
 *
 * Affiche un hero + la grille des 12 agents groupés par catégorie métier.
 * Server component — aucune logique côté client à ce niveau.
 *
 * À venir (TODO) :
 * - zone "démarrer une conversation libre" (input + bouton) qui appellera
 *   l'orchestrateur LLM pour router automatiquement vers le bon agent.
 */

import { AgentGrid } from '@/components/agents/AgentGrid';
import { AgentRouterInput } from '@/components/agents/AgentRouterInput';
import { APP_NAME } from '@/lib/branding';

export default function AgentsHomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10 lg:py-14">
      {/* Hero */}
      <header className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
          Plateforme multi-agents
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Bienvenue sur {APP_NAME}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          Décris ton besoin dans la barre ci-dessous — l'orchestrateur choisira
          le bon agent — ou sélectionne directement un agent dans la liste.
        </p>
      </header>

      {/* Routeur LLM : champ de saisie libre qui détermine automatiquement l'agent */}
      <section aria-label="Recherche automatique d'agent" className="mb-12">
        <AgentRouterInput />
      </section>

      {/* Sélection manuelle : grille d'agents groupés par catégorie */}
      <AgentGrid />

      {/* Footer informatif */}
      <footer className="mt-16 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        12 agents disponibles · propulsés par Claude Sonnet 4.6, Haiku 4.5 et Mistral Large via OpenRouter
      </footer>
    </div>
  );
}
