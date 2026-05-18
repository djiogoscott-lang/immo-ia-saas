/**
 * AgentGrid — vue d'accueil "/agents" affichant les 12 agents sous forme de
 * cartes groupées par catégorie. Server component (pas de hooks).
 *
 * Design premium :
 *   - bordures fines (border-slate-100) avec ombres subtiles
 *   - effet de survol moderne : translation vers le haut + ombre marquée
 *   - badge de catégorie coloré (chaque catégorie a sa propre couleur Tailwind)
 *   - icône de l'agent dans un bloc coloré assorti à la catégorie
 *
 * Palette de catégories :
 *   production    → Indigo  (création de contenu prêt à l'emploi)
 *   communication → Sky     (relation parties prenantes)
 *   analyse       → Emerald (data & juridique)
 *   pilotage      → Violet  (management)
 *   formation     → Amber   (apprentissage)
 */

import Link from 'next/link';
import {
  BarChart3,
  ClipboardCheck,
  DoorOpen,
  FileSignature,
  FileText,
  Mailbox,
  Megaphone,
  PenSquare,
  Presentation,
  Scale,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import {
  AGENT_LIST,
  type AgentCategory,
  type AgentConfig,
} from '@/lib/agents/registry';

// ---------------------------------------------------------------------------
// Mappings visuels
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Mailbox,
  Zap,
  Presentation,
  BarChart3,
  TrendingUp,
  Megaphone,
  PenSquare,
  FileSignature,
  Scale,
  DoorOpen,
  ClipboardCheck,
};

const CATEGORY_LABELS: Record<AgentCategory, string> = {
  production: 'Production',
  communication: 'Communication',
  analyse: 'Analyse',
  pilotage: 'Pilotage',
  formation: 'Formation',
};

const CATEGORY_DESCRIPTIONS: Record<AgentCategory, string> = {
  production:
    "Génération de contenu prêt à l'emploi : annonces, mails, flyers, tableaux.",
  communication:
    'Rédaction de messages aux parties prenantes (notaires, banques, clients).',
  analyse:
    'Analyse de données chiffrées et de textes juridiques pour décider.',
  pilotage:
    "Suivi de performance, animation d'équipe, plan d'action managérial.",
  formation: 'Mise en situation et coaching pour progresser sur le terrain.',
};

interface CategoryStyle {
  /** Texte du badge catégorie (couleur foncée). */
  badgeText: string;
  /** Fond du badge catégorie (teinte claire). */
  badgeBg: string;
  /** Couleur de l'icône de l'agent (fond + texte). */
  iconBg: string;
  iconText: string;
  /** Bordure de la carte au survol. */
  hoverBorder: string;
  /** Couleur du séparateur de section (barre verticale). */
  accentBar: string;
}

const CATEGORY_STYLES: Record<AgentCategory, CategoryStyle> = {
  production: {
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-900/30',
    iconBg: 'bg-indigo-50 dark:bg-indigo-900/30',
    iconText: 'text-indigo-600 dark:text-indigo-300',
    hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-700',
    accentBar: 'bg-indigo-400',
  },
  communication: {
    badgeText: 'text-sky-700 dark:text-sky-300',
    badgeBg: 'bg-sky-50 dark:bg-sky-900/30',
    iconBg: 'bg-sky-50 dark:bg-sky-900/30',
    iconText: 'text-sky-600 dark:text-sky-300',
    hoverBorder: 'hover:border-sky-300 dark:hover:border-sky-700',
    accentBar: 'bg-sky-400',
  },
  analyse: {
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    iconText: 'text-emerald-600 dark:text-emerald-300',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    accentBar: 'bg-emerald-400',
  },
  pilotage: {
    badgeText: 'text-violet-700 dark:text-violet-300',
    badgeBg: 'bg-violet-50 dark:bg-violet-900/30',
    iconBg: 'bg-violet-50 dark:bg-violet-900/30',
    iconText: 'text-violet-600 dark:text-violet-300',
    hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-700',
    accentBar: 'bg-violet-400',
  },
  formation: {
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-50 dark:bg-amber-900/30',
    iconBg: 'bg-amber-50 dark:bg-amber-900/30',
    iconText: 'text-amber-600 dark:text-amber-300',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700',
    accentBar: 'bg-amber-400',
  },
};

const CATEGORY_ORDER: readonly AgentCategory[] = [
  'production',
  'communication',
  'analyse',
  'pilotage',
  'formation',
] as const;

const AUDIENCE_LABELS: Record<AgentConfig['audience'][number], string> = {
  conseiller: 'Conseillers',
  manager: 'Managers',
  assistante: 'Assistantes',
};

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export function AgentGrid() {
  const groups = CATEGORY_ORDER
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      description: CATEGORY_DESCRIPTIONS[category],
      style: CATEGORY_STYLES[category],
      agents: AGENT_LIST.filter((agent) => agent.category === category),
    }))
    .filter((group) => group.agents.length > 0);

  return (
    <div className="space-y-12">
      {groups.map((group) => (
        <section key={group.category} aria-labelledby={`cat-${group.category}`}>
          <header className="mb-5 flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-1.5 inline-block h-7 w-1 shrink-0 rounded-full ${group.style.accentBar}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2
                  id={`cat-${group.category}`}
                  className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
                >
                  {group.label}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${group.style.badgeBg} ${group.style.badgeText}`}
                >
                  {group.agents.length} agent{group.agents.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {group.description}
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                style={CATEGORY_STYLES[agent.category]}
                categoryLabel={CATEGORY_LABELS[agent.category]}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carte d'un agent
// ---------------------------------------------------------------------------

interface AgentCardProps {
  agent: AgentConfig;
  style: CategoryStyle;
  categoryLabel: string;
}

function AgentCard({ agent, style, categoryLabel }: AgentCardProps) {
  const Icon = ICON_MAP[agent.icon];

  return (
    <Link
      href={`/agents/${agent.id}`}
      className={`group relative flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 ${style.hoverBorder}`}
    >
      {/* Badge catégorie en haut à droite */}
      <span
        className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.badgeBg} ${style.badgeText}`}
      >
        {categoryLabel}
      </span>

      {/* Icône + nom */}
      <div className="flex items-start gap-3 pr-20">
        <div
          aria-hidden
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/[0.04] transition-transform group-hover:scale-105 ${style.iconBg} ${style.iconText}`}
        >
          {Icon ? <Icon className="h-5 w-5" strokeWidth={2} /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
            {agent.name}
          </h3>
        </div>
      </div>

      {/* Tagline */}
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {agent.tagline}
      </p>

      {/* Footer : audiences + chevron */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-zinc-800">
        {agent.audience.map((aud) => (
          <span
            key={aud}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {AUDIENCE_LABELS[aud]}
          </span>
        ))}
        <span className="ml-auto text-[11px] font-medium text-zinc-400 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
          Ouvrir →
        </span>
      </div>
    </Link>
  );
}
