'use client';

/**
 * AgentWorkspace — espace de travail d'un agent (style Linear/Vercel flashy).
 *
 * Header sombre avec halo gradient subtile par accent agent + 3 onglets
 * (Chat, Analytics, Historique) avec accent fuchsia/cyan a l'actif. Les
 * panneaux Analytics et Historique sont en glassmorphism sombre. Le chat
 * delegue a AgentChat (qui conserve son style fonctionnel clair).
 */

import {
  BarChart3,
  ClipboardCheck,
  Clock,
  DoorOpen,
  FileSignature,
  FileText,
  History,
  Mailbox,
  Megaphone,
  MessageCircle,
  MessageSquare,
  PenSquare,
  Presentation,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import { AgentAvatar } from '@/components/agents/AgentAvatar';
import { AgentChat } from '@/components/agents/AgentChat';
import { cn } from '@/lib/utils';
import type { AgentCategory, AgentConfig } from '@/lib/agents/registry';

// ---------------------------------------------------------------------------
// Mappings
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
  Sparkles,
};

const CATEGORY_LABELS: Record<AgentCategory, string> = {
  orchestrateur: 'Orchestration',
  production: 'Production',
  communication: 'Communication',
  analyse: 'Analyse',
  pilotage: 'Pilotage',
};

const CATEGORY_GRADIENT: Record<AgentCategory, string> = {
  orchestrateur: 'from-indigo-400 to-violet-400',
  production: 'from-emerald-400 to-teal-400',
  communication: 'from-sky-400 to-cyan-400',
  analyse: 'from-vercel-pink to-vercel-pink',
  pilotage: 'from-vercel-violet to-vercel-violet',
};

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabId = 'chat' | 'analytics' | 'history';

interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const TABS: readonly TabDef[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'history', label: 'Historique', icon: History },
] as const;

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

interface AgentWorkspaceProps {
  agent: AgentConfig;
}

export function AgentWorkspace({ agent }: AgentWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const Icon = ICON_MAP[agent.icon];
  const categoryGradient = CATEGORY_GRADIENT[agent.category];

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-white">
      {/* Header avec halo gradient subtile en background */}
      <header className="relative overflow-hidden border-b border-white/10 bg-zinc-950">
        {/* Halo colore par categorie */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -top-32 left-1/2 -z-0 h-64 w-[800px] -translate-x-1/2 bg-gradient-to-br opacity-20 blur-3xl',
            categoryGradient
          )}
        />

        <div className="relative z-10 px-6 pt-5">
          <div className="flex items-center gap-3">
            <AgentAvatar agentId={agent.id} size="md" status="ready" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-tight text-white">
                  {agent.name}
                </h1>
                <span
                  className={cn(
                    'shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md',
                    `bg-gradient-to-r ${categoryGradient} bg-clip-text text-transparent`
                  )}
                >
                  {CATEGORY_LABELS[agent.category]}
                </span>
              </div>
              <p className="truncate text-xs text-zinc-400">{agent.tagline}</p>
            </div>
            {Icon && (
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 backdrop-blur-md sm:flex">
                <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              </div>
            )}
          </div>

          {/* Tabs navigation */}
          <nav
            role="tablist"
            aria-label={`Onglets de ${agent.name}`}
            className="mt-4 flex items-center gap-1"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'group relative flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'border-vercel-pink text-white shadow-[0_4px_20px_rgba(255,0,128,0.3)]'
                      : 'border-transparent text-zinc-500 hover:border-white/10 hover:text-zinc-200'
                  )}
                >
                  <TabIcon className="h-3.5 w-3.5" aria-hidden />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <div
          role="tabpanel"
          id="tabpanel-chat"
          aria-labelledby="tab-chat"
          hidden={activeTab !== 'chat'}
          className="h-full"
        >
          {activeTab === 'chat' && <AgentChat agent={agent} hideHeader />}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-analytics"
          aria-labelledby="tab-analytics"
          hidden={activeTab !== 'analytics'}
          className="h-full overflow-y-auto bg-zinc-950"
        >
          {activeTab === 'analytics' && <AnalyticsTab agent={agent} />}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-history"
          aria-labelledby="tab-history"
          hidden={activeTab !== 'history'}
          className="h-full overflow-y-auto bg-zinc-950"
        >
          {activeTab === 'history' && (
            <HistoryTab agent={agent} onResume={() => setActiveTab('chat')} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet Analytics — KPIs glassmorphism sombre + glow
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  variation?: string;
  gradient?: string;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  variation,
  gradient = 'from-vercel-violet to-vercel-pink',
}: KpiCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl transition-all hover:border-white/20">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -inset-px -z-10 rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100',
          'bg-gradient-to-br',
          gradient,
          'opacity-0 group-hover:opacity-20'
        )}
      />
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 backdrop-blur-md',
            `bg-gradient-to-br ${gradient} bg-clip-text text-transparent`
          )}
        >
          <Icon className="h-4 w-4 text-vercel-pink" aria-hidden />
        </span>
        {variation && (
          <span className="text-xs font-semibold text-emerald-400">
            {variation}
          </span>
        )}
      </div>
      <p
        className={cn(
          'mt-4 bg-gradient-to-r bg-clip-text text-3xl font-bold tracking-tight text-transparent',
          gradient
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-400">{label}</p>
    </div>
  );
}

function AnalyticsTab({ agent }: { agent: AgentConfig }) {
  return (
    <div className="relative mx-auto max-w-5xl px-6 py-8 lg:px-10">
      {/* Halo background subtile */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-[800px] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(255,0,128,0.10),transparent_70%)] blur-3xl"
      />

      <header className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-vercel-pink">
          Donnees simulees
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Performance de{' '}
          <span className="bg-gradient-to-r from-vercel-violet to-vercel-pink bg-clip-text text-transparent">
            {agent.name.split('—')[0].trim()}
          </span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          A brancher sur les vraies metriques (table messages + tokens consommes)
          des que la persistance Supabase est active.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={MessageCircle}
          label="Requetes traitees (30 j)"
          value="124"
          variation="+18 %"
          gradient="from-vercel-violet to-vercel-pink"
        />
        <KpiCard
          icon={Clock}
          label="Temps gagne estime"
          value="18 h"
          variation="+2 h 10"
          gradient="from-vercel-pink to-vercel-pink"
        />
        <KpiCard
          icon={Target}
          label="Precision moyenne"
          value="96 %"
          variation="+1,2 pt"
          gradient="from-cyan-400 to-blue-400"
        />
        <KpiCard
          icon={Sparkles}
          label="Livrables generes"
          value="47"
          variation="+9"
          gradient="from-amber-400 to-orange-400"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <h3 className="text-sm font-semibold text-white">
          Tendance d'utilisation
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Graphique a venir (Recharts ou Tremor, base sur l'historique reel).
        </p>
        <div className="mt-6 flex h-32 items-end gap-1.5">
          {[40, 55, 38, 70, 62, 80, 65, 88, 72, 95, 82, 100].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-vercel-violet/40 via-vercel-pink/70 to-vercel-pink shadow-[0_0_10px_rgba(255,0,128,0.3)]"
              style={{ height: `${h}%` }}
              aria-hidden
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[10px] uppercase tracking-widest text-zinc-500">
          <span>Il y a 12 jours</span>
          <span>Aujourd'hui</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet Historique — conversations passees
// ---------------------------------------------------------------------------

interface FakeConversation {
  id: string;
  title: string;
  preview: string;
  date: string;
}

const FAKE_CONVERSATIONS: FakeConversation[] = [
  {
    id: 'c-1',
    title: 'Synthese RDV vendeur — 12 avenue de la Republique',
    preview: 'Mail de remerciement + plan marketing pour Mme Dupont, T3…',
    date: "Aujourd'hui · 14:22",
  },
  {
    id: 'c-2',
    title: 'Annonce immobiliere Villa Saint-Laurent-du-Var',
    preview: 'Titre accrocheur, description fluide, hashtags reseaux sociaux…',
    date: 'Hier · 17:08',
  },
  {
    id: 'c-3',
    title: 'Courrier de prospection secteur Cannes',
    preview: "Annonce d'un nouveau bien dans le quartier, ton chaleureux…",
    date: 'Il y a 3 jours',
  },
  {
    id: 'c-4',
    title: 'Analyse de documents — appartement T4 Nice',
    preview: 'Diagnostics, charges, reglement de copropriete…',
    date: 'Il y a 1 semaine',
  },
];

function HistoryTab({
  agent,
  onResume,
}: {
  agent: AgentConfig;
  onResume: () => void;
}) {
  return (
    <div className="relative mx-auto max-w-5xl px-6 py-8 lg:px-10">
      <header className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-vercel-cyan">
          Donnees simulees
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Historique avec{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {agent.name.split('—')[0].trim()}
          </span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          L'historique reel apparaitra ici des que la table{' '}
          <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px] text-zinc-300">
            conversations
          </code>{' '}
          Supabase sera active.
        </p>
      </header>

      <ul className="space-y-3">
        {FAKE_CONVERSATIONS.map((conv) => (
          <li key={conv.id}>
            <button
              type="button"
              onClick={onResume}
              className="group flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-vercel-pink/40 hover:bg-white/[0.06] hover:shadow-[0_0_30px_rgba(255,0,128,0.18)]"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-vercel-pink/20 to-vercel-pink/20 text-vercel-pink"
              >
                <MessageCircle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {conv.title}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
                  {conv.preview}
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  {conv.date}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
