/**
 * GuardrailBox — encart "Garde-fous" / "Convention critique" gris pâle.
 *
 * Modèle NAIOM p.4 et p.8 : signale une contrainte ou règle technique qui
 * s'applique transversalement. Plus discret que PrincipleBox.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface GuardrailBoxProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export function GuardrailBox({
  label = 'Garde-fous',
  children,
  className,
}: GuardrailBoxProps) {
  return (
    <aside
      className={cn(
        'border-l-2 border-accent bg-paper-soft px-6 py-5',
        className
      )}
    >
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-ink-muted">
        {label}
      </div>
      <div className="text-sm leading-relaxed text-ink-soft [&_code]:rounded [&_code]:bg-paper-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </aside>
  );
}
