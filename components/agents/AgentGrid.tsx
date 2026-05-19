'use client';

/**
 * AgentGrid — grille premium des 11 agents (8 featured + 3 advanced).
 *
 * Design Limova/NAIOM-like :
 *   - Cartes glassmorphism : bg semi-transparent + backdrop-blur
 *   - Bordures fines, ombres douces, accent coloré par agent
 *   - Badge "● En ligne" pulsé vert
 *   - Animations Framer Motion (stagger d'entrée + hover lift)
 *   - 2 sections distinctes : "Équipe principale" (featured) + "Outils spécialisés"
 */

import { motion } from 'framer-motion';
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
  Presentation,
  Scale,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { getAccentStyle } from '@/lib/agents/accent-styles';
import {
  ADVANCED_AGENTS,
  FEATURED_AGENTS,
  type AgentConfig,
} from '@/lib/agents/registry';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Mapping icônes Lucide
// ---------------------------------------------------------------------------

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

const AUDIENCE_LABELS: Record<AgentConfig['audience'][number], string> = {
  conseiller: 'Conseillers',
  manager: 'Managers',
  assistante: 'Assistantes',
};

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export function AgentGrid() {
  return (
    <div className="space-y-14">
      <AgentSection
        title="Équipe principale"
        description="Vos 8 experts du quotidien immobilier — accessibles à tout moment."
        agents={[...FEATURED_AGENTS]}
        baseDelay={0}
      />

      <AgentSection
        title="Outils spécialisés"
        description="Agents pointus pour les analyses approfondies — études de marché, DPE, rédaction d'offres."
        agents={[...ADVANCED_AGENTS]}
        baseDelay={0.3}
        subdued
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section (en-tête + grille)
// ---------------------------------------------------------------------------

interface AgentSectionProps {
  title: string;
  description: string;
  agents: AgentConfig[];
  baseDelay: number;
  subdued?: boolean;
}

function AgentSection({
  title,
  description,
  agents,
  baseDelay,
  subdued,
}: AgentSectionProps) {
  return (
    <section aria-labelledby={`section-${title}`}>
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: baseDelay }}
        className="mb-6"
      >
        <div className="flex items-baseline gap-3">
          <h2
            id={`section-${title}`}
            className={cn(
              'text-base font-semibold tracking-tight',
              subdued
                ? 'text-zinc-500 dark:text-zinc-400'
                : 'text-zinc-900 dark:text-zinc-50'
            )}
          >
            {title}
          </h2>
          <span className="rounded-full border border-zinc-200/60 bg-zinc-50/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-900/60 dark:text-zinc-400">
            {agents.length} agent{agents.length > 1 ? 's' : ''}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </motion.header>

      <div
        className={cn(
          'grid gap-4',
          subdued
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        )}
      >
        {agents.map((agent, idx) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            delay={baseDelay + 0.1 + idx * 0.04}
            subdued={subdued}
          />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Carte d'un agent
// ---------------------------------------------------------------------------

interface AgentCardProps {
  agent: AgentConfig;
  delay: number;
  subdued?: boolean;
}

function AgentCard({ agent, delay, subdued }: AgentCardProps) {
  const Icon = ICON_MAP[agent.icon] ?? Sparkles;
  const accent = getAccentStyle(agent.accent);

  // Split "Sarah — Coordinatrice RDV Vendeur" → ["Sarah", "Coordinatrice RDV Vendeur"]
  const [firstName, ...roleParts] = agent.name.split('—').map((s) => s.trim());
  const role = roleParts.join(' — ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.2, 0.65, 0.3, 0.9] }}
      whileHover={{ y: -3 }}
    >
      <Link
        href={`/agents/${agent.id}`}
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white/60 p-5 shadow-sm backdrop-blur-xl transition-all duration-200',
          'hover:shadow-xl',
          subdued
            ? 'border-zinc-200/60 dark:border-zinc-800/40 dark:bg-zinc-900/40'
            : 'border-zinc-200/80 dark:border-zinc-800/60 dark:bg-zinc-900/60',
          accent.cardHoverBorder,
          accent.cardHoverShadow
        )}
      >
        {/* Gradient subtil en arrière-plan, dévoilé au hover */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100',
            'from-transparent via-transparent to-transparent'
          )}
        />

        {/* Header : icône + badge En ligne */}
        <div className="flex items-start justify-between">
          <div
            aria-hidden
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-200 group-hover:scale-105',
              accent.iconBg,
              accent.iconText,
              accent.iconRing
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>

          <span className="flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/60 px-2 py-0.5 text-[10px] font-medium text-emerald-700 backdrop-blur-md dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            En ligne
          </span>
        </div>

        {/* Identité agent */}
        <div className="mt-4">
          <h3 className="text-base font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
            {firstName}
          </h3>
          {role && (
            <p
              className={cn(
                'mt-0.5 text-xs font-medium',
                accent.badgeText
              )}
            >
              {role}
            </p>
          )}
        </div>

        {/* Tagline */}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {agent.tagline}
        </p>

        {/* Footer : audiences + CTA */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
          {agent.audience.map((aud) => (
            <span
              key={aud}
              className="rounded-full bg-zinc-100/80 px-2 py-0.5 text-[10px] font-medium text-zinc-600 backdrop-blur-md dark:bg-zinc-800/80 dark:text-zinc-300"
            >
              {AUDIENCE_LABELS[aud]}
            </span>
          ))}
          <span
            className={cn(
              'ml-auto inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-all duration-200',
              'group-hover:translate-x-0.5',
              `group-hover:${accent.accentText.split(' ')[0]}`,
              `dark:group-hover:${accent.accentText.split(' ')[1]}`
            )}
          >
            Ouvrir
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
