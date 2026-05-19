/**
 * Page Bibliothèque — `/agents/library`.
 *
 * Liste tous les livrables archivés de l'utilisateur connecté, avec filtres
 * par agent et par campagne. Server component (data fetch direct via Supabase).
 *
 * Mode démo : message d'information (auth Supabase requise).
 */

import { Bookmark } from 'lucide-react';
import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth/get-current-user';
import { listDeliverables } from '@/lib/supabase/deliverables';
import { AGENT_REGISTRY } from '@/lib/agents/registry';
import { getAccentStyle } from '@/lib/agents/accent-styles';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const isDemoMode = process.env.DEMO_MODE !== 'false';

  // Cas mode démo : pas d'auth Supabase, donc pas de livrables
  if (isDemoMode) {
    return <DemoModeNotice />;
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-2xl font-semibold">Bibliothèque</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Connecte-toi pour voir tes livrables archivés.
        </p>
      </div>
    );
  }

  const deliverables = await listDeliverables(user.id, { limit: 100 });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      {/* Header */}
      <header className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Bibliothèque
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Tes livrables archivés
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {deliverables.length} livrable{deliverables.length > 1 ? 's' : ''} sauvegardé
          {deliverables.length > 1 ? 's' : ''} · Chaque livrable est versionné avec son frontmatter YAML.
        </p>
      </header>

      {deliverables.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deliverables.map((d) => {
            const agent = AGENT_REGISTRY[d.agent_id];
            const accent = agent ? getAccentStyle(agent.accent) : null;
            const firstName = agent?.name.split('—')[0]?.trim() ?? d.agent_id;

            return (
              <Link
                key={d.id}
                href={`/agents/library/${d.id}`}
                className={cn(
                  'group flex flex-col rounded-2xl border bg-white/60 p-4 shadow-sm backdrop-blur-xl transition-all duration-200',
                  'hover:-translate-y-0.5 hover:shadow-lg',
                  'border-zinc-200/70 dark:border-zinc-800/60 dark:bg-zinc-900/60',
                  accent?.cardHoverBorder,
                  accent?.cardHoverShadow
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      accent ? cn(accent.badgeBg, accent.badgeText) : 'bg-zinc-100 text-zinc-600'
                    )}
                  >
                    {firstName}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      d.status === 'final'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : d.status === 'archived'
                        ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    )}
                  >
                    {d.status}
                  </span>
                </div>

                <h2 className="mt-3 truncate font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {d.slug}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {d.type}
                  {d.campagne && (
                    <>
                      <span className="mx-1.5">·</span>
                      <span className="italic">{d.campagne}</span>
                    </>
                  )}
                </p>

                <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {d.markdown_body.slice(0, 220)}
                  {d.markdown_body.length > 220 && '…'}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-[10px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                  <span>v{d.version}</span>
                  <time dateTime={d.created_at}>
                    {new Date(d.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </time>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function DemoModeNotice() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
        Bibliothèque
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Tes livrables archivés
      </h1>
      <div className="mt-8 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-6 backdrop-blur-xl dark:border-amber-900/40 dark:bg-amber-950/30">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
          La bibliothèque nécessite une session authentifiée.
        </p>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200/80">
          Le mode démo n&apos;a pas de persistance utilisateur — tes productions
          d&apos;agents ne sont pas archivées. Pour activer la bibliothèque,
          configure Supabase et désactive <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/40">DEMO_MODE</code>.
        </p>
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300/80">
          Migration SQL à appliquer côté Supabase :{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono dark:bg-amber-900/40">
            migrations/v3_deliverables.sql
          </code>
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/60 p-12 text-center backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-900/60">
      <Bookmark
        className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-700"
        strokeWidth={1.5}
        aria-hidden
      />
      <h2 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        Aucun livrable archivé pour le moment
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Sauvegarde tes meilleures réponses d&apos;agents en cliquant sur{' '}
        <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
          <Bookmark className="h-3 w-3" /> Sauvegarder
        </span>{' '}
        sous chaque message.
      </p>
    </div>
  );
}
