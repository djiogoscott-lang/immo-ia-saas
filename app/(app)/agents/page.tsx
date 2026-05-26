/**
 * Page d'accueil du dashboard agents (`/agents`) — style Linear/Vercel flashy.
 *
 * Server component. Hero avec mesh gradient violet/fuchsia/cyan, eyebrow neon,
 * gradient text aurora sur le titre, raccourci CTA vers Charly (orchestratrice
 * conversationnelle), puis grille des 11 agents.
 *
 * Note (Lot 3) : l'ancien AgentRouterInput (router LLM separe avec auto-redirect)
 * a ete supprime — Charly fait deja le routing en mode conversationnel via son
 * system prompt, evitant la duplication de logique.
 */

import { MessageCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { AgentGrid } from '@/components/agents/AgentGrid';
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
            Choisis un agent dans la liste, ou demande directement a Charly
            l'orchestratrice de te guider vers le bon expert.
          </p>
        </header>

        {/* Raccourci CTA vers Charly */}
        <section aria-label="Parler a l'orchestratrice" className="mb-14">
          <Link
            href="/agents/charly"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-violet-500/40 hover:bg-white/[0.06] hover:shadow-[0_0_40px_rgba(168,85,247,0.25)]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-violet-500/0 via-fuchsia-500/0 to-pink-500/0 opacity-0 blur-xl transition-opacity duration-500 group-hover:from-violet-500/30 group-hover:via-fuchsia-500/20 group-hover:to-pink-500/30 group-hover:opacity-100"
            />
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 ring-1 ring-violet-500/30">
              <Sparkles className="h-5 w-5 text-fuchsia-300" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold text-white">
                Pas sur de l'agent a choisir ?
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Decris ton besoin a Charly l'orchestratrice — elle te route vers
                le bon expert.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-300 transition-transform group-hover:translate-x-0.5">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Parler a Charly</span>
            </span>
          </Link>
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
