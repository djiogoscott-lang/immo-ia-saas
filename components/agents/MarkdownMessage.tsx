'use client';

/**
 * MarkdownMessage — rendu Markdown avec styles Tailwind pour les réponses
 * des agents (tableaux juridiques, listes d'actions, blocs de code, citations…).
 *
 * Utilise `react-markdown` + `remark-gfm` pour supporter :
 *   - tableaux GFM (My Juridic, Immo Predictor, My DPE)
 *   - listes de cases à cocher
 *   - liens auto-détectés
 *   - strikethrough
 *
 * Pas de plugin `rehype-raw` : on n'autorise PAS le HTML brut dans les
 * réponses (sécurité — injection XSS si un agent répétait du contenu utilisateur).
 */

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Components = {
  // Paragraphes : espacement vertical confortable
  p: ({ children }) => (
    <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
  ),

  // Titres : hiérarchie visuelle nette
  h1: ({ children }) => (
    <h1 className="mb-3 mt-5 text-xl font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-5 text-lg font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>
  ),

  // Listes
  ul: ({ children }) => (
    <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0 marker:text-zinc-400">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0 marker:text-zinc-500">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  // Citations / blockquote
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-cyan-300 bg-cyan-50/40 px-4 py-2 italic text-zinc-700 last:mb-0 dark:border-cyan-700 dark:bg-cyan-950/20 dark:text-zinc-300">
      {children}
    </blockquote>
  ),

  // Code inline et blocs de code
  code: ({ className, children, ...props }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <code
          className="block whitespace-pre-wrap break-words font-mono text-[13px]"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-zinc-200/70 px-1 py-0.5 font-mono text-[0.875em] text-zinc-800 dark:bg-zinc-800/70 dark:text-zinc-200"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-zinc-900 px-4 py-3 text-zinc-100 last:mb-0 dark:bg-zinc-950 dark:ring-1 dark:ring-zinc-800">
      {children}
    </pre>
  ),

  // Liens
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-cyan-700 underline decoration-cyan-300 underline-offset-2 hover:text-cyan-800 hover:decoration-cyan-500 dark:text-cyan-400 dark:decoration-cyan-700 dark:hover:text-cyan-300"
    >
      {children}
    </a>
  ),

  // Tableaux (cas typique My Juridic / Immo Predictor / My DPE)
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto rounded-lg border border-zinc-200 last:mb-0 dark:border-zinc-700">
      <table className="w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-zinc-50 dark:bg-zinc-800/50">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 align-top text-zinc-700 dark:text-zinc-300">
      {children}
    </td>
  ),

  // Séparateurs (Réunion Immo utilise `---` pour les slides Gamma)
  hr: () => <hr className="my-4 border-zinc-200 dark:border-zinc-700" />,

  // Emphase
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-900 dark:text-zinc-50">
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
};

interface MarkdownMessageProps {
  /** Contenu Markdown brut renvoyé par le LLM. */
  children: string;
}

export function MarkdownMessage({ children }: MarkdownMessageProps) {
  return (
    <div className="text-sm text-zinc-800 dark:text-zinc-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
