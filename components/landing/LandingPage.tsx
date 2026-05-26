/**
 * LandingPage — style Linear/Vercel flashy.
 *
 * Server component. Fond zinc-950 avec mesh gradient violet/fuchsia/blue dans
 * le hero, gradient text aurora sur les titres, cards avec halo colore au
 * hover, boutons CTA avec shadow glow lumineuse.
 *
 * Palette signature : violet-500 + fuchsia-500 + pink-500 + cyan-400.
 */

import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { AgentAvatar } from '@/components/agents/AgentAvatar';
import { AGENT_LIST, type AgentConfig } from '@/lib/agents/registry';
import { APP_NAME } from '@/lib/branding';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white antialiased">
      <TopNav />
      <Hero />
      <Stats />
      <AgentsShowcase />
      <HowItWorks />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top navigation
// ---------------------------------------------------------------------------

function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-white">
            {APP_NAME}
          </span>
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-300">
            V2
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
          >
            Connexion
          </Link>
          <Link
            href="/signup"
            className="group relative inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] hover:-translate-y-px"
          >
            Creer un compte
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero — avec mesh gradient + aurora text
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Mesh gradient en background — orbes flous colores */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.25),transparent_60%)] blur-3xl" />
        <div className="absolute -top-20 left-1/4 h-[400px] w-[600px] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.18),transparent_60%)] blur-3xl" />
        <div className="absolute top-40 right-1/4 h-[500px] w-[700px] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.15),transparent_60%)] blur-3xl" />
        {/* Grain subtile */}
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-fuchsia-300" aria-hidden />
            Plateforme multi-agents IA · Nouveaute V2
          </span>

          <h1 className="mt-8 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block text-white">L'IA specialisee</span>
            <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              pour l'immobilier.
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-zinc-300 sm:text-xl">
            11 agents conçus pour les conseillers, managers et assistantes
            immobiliers. Prospection, juridique, marketing, comptes-rendus,
            analyse de marche : gagnez du temps sans sacrifier la qualite.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 px-7 py-3.5 text-base font-semibold text-white shadow-[0_0_40px_rgba(168,85,247,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_50px_rgba(217,70,239,0.6)]"
            >
              <span>Creer mon compte</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-base font-semibold text-zinc-100 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10"
            >
              Se connecter
            </Link>
          </div>

          <p className="mt-8 text-xs text-zinc-500">
            Aucune carte bancaire requise · Compte cree en 30 secondes
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Stats — chiffres avec gradient text
// ---------------------------------------------------------------------------

function Stats() {
  return (
    <section className="relative border-y border-white/5 bg-zinc-950/50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/5 sm:grid-cols-4">
        <StatItem value="11" label="agents specialises" gradient="from-violet-400 to-fuchsia-400" />
        <StatItem value="3" label="profils metier" gradient="from-fuchsia-400 to-pink-400" />
        <StatItem value="5" label="categories" gradient="from-pink-400 to-orange-400" />
        <StatItem value="< 5 s" label="premiere reponse" gradient="from-cyan-400 to-blue-400" />
      </div>
    </section>
  );
}

function StatItem({
  value,
  label,
  gradient,
}: {
  value: string;
  label: string;
  gradient: string;
}) {
  return (
    <div className="px-6 py-10 text-center">
      <p
        className={cn(
          'bg-gradient-to-r bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl',
          gradient
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Showcase agents — cards glow au hover
// ---------------------------------------------------------------------------

function AgentsShowcase() {
  return (
    <section className="relative py-24 lg:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-0 top-1/3 h-[300px] w-[500px] bg-[radial-gradient(circle_at_left,rgba(168,85,247,0.1),transparent_70%)] blur-3xl" />
        <div className="absolute right-0 bottom-1/3 h-[300px] w-[500px] bg-[radial-gradient(circle_at_right,rgba(34,211,238,0.08),transparent_70%)] blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-fuchsia-400">
            L'equipe
          </p>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-white">11 agents pour</span>{' '}
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              11 missions.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400">
            Chaque agent est specialise pour un cas d'usage precis. Vous gardez
            le controle, l'IA fait le travail repetitif.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AGENT_LIST.map((agent) => (
            <AgentTeaser key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentTeaser({ agent }: { agent: AgentConfig }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-white/[0.07]">
      {/* Halo colore qui apparait au hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-violet-500/0 via-fuchsia-500/0 to-pink-500/0 opacity-0 blur-xl transition-opacity duration-500 group-hover:from-violet-500/30 group-hover:via-fuchsia-500/20 group-hover:to-pink-500/30 group-hover:opacity-100"
      />

      <div className="flex items-start gap-4">
        <AgentAvatar agentId={agent.id} size="md" status={null} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight text-white">
            {agent.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-400">
            {agent.tagline}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// How it works — steps avec gradient number
// ---------------------------------------------------------------------------

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Choisis ton agent',
      description:
        "Selectionne l'agent adapte a ton besoin, ou laisse Charly l'orchestratrice le faire pour toi en decrivant simplement ta demande.",
      gradient: 'from-violet-400 to-fuchsia-400',
    },
    {
      n: '02',
      title: 'Decris ton besoin',
      description:
        "Tape ton message ou pars d'un template de demarrage rapide. L'agent te pose les bonnes questions pour obtenir un resultat sur mesure.",
      gradient: 'from-fuchsia-400 to-pink-400',
    },
    {
      n: '03',
      title: 'Recupere ton livrable',
      description:
        "Mail, courrier, post reseaux sociaux, tableau, argumentaire… Copie, telecharge ou regenere. Tes conversations restent accessibles a tout moment.",
      gradient: 'from-cyan-400 to-blue-400',
    },
  ];

  return (
    <section className="relative border-y border-white/5 bg-zinc-950/60 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
            Demarrage simple
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Comment ça marche.
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.n}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl transition-all hover:border-white/20"
            >
              <p
                className={cn(
                  'bg-gradient-to-r bg-clip-text font-mono text-5xl font-bold text-transparent',
                  step.gradient
                )}
              >
                {step.n}
              </p>
              <h3 className="mt-5 text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA final — mega mesh gradient
// ---------------------------------------------------------------------------

function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[1100px] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(168,85,247,0.2),rgba(217,70,239,0.18),rgba(236,72,153,0.2),rgba(34,211,238,0.15),rgba(168,85,247,0.2))] blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-6 text-center lg:px-10">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          <span className="text-white">Pret a gagner</span>{' '}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            du temps ?
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
          Compte cree en 30 secondes. Aucune carte bancaire. Acces immediat aux
          11 agents.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 px-8 py-4 text-base font-semibold text-white shadow-[0_0_50px_rgba(168,85,247,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(217,70,239,0.7)]"
          >
            Creer mon compte
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-zinc-950 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-zinc-500 lg:flex-row lg:px-10">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">{APP_NAME}</span>
          <span>·</span>
          <span>propulse par Start Academy</span>
        </div>
        <div className="flex items-center gap-6">
          <span>© {new Date().getFullYear()} — Tous droits reserves</span>
        </div>
      </div>
    </footer>
  );
}
