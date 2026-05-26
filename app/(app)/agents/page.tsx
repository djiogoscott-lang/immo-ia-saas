/**
 * Page d'accueil du dashboard agents (`/agents`) — style Linear/Vercel flashy.
 *
 * Server component. Hero avec mesh gradient violet/fuchsia/cyan, eyebrow neon,
 * gradient text aurora sur le titre, puis AgentRouterInput + AgentGrid.
 */

import { AgentGrid } from '@/components/agents/AgentGrid';
import { AgentRouterInput } from '@/components/agents/AgentRouterInput';
import { APP_NAME } from '@/lib/branding';

export default function AgentsHomePage() {
  return (
    <div className="relative min-h-full bg-zinc-950 text-white">
      {/* Mesh gradient en background du hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] overflow-hidden"
      >
        <div className="absolute left-1/2 top-0 h-[500px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.18),transparent_60%)] blur-3xl" />
        <div className="absolute left-1/4 top-20 h-[400px] w-[600px] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.12),transparent_60%)] blur-3xl" />
        <div className="absolute right-1/4 top-40 h-[400px] w-[600px] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.10),transparent_60%)] blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-16">
        {/* Hero */}
        <header className="mb-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-fuchsia-400">
            Plateforme multi-agents
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-white">Bienvenue sur</span>{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              {APP_NAME}
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
            Decris ton besoin dans la barre ci-dessous — l'orchestratrice
            Charly choisira le bon agent — ou selectionne directement un agent
            dans la liste.
          </p>
        </header>

        {/* Routeur LLM */}
        <section aria-label="Recherche automatique d'agent" className="mb-14">
          <AgentRouterInput />
        </section>

        {/* Grille agents */}
        <AgentGrid />

        {/* Footer info */}
        <footer className="mt-20 border-t border-white/10 pt-6 text-xs text-zinc-500">
          11 agents disponibles · propulses par Mistral Large 2411 et Pixtral
          (OCR) via OpenRouter
        </footer>
      </div>
    </div>
  );
}
