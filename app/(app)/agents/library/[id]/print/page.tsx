/**
 * Page print d'un livrable — `/agents/library/[id]/print`.
 *
 * Mise en page A4 sobre, sans sidebar ni nav. Déclenche window.print() au
 * montage (côté client) pour ouvrir directement le dialog Save as PDF.
 *
 * Layout :
 *   - Header : nom de l'app + agent + date
 *   - Title : slug + type + campagne
 *   - Frontmatter YAML (code block)
 *   - Body markdown rendu
 *   - Footer : ID + modèle
 *
 * CSS print : voir globals.css (@media print).
 */

import { notFound } from 'next/navigation';

import { MarkdownMessage } from '@/components/agents/MarkdownMessage';
import { PrintTrigger } from '@/components/agents/PrintTrigger';
import { AGENT_REGISTRY } from '@/lib/agents/registry';
import { APP_NAME } from '@/lib/branding';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getDeliverable, serializeAsMarkdown } from '@/lib/supabase/deliverables';

interface PrintPageProps {
  params: { id: string };
}

export const dynamic = 'force-dynamic';

export default async function PrintPage({ params }: PrintPageProps) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const deliverable = await getDeliverable(params.id);
  if (!deliverable || deliverable.user_id !== user.id) notFound();

  const agent = AGENT_REGISTRY[deliverable.agent_id];
  const firstName = agent?.name.split('—')[0]?.trim() ?? deliverable.agent_id;
  const agentRole = agent?.name.split('—')[1]?.trim() ?? '';
  const markdownYaml = serializeAsMarkdown(deliverable).split('\n\n')[0] ?? '';

  return (
    <div className="print-page mx-auto max-w-3xl bg-white px-12 py-12 text-zinc-900">
      {/* Déclencheur side-effect : window.print() au montage côté client */}
      <PrintTrigger />

      {/* Header */}
      <header className="mb-8 flex items-start justify-between border-b border-zinc-200 pb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {APP_NAME}
          </p>
          <p className="mt-1 text-[10px] text-zinc-500">
            Livrable de {firstName}
            {agentRole && ` · ${agentRole}`}
          </p>
        </div>
        <div className="text-right text-[10px] text-zinc-500">
          <p>{new Date(deliverable.created_at).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}</p>
          <p className="mt-0.5">v{deliverable.version} · {deliverable.status}</p>
        </div>
      </header>

      {/* Titre */}
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-zinc-900">
          {deliverable.slug}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {deliverable.type}
          {deliverable.campagne && (
            <>
              <span className="mx-2">·</span>
              <span className="italic">{deliverable.campagne}</span>
            </>
          )}
        </p>
      </div>

      {/* Frontmatter YAML */}
      <section className="mb-8">
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Frontmatter
        </h2>
        <pre className="rounded border border-zinc-200 bg-zinc-50 p-4 font-mono text-[10px] leading-relaxed text-zinc-700">
          <code>{markdownYaml}</code>
        </pre>
      </section>

      {/* Body markdown rendu */}
      <article className="prose prose-sm prose-zinc max-w-none">
        <MarkdownMessage>{deliverable.markdown_body}</MarkdownMessage>
      </article>

      {/* Footer */}
      <footer className="mt-12 border-t border-zinc-200 pt-4 text-[9px] text-zinc-400">
        <p>
          ID : <code className="font-mono">{deliverable.id}</code>
          {deliverable.model_used && <> · Modèle : {deliverable.model_used}</>}
        </p>
        <p className="mt-0.5">{APP_NAME} · livrable archivé</p>
      </footer>
    </div>
  );
}
