'use client';

/**
 * LibraryActions — barre d'actions d'un livrable archivé.
 *
 * - Copier le markdown complet (frontmatter + body) dans le presse-papiers
 * - Télécharger en .md (frontmatter + body)
 * - Exporter en PDF : ouvre la page /print dans une nouvelle fenêtre, qui
 *   déclenche window.print() au montage. L'utilisateur sauvegarde en PDF
 *   via le dialog browser (qualité pixel-perfect, multi-plateforme).
 */

import { Copy, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface LibraryActionsProps {
  deliverableId: string;
  markdownFull: string;
  slug: string;
}

export function LibraryActions({
  deliverableId,
  markdownFull,
  slug,
}: LibraryActionsProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownFull);
      toast.success('Markdown copié dans le presse-papiers');
    } catch {
      toast.error('Copie impossible');
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([markdownFull], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Fichier téléchargé', { description: `${slug}.md` });
    } catch (err) {
      toast.error('Téléchargement impossible', {
        description: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    }
  };

  const handleExportPdf = () => {
    const printUrl = `/agents/library/${deliverableId}/print`;
    window.open(printUrl, '_blank', 'noopener');
  };

  return (
    <div className="flex shrink-0 items-center gap-1">
      <ActionIcon onClick={handleCopy} title="Copier le markdown">
        <Copy className="h-3.5 w-3.5" aria-hidden />
      </ActionIcon>
      <ActionIcon onClick={handleDownload} title="Télécharger en .md">
        <Download className="h-3.5 w-3.5" aria-hidden />
      </ActionIcon>
      <ActionIcon onClick={handleExportPdf} title="Exporter en PDF" primary>
        <Printer className="h-3.5 w-3.5" aria-hidden />
        <span className="ml-1 text-xs font-medium">PDF</span>
      </ActionIcon>
    </div>
  );
}

interface ActionIconProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  primary?: boolean;
}

function ActionIcon({ onClick, title, children, primary }: ActionIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={
        primary
          ? 'inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
          : 'inline-flex items-center justify-center rounded-lg border border-zinc-200/70 bg-white/60 p-2 text-zinc-600 backdrop-blur-md transition-colors hover:bg-white hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800/60 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
      }
    >
      {children}
    </button>
  );
}
