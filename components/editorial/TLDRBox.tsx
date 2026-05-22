/**
 * TLDRBox — encart "TL;DR" gris pâle avec border-left accent orange.
 *
 * Modèle NAIOM p.2 : 3 points clés en début de section pour donner le résumé
 * exécutif. Utiliser <ol> ou <ul> en children.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface TLDRBoxProps {
  /** Label personnalisé. Par défaut "TL;DR". */
  label?: string;
  children: ReactNode;
  className?: string;
}

export function TLDRBox({ label = 'TL;DR', children, className }: TLDRBoxProps) {
  return (
    <aside
      className={cn(
        'border-l-2 border-accent bg-paper-muted px-6 py-5',
        className
      )}
    >
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-ink-muted">
        {label}
      </div>
      <div className="text-sm leading-relaxed text-ink-soft [&>ol]:space-y-2 [&>ol]:pl-0 [&>ul]:space-y-2 [&>ul]:pl-0 [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </aside>
  );
}
