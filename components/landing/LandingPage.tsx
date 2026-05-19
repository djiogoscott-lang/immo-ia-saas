/**
 * LandingPage — page d'accueil publique pour les visiteurs non authentifiés.
 *
 * Server component. Présente le produit, les 12 agents et invite à créer un
 * compte. Reprend la palette de couleurs des catégories (Production indigo,
 * Communication sky, Analyse emerald, Pilotage violet, Formation amber) pour
 * la cohérence visuelle avec l'app authentifiée.
 */

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Calculator,
  ClipboardCheck,
  DoorOpen,
  FileSignature,
  FileText,
  Mailbox,
  Megaphone,
  PenSquare,
  Phone,
  Users,
  Presentation,
  Scale,
  Sparkles,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import {
  AGENT_LIST,
  type AgentCategory,
  type AgentConfig,
} from '@/lib/agents/registry';
import { APP_NAME } from '@/lib/branding';

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Phone,
  Megaphone,
  PenSquare,
  DoorOpen,
  Calculator,
  Scale,
  Users,
  Zap,
  TrendingUp,
  FileSignature,
  FileText,
  Mailbox,
  Presentation,
  BarChart3,
  ClipboardCheck,
};

const CATEGORY_GRADIENTS: Record<AgentCategory, string> = {
  orchestrateur: 'from-indigo-500 to-indigo-600',
  production: 'from-emerald-500 to-emerald-600',
  communication: 'from-sky-500 to-sky-600',
  analyse: 'from-rose-500 to-rose-600',
  pilotage: 'from-violet-500 to-violet-600',
};

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
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
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="text-xl">🏠</span>
          <span className="text-base font-semibold">{APP_NAME}</span>
          <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300">
            V2
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Connexion
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cyan-700"
          >
            Créer un compte
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Gradient de fond subtil */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-cyan-50/60 via-white to-indigo-50/30 dark:from-cyan-950/20 dark:via-zinc-950 dark:to-indigo-950/20"
      />

      <div className="mx-auto max-w-6xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300">
            <Sparkles className="h-3 w-3" aria-hidden />
            Plateforme multi-agents · Nouveauté V2
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-zinc-50">
            L'IA spécialisée pour les{' '}
            <span className="bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">
              agences immobilières
            </span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
            12 agents conçus pour les conseillers, managers et assistants immobiliers.
            De la prospection terrain aux questions juridiques, de l'analyse de
            marché aux comptes-rendus de RDV : gagnez du temps sans sacrifier la
            qualité.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-base font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-cyan-700 hover:shadow-md"
            >
              Créer mon compte
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-medium text-zinc-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Se connecter
            </Link>
          </div>

          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
            Aucune carte bancaire requise · Compte créé en 30 secondes
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function Stats() {
  return (
    <section className="border-y border-slate-100 bg-slate-50/40 dark:border-zinc-800 dark:bg-zinc-900/30">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-slate-100 px-0 dark:bg-zinc-800 sm:grid-cols-4">
        <StatItem value="12" label="agents spécialisés" />
        <StatItem value="3" label="profils métier" />
        <StatItem value="5" label="catégories d'usage" />
        <StatItem value="< 5 s" label="première réponse" />
      </div>
    </section>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white px-6 py-8 text-center dark:bg-zinc-950">
      <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
        {value}
      </p>
      <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Showcase des 12 agents
// ---------------------------------------------------------------------------

function AgentsShowcase() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
            Nos agents
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            12 agents pour 12 missions immobilières
          </h2>
          <p className="mt-4 text-base text-zinc-600 dark:text-zinc-300">
            Chaque agent est spécialisé pour un cas d'usage précis. Vous gardez
            le contrôle, l'IA fait le travail répétitif.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENT_LIST.map((agent) => (
            <AgentTeaser key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentTeaser({ agent }: { agent: AgentConfig }) {
  const Icon = ICON_MAP[agent.icon];
  const gradient = CATEGORY_GRADIENTS[agent.category];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition-transform group-hover:scale-105 ${gradient}`}
        >
          {Icon ? <Icon className="h-5 w-5" strokeWidth={2.2} /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
            {agent.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {agent.tagline}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// How it works
// ---------------------------------------------------------------------------

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Choisis ton agent',
      description:
        "Sélectionne l'agent adapté à ton besoin du moment, ou laisse l'orchestrateur IA le faire pour toi en décrivant simplement ta demande.",
    },
    {
      n: '02',
      title: 'Décris ton besoin',
      description:
        "Tape ton message ou pars d'un template de démarrage rapide. L'agent te pose les bonnes questions pour obtenir un résultat sur mesure.",
    },
    {
      n: '03',
      title: 'Récupère ton livrable',
      description:
        "Mail, courrier, post réseaux sociaux, tableau, argumentaire… Copie, télécharge ou régénère. Tes conversations restent accessibles à tout moment.",
    },
  ];

  return (
    <section className="border-y border-slate-100 bg-slate-50/40 py-20 dark:border-zinc-800 dark:bg-zinc-900/30 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
            Démarrage simple
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Comment ça marche
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.n}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <span className="inline-block rounded-lg bg-cyan-50 px-2.5 py-1 font-mono text-xs font-semibold text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                {step.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
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
// CTA final
// ---------------------------------------------------------------------------

function FinalCTA() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-10">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Prêt à gagner du temps sur tes tâches répétitives ?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-300">
          Crée ton compte en 30 secondes, choisis ton rôle, et commence à
          utiliser les 12 agents dès maintenant.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-base font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-cyan-700 hover:shadow-md"
          >
            Créer mon compte
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
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
    <footer className="border-t border-slate-100 bg-white py-10 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-zinc-500 lg:flex-row lg:px-10 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span aria-hidden>🏠</span>
          <span>
            <strong className="font-semibold text-zinc-700 dark:text-zinc-300">
              {APP_NAME}
            </strong>{' '}
            · propulsé par Start Academy
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span>© {new Date().getFullYear()} — Tous droits réservés</span>
        </div>
      </div>
    </footer>
  );
}
