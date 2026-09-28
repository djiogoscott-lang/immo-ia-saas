/**
 * Page détail d'un livrable — `/agents/library/[id]`.
 *
 * Affiche le frontmatter YAML en en-tête + le markdown rendu en preview.
 * Boutons d'export : Copier markdown / Télécharger .md / Exporter PDF (ouvre /print).
 */

import { ArrowLeft, Bookmark, Copy, Download, FileText, Printer } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { MarkdownMessage } from '@/components/agents/MarkdownMessage';
import { LibraryActions } from '@/components/agents/LibraryActions';
import { AGENT_REGISTRY } from '@/lib/agents/registry';
import { getAccentStyle } from '@/lib/agents/accent-styles';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getDeliverable, serializeAsMarkdown } from '@/lib/supabase/deliverables';
import { cn } from '@/lib/utils';

interface DeliverablePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function DeliverablePage(props: DeliverablePageProps) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const deliverable = await getDeliverable(params.id);
  if (!deliverable || deliverable.user_id !== user.id) {
    notFound();
  }

  const agent = AGENT_REGISTRY[deliverable.agent_id];
  const accent = agent ? getAccentStyle(agent.accent) : null;
  const firstName = agent?.name.split('—')[0]?.trim() ?? deliverable.agent_id;
  const markdownFull = serializeAsMarkdown(deliverable);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 lg:px-10">
      {/* Breadcrumb */}
      <Link
        href="/agents/library"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Retour à la bibliothèque
      </Link>

      {/* Header */}
      <header className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
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
                deliverable.status === 'final'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : deliverable.status === 'archived'
                  ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              )}
            >
              {deliverable.status}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              v{deliverable.version}
            </span>
          </div>

          <h1 className="mt-2 font-mono text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {deliverable.slug}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {deliverable.type}
            {deliverable.campagne && (
              <>
                <span className="mx-1.5">·</span>
                <span className="italic">{deliverable.campagne}</span>
              </>
            )}
            <span className="mx-1.5">·</span>
            <time dateTime={deliverable.created_at}>
              {new Date(deliverable.created_at).toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </p>
        </div>

        {/* Actions (composant client pour Copy / Download / Print) */}
        <LibraryActions
          deliverableId={deliverable.id}
          markdownFull={markdownFull}
          slug={deliverable.slug}
        />
      </header>

      {/* Frontmatter YAML en code block */}
      <section className="mt-8">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Frontmatter YAML
        </h2>
        <pre className="overflow-x-auto rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-4 font-mono text-xs leading-relaxed text-zinc-700 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-900/60 dark:text-zinc-300">
          <code>{formatFrontmatterYaml(deliverable.frontmatter)}</code>
        </pre>
      </section>

      {/* Markdown body rendu */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <FileText className="h-3 w-3" aria-hidden />
          Contenu
        </h2>
        <article className="rounded-2xl border border-zinc-200/70 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-900/60 lg:p-8">
          <MarkdownMessage>{deliverable.markdown_body}</MarkdownMessage>
        </article>
      </section>

      {/* Footer techniques (tokens, modèle) */}
      <footer className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-400 dark:text-zinc-500">
        {deliverable.model_used && <span>Modèle : {deliverable.model_used}</span>}
        {deliverable.tokens_in != null && <span>↑ {deliverable.tokens_in} tokens in</span>}
        {deliverable.tokens_out != null && <span>↓ {deliverable.tokens_out} tokens out</span>}
        <span>ID : <code className="font-mono">{deliverable.id.slice(0, 8)}</code></span>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFrontmatterYaml(fm: Record<string, unknown>): string {
  const lines = Object.entries(fm)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}: ${v}`;
      if (typeof v === 'number' || typeof v === 'boolean') return `${k}: ${v}`;
      return `${k}: ${JSON.stringify(v)}`;
    });
  return ['---', ...lines, '---'].join('\n');
}
