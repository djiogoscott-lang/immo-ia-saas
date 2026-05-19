'use client';

/**
 * AgentGrid — grille premium des 11 agents (8 featured + 3 advanced).
 *
 * Design Limova/NAIOM-like :
 *   - Cartes glassmorphism : bg semi-transparent + backdrop-blur
 *   - Avatars visuels (image custom si dispo, sinon DiceBear SVG auto-généré)
 *   - Badge d'état directement intégré dans l'avatar (point coloré ready/active)
 *   - Animations Framer Motion (stagger d'entrée + hover lift)
 *   - 2 sections : "Équipe principale" (featured, avatars LG) + "Outils spécialisés" (advanced, avatars MD)
 */

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { AgentAvatar } from '@/components/agents/AgentAvatar';
import { getAccentStyle } from '@/lib/agents/accent-styles';
import {
  ADVANCED_AGENTS,
  FEATURED_AGENTS,
  type AgentConfig,
} from '@/lib/agents/registry';
import { cn } from '@/lib/utils';

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
// Carte agent — avatar central, identité, tagline, footer audiences
// ---------------------------------------------------------------------------

interface AgentCardProps {
  agent: AgentConfig;
  delay: number;
  subdued?: boolean;
}

function AgentCard({ agent, delay, subdued }: AgentCardProps) {
  const accent = getAccentStyle(agent.accent);

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
          'group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 shadow-sm backdrop-blur-xl transition-all duration-200',
          'hover:shadow-xl',
          subdued
            ? 'border-zinc-200/60 bg-white/40 dark:border-zinc-800/40 dark:bg-zinc-900/40'
            : 'border-zinc-200/80 bg-white/60 dark:border-zinc-800/60 dark:bg-zinc-900/60',
          accent.cardHoverBorder,
          accent.cardHoverShadow
        )}
      >
        {/* Halo coloré subtil, dévoilé au hover */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -inset-x-8 -top-12 h-32 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-30',
            accent.iconBg
          )}
        />

        {/* Avatar + status (intégré) */}
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

          {/* Badge catégorie discret */}
          <span
            className={cn(
              'rounded-full border border-current/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider backdrop-blur-md',
              accent.badgeText
            )}
          >
            {agent.category}
          </span>
        </div>

        {/* Identité */}
        <div className="mt-5">
          <h3 className="text-lg font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
            {firstName}
          </h3>
          {role && (
            <p className={cn('mt-0.5 text-xs font-medium', accent.badgeText)}>
              {role}
            </p>
          )}
        </div>

        {/* Tagline */}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {agent.tagline}
        </p>

        {/* Footer audiences + CTA */}
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
              'ml-auto inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-transform duration-200 group-hover:translate-x-0.5',
              accent.accentText
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
