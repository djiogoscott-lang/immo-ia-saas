/**
 * PrincipleBox — encart "Principe directeur" fond noir / texte blanc /
 * border-left accent orange.
 *
 * Modèle NAIOM p.3 : sert à marquer une règle fondatrice non négociable.
 * À utiliser parcimonieusement (max 1 par page) pour préserver son impact.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PrincipleBoxProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export function PrincipleBox({
  label = 'Principe directeur',
  children,
  className,
}: PrincipleBoxProps) {
  return (
    <aside
      className={cn(
        'border-l-4 border-accent bg-ink px-6 py-6 text-paper',
        className
      )}
    >
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-paper/60">
        {label}
      </div>
      <div className="text-base leading-relaxed text-paper/90 [&_strong]:font-semibold [&_strong]:text-paper">
        {children}
      </div>
    </aside>
  );
}
