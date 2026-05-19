'use client';

/**
 * AgentSidebar — barre latérale de navigation listant les 12 agents Nestenn V2.
 *
 * - Consomme uniquement `AGENT_LIST` exporté par `lib/agents/registry.ts` (source unique).
 * - Groupe les agents par catégorie métier (production / communication / analyse / pilotage / formation).
 * - Met en évidence l'agent courant en se basant sur le pathname Next.js (`/agents/[agentId]`).
 *
 * Convention d'URL attendue :
 *   `/agents`              → page d'accueil (grille des agents)
 *   `/agents/[agentId]`    → chat actif avec l'agent sélectionné
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  ClipboardCheck,
  DoorOpen,
  FileSignature,
  FileText,
  Home,
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
  type AgentAudience,
  type AgentCategory,
  type AgentConfig,
} from '@/lib/agents/registry';
import { APP_NAME, APP_NAME_SHORT } from '@/lib/branding';
import { UserMenu } from '@/components/auth/UserMenu';

// ---------------------------------------------------------------------------
// Mapping nom d'icône (registry) → composant Lucide réel
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

/** Ordre d'affichage des catégories dans la sidebar (top → bottom). */
const CATEGORY_ORDER: readonly AgentCategory[] = [
  'production',
  'communication',
  'analyse',
  'pilotage',
  'formation',
] as const;

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

interface AgentSidebarProps {
  /** Rôle métier du user connecté. Si fourni, les agents sont filtrés par audience. */
  userRole?: AgentAudience;
  /** Email du user (affiché dans le UserMenu en bas). */
  userEmail?: string;
  /** Nom complet du user (affiché dans le UserMenu, fallback sur le local part de l'email). */
  userFullName?: string | null;
}

export function AgentSidebar({
  userRole,
  userEmail,
  userFullName,
}: AgentSidebarProps = {}) {
  const pathname = usePathname() ?? '';
  const currentAgentId = pathname.startsWith('/agents/')
    ? pathname.split('/')[2] ?? null
    : null;

  // Filtrage des agents selon le rôle métier :
  // - un conseiller ne voit pas Ma Perf Immo, Réunion Immo, Train My Agent (audience manager)
  // - un manager voit tout ce dont son audience fait partie
  // - sans userRole, on montre tout (cas dégradé)
  const visibleAgents = userRole
    ? AGENT_LIST.filter((agent) => agent.audience.includes(userRole))
    : AGENT_LIST;

  const grouped = CATEGORY_ORDER
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      agents: visibleAgents.filter((agent) => agent.category === category),
    }))
    .filter((group) => group.agents.length > 0);

  return (
    <aside
      aria-label={`Navigation des agents ${APP_NAME}`}
      className="flex h-screen w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {/* Header : logo + nom */}
      <div className="flex h-16 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
        <Link
          href="/agents"
          className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50"
        >
          <span aria-hidden className="text-lg">
            🏠
          </span>
          <span>{APP_NAME_SHORT}</span>
          <span className="ml-1 rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300">
            V2
          </span>
        </Link>
      </div>

      {/* Lien Accueil (grille agents) */}
      <div className="border-b border-zinc-200 px-2 py-3 dark:border-zinc-800">
        <Link href="/agents" className={navLinkClass(currentAgentId === null)}>
          <Home className="h-4 w-4 shrink-0" aria-hidden />
          <span>Accueil</span>
        </Link>
      </div>

      {/* Agents groupés par catégorie */}
      <nav
        aria-label="Liste des agents"
        className="flex-1 overflow-y-auto px-2 py-3"
      >
        {grouped.map((group) => (
          <div key={group.category} className="mb-5 last:mb-0">
            <h3 className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {group.label}
            </h3>
            <ul className="space-y-0.5">
              {group.agents.map((agent) => (
                <AgentSidebarItem
                  key={agent.id}
                  agent={agent}
                  active={currentAgentId === agent.id}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer : profil user + bouton déconnexion */}
      {userEmail && userRole ? (
        <UserMenu
          email={userEmail}
          fullName={userFullName ?? null}
          role={userRole}
        />
      ) : (
        <div className="border-t border-zinc-200 px-4 py-3 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          Multi-Agents · Start Academy
        </div>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sous-composant : un item d'agent
// ---------------------------------------------------------------------------

interface AgentSidebarItemProps {
  agent: AgentConfig;
  active: boolean;
}

function AgentSidebarItem({ agent, active }: AgentSidebarItemProps) {
  const Icon = ICON_MAP[agent.icon];

  return (
    <li>
      <Link
        href={`/agents/${agent.id}`}
        aria-current={active ? 'page' : undefined}
        title={agent.tagline}
        className={navLinkClass(active)}
      >
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
        )}
        <span className="truncate">{agent.name}</span>
      </Link>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Helper de style partagé entre tous les liens de la sidebar
// ---------------------------------------------------------------------------

function navLinkClass(active: boolean): string {
  const base =
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors';
  const state = active
    ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
    : 'text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800/70';
  return `${base} ${state}`;
}
