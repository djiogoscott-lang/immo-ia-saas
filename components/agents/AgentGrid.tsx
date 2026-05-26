'use client';

/**
 * AgentGrid — grille premium des 11 agents (style Linear/Vercel flashy).
 *
 * Cards glassmorphism sombre + halo gradient violet/fuchsia au hover + animations
 * Framer Motion stagger. Deux sections : "Equipe principale" (FEATURED, 8 agents)
 * + "Outils specialises" (ADVANCED, 3 agents).
 */

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { AgentAvatar } from '@/components/agents/AgentAvatar';
import {
  ADVANCED_AGENTS,
  FEATURED_AGENTS,
  type AgentAccent,
  type AgentConfig,
} from '@/lib/agents/registry';
import { cn } from '@/lib/utils';

const AUDIENCE_LABELS: Record<AgentConfig['audience'][number], string> = {
  conseiller: 'Conseillers',
  manager: 'Managers',
  assistante: 'Assistantes',
};

// Gradient halo par accent agent (utilise au hover des cards)
const ACCENT_HALO: Record<AgentAccent, string> = {
  indigo: 'group-hover:from-indigo-500/30 group-hover:via-indigo-500/15 group-hover:to-blue-500/25',
  sky: 'group-hover:from-sky-500/30 group-hover:via-sky-500/15 group-hover:to-cyan-500/25',
  pink: 'group-hover:from-pink-500/30 group-hover:via-fuchsia-500/15 group-hover:to-rose-500/25',
  amber: 'group-hover:from-amber-500/30 group-hover:via-orange-500/15 group-hover:to-yellow-500/25',
  emerald: 'group-hover:from-emerald-500/30 group-hover:via-emerald-500/15 group-hover:to-teal-500/25',
  violet: 'group-hover:from-violet-500/30 group-hover:via-violet-500/15 group-hover:to-purple-500/25',
  rose: 'group-hover:from-rose-500/30 group-hover:via-rose-500/15 group-hover:to-pink-500/25',
  orange: 'group-hover:from-orange-500/30 group-hover:via-orange-500/15 group-hover:to-red-500/25',
  cyan: 'group-hover:from-cyan-500/30 group-hover:via-cyan-500/15 group-hover:to-sky-500/25',
  fuchsia: 'group-hover:from-fuchsia-500/30 group-hover:via-fuchsia-500/15 group-hover:to-pink-500/25',
  lime: 'group-hover:from-lime-500/30 group-hover:via-lime-500/15 group-hover:to-green-500/25',
};

const ACCENT_BORDER: Record<AgentAccent, string> = {
  indigo: 'group-hover:border-indigo-500/40',
  sky: 'group-hover:border-sky-500/40',
  pink: 'group-hover:border-pink-500/40',
  amber: 'group-hover:border-amber-500/40',
  emerald: 'group-hover:border-emerald-500/40',
  violet: 'group-hover:border-violet-500/40',
  rose: 'group-hover:border-rose-500/40',
  orange: 'group-hover:border-orange-500/40',
  cyan: 'group-hover:border-cyan-500/40',
  fuchsia: 'group-hover:border-fuchsia-500/40',
  lime: 'group-hover:border-lime-500/40',
};

const ACCENT_TEXT: Record<AgentAccent, string> = {
  indigo: 'text-indigo-300',
  sky: 'text-sky-300',
  pink: 'text-pink-300',
  amber: 'text-amber-300',
  emerald: 'text-emerald-300',
  violet: 'text-violet-300',
  rose: 'text-rose-300',
  orange: 'text-orange-300',
  cyan: 'text-cyan-300',
  fuchsia: 'text-fuchsia-300',
  lime: 'text-lime-300',
};

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export function AgentGrid() {
  return (
    <div className="space-y-16">
      <AgentSection
        title="Equipe principale"
        description="Vos 8 experts du quotidien immobilier — accessibles a tout moment."
        agents={[...FEATURED_AGENTS]}
        baseDelay={0}
      />

      <AgentSection
        title="Outils specialises"
        description="Agents pointus pour les analyses approfondies — etudes de marche, DPE, redaction d'offres."
        agents={[...ADVANCED_AGENTS]}
        baseDelay={0.3}
        subdued
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section
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
              subdued ? 'text-zinc-400' : 'text-white'
            )}
          >
            {title}
          </h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 backdrop-blur-md">
            {agents.length} agent{agents.length > 1 ? 's' : ''}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-zinc-400">{description}</p>
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
// Carte agent — glassmorphism + halo gradient au hover
// ---------------------------------------------------------------------------

interface AgentCardProps {
  agent: AgentConfig;
  delay: number;
  subdued?: boolean;
}

function AgentCard({ agent, delay, subdued }: AgentCardProps) {
  const halo = ACCENT_HALO[agent.accent];
  const border = ACCENT_BORDER[agent.accent];
  const accentText = ACCENT_TEXT[agent.accent];

  // Split "Charly — Orchestratrice" → "Charly" + "Orchestratrice"
  const [firstName, ...roleParts] = agent.name.split('—').map((s) => s.trim());
  const role = roleParts.join(' — ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.2, 0.65, 0.3, 0.9] }}
      whileHover={{ y: -4 }}
    >
      <Link
        href={`/agents/${agent.id}`}
        aria-label={`Ouvrir ${agent.name}`}
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white/[0.03] p-5 backdrop-blur-xl transition-all duration-300',
          subdued
            ? 'border-white/5 hover:bg-white/[0.05]'
            : 'border-white/10 hover:bg-white/[0.07]',
          border
        )}
      >
        {/* Halo colore au hover (glow gradient interne) */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100',
            halo
          )}
        />

        {/* Avatar + badge categorie */}
        <div className="flex items-start justify-between">
          <motion.div
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.08 }}
          >
            <AgentAvatar
              agentId={agent.id}
              size={subdued ? 'md' : 'lg'}
              status="ready"
            />
          </motion.div>

          <span
            className={cn(
              'rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest backdrop-blur-md',
              accentText
            )}
          >
            {agent.category}
          </span>
        </div>

        {/* Identite */}
        <div className="mt-5">
          <h3 className="text-lg font-semibold leading-tight tracking-tight text-white">
            {firstName}
          </h3>
          {role && (
            <p className={cn('mt-0.5 text-xs font-medium', accentText)}>
              {role}
            </p>
          )}
        </div>

        {/* Tagline */}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-400">
          {agent.tagline}
        </p>

        {/* Footer audiences + CTA */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
          {agent.audience.map((aud) => (
            <span
              key={aud}
              className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400 backdrop-blur-md"
            >
              {AUDIENCE_LABELS[aud]}
            </span>
          ))}
          <span
            className={cn(
              'ml-auto inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-all duration-200 group-hover:translate-x-0.5',
              accentText && 'group-hover:' + accentText
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
