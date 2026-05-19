'use client';

/**
 * AgentWorkspace — espace de travail complet d'un agent sélectionné.
 *
 * Header global (icône + nom + tagline + catégorie) + barre de 4 onglets :
 *   1. Chat       — délégation au composant AgentChat (avec hideHeader)
 *   2. Analytics  — KPIs de l'agent (cartes)
 *   3. Fichiers   — drag & drop (RAG, à venir) + liste
 *   4. Historique — conversations passées avec cet agent
 *
 * État local `activeTab` pour basculer entre les onglets sans recharger
 * la page. Inspiré du layout Limova AI.
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
  Upload,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import { AgentChat } from '@/components/agents/AgentChat';
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
};

const CATEGORY_LABELS: Record<AgentCategory, string> = {
  orchestrateur: 'Orchestration',
  production: 'Production',
  communication: 'Communication',
  analyse: 'Analyse',
  pilotage: 'Pilotage',
};

const CATEGORY_BADGES: Record<AgentCategory, string> = {
  orchestrateur: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  production: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  communication: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  analyse: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  pilotage: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabId = 'chat' | 'analytics' | 'files' | 'history';

interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const TABS: readonly TabDef[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'files', label: 'Fichiers', icon: FileText },
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

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      {/* Header global */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center gap-3 px-6 pt-4">
          <div
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300 dark:ring-cyan-900/50"
          >
            {Icon ? <Icon className="h-5 w-5" strokeWidth={2.2} /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                {agent.name}
              </h1>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${CATEGORY_BADGES[agent.category]}`}
              >
                {CATEGORY_LABELS[agent.category]}
              </span>
            </div>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {agent.tagline}
            </p>
          </div>
        </div>

        {/* Tabs navigation */}
        <nav
          role="tablist"
          aria-label={`Onglets de ${agent.name}`}
          className="mt-3 flex items-center gap-1 px-4"
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
                className={[
                  'group flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-cyan-600 text-cyan-700 dark:border-cyan-400 dark:text-cyan-300'
                    : 'border-transparent text-zinc-500 hover:border-slate-200 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200',
                ].join(' ')}
              >
                <TabIcon className="h-3.5 w-3.5" aria-hidden />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Tab content — chaque onglet est un panel ARIA */}
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
          className="h-full overflow-y-auto"
        >
          {activeTab === 'analytics' && <AnalyticsTab agent={agent} />}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-files"
          aria-labelledby="tab-files"
          hidden={activeTab !== 'files'}
          className="h-full overflow-y-auto"
        >
          {activeTab === 'files' && <FilesTab agent={agent} />}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-history"
          aria-labelledby="tab-history"
          hidden={activeTab !== 'history'}
          className="h-full overflow-y-auto"
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
// Onglet Analytics — KPIs de l'agent (données fictives pour l'instant)
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  variation?: string;
  variationKind?: 'positive' | 'neutral';
}

function KpiCard({
  icon: Icon,
  label,
  value,
  variation,
  variationKind = 'positive',
}: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        {variation && (
          <span
            className={
              variationKind === 'positive'
                ? 'text-xs font-medium text-emerald-600 dark:text-emerald-400'
                : 'text-xs font-medium text-zinc-500 dark:text-zinc-400'
            }
          >
            {variation}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

function AnalyticsTab({ agent }: { agent: AgentConfig }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
      <header className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Performance de {agent.name}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Données simulées · à brancher sur les vraies métriques (table
          messages + tokens consommés) dès que la persistance Supabase est
          active.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={MessageCircle}
          label="Requêtes traitées (30 j)"
          value="124"
          variation="+18 %"
        />
        <KpiCard
          icon={Clock}
          label="Temps gagné estimé"
          value="18 h 32"
          variation="+2 h 10"
        />
        <KpiCard
          icon={Target}
          label="Précision moyenne"
          value="96 %"
          variation="+1,2 pt"
        />
        <KpiCard
          icon={Sparkles}
          label="Livrables générés"
          value="47"
          variation="+9"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Tendance d'utilisation
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Le graphique apparaîtra ici (intégration Recharts ou Tremor à venir,
          basée sur l'historique réel des conversations).
        </p>
        <div className="mt-4 flex h-32 items-end gap-1.5">
          {[40, 55, 38, 70, 62, 80, 65, 88, 72, 95, 82, 100].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-cyan-200 to-cyan-500 dark:from-cyan-900 dark:to-cyan-400"
              style={{ height: `${h}%` }}
              aria-hidden
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-zinc-400">
          <span>Il y a 12 jours</span>
          <span>Aujourd'hui</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet Fichiers — drop zone + liste fictive
// ---------------------------------------------------------------------------

interface FakeFile {
  name: string;
  size: string;
  date: string;
}

const FAKE_FILES: Record<string, FakeFile[]> = {
  anais: [
    { name: 'Modele_offre_2026.pdf', size: '224 Ko', date: 'Il y a 3 jours' },
    { name: 'Conditions_suspensives_standard.docx', size: '48 Ko', date: 'Il y a 1 semaine' },
  ],
  julia: [
    { name: 'Loi_Hoguet_consolidee.pdf', size: '1.2 Mo', date: 'Il y a 2 jours' },
    { name: 'Loi_1965_copropriété.pdf', size: '880 Ko', date: 'Il y a 5 jours' },
    { name: 'Bareme_honoraires_2026.pdf', size: '112 Ko', date: 'Il y a 12 jours' },
  ],
  elio: [
    { name: 'RDV_vendeur_M_Dupont_25-03.pdf', size: '156 Ko', date: 'Il y a 2 jours' },
  ],
};

function FilesTab({ agent }: { agent: AgentConfig }) {
  const [isDragging, setIsDragging] = useState(false);
  const files = FAKE_FILES[agent.id] ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
      <header className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Fichiers de {agent.name}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Téléverse des documents pour enrichir le contexte de l'agent (RAG).
          Le branchement Supabase Storage est en cours.
        </p>
      </header>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          // TODO : brancher l'upload Supabase Storage ici
        }}
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          isDragging
            ? 'border-cyan-400 bg-cyan-50/80 dark:border-cyan-500 dark:bg-cyan-900/20'
            : 'border-slate-200 bg-slate-50/60 dark:border-zinc-700 dark:bg-zinc-900/40',
        ].join(' ')}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-cyan-700 shadow-sm dark:bg-zinc-800 dark:text-cyan-300">
          <Upload className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Glisse tes fichiers ici
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            PDF, Word, Excel, images · max 10 Mo par fichier
          </p>
        </div>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
          title="Branchement Supabase Storage en cours"
        >
          Parcourir mes fichiers (bientôt)
        </button>
      </div>

      {/* Liste de fichiers */}
      <div className="mt-8">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {files.length > 0
            ? `${files.length} fichier${files.length > 1 ? 's' : ''} déjà associé${files.length > 1 ? 's' : ''}`
            : 'Aucun fichier pour le moment'}
        </h3>

        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.name}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {file.size} · {file.date}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet Historique — conversations passées avec cet agent
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
    title: 'Synthèse RDV vendeur — 12 avenue de la République',
    preview: 'Mail de remerciement + plan marketing pour Mme Dupont, T3…',
    date: 'Aujourd’hui · 14:22',
  },
  {
    id: 'c-2',
    title: 'Annonce immobilière Villa Saint-Laurent-du-Var',
    preview: 'Titre accrocheur, description fluide, hashtags réseaux sociaux…',
    date: 'Hier · 17:08',
  },
  {
    id: 'c-3',
    title: 'Courrier de prospection secteur Cannes',
    preview: 'Annonce d\'un nouveau bien dans le quartier, ton chaleureux…',
    date: 'Il y a 3 jours',
  },
  {
    id: 'c-4',
    title: 'Analyse de documents — appartement T4 Nice',
    preview: 'Diagnostics, charges, règlement de copropriété…',
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
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
      <header className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Historique avec {agent.name}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Données simulées · l'historique réel apparaîtra ici dès que la
          table <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-800">conversations</code>{' '}
          Supabase sera active.
        </p>
      </header>

      <ul className="space-y-3">
        {FAKE_CONVERSATIONS.map((conv) => (
          <li key={conv.id}>
            <button
              type="button"
              onClick={onResume}
              className="group flex w-full items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
              >
                <MessageCircle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {conv.title}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {conv.preview}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
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
