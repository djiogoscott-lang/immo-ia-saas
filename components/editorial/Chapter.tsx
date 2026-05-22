/**
 * Chapter — titre de chapitre éditorial (ex: "02 — STACK / La stack technique").
 *
 * Inspiré du PDF NAIOM : numéro + label en petit gris au-dessus, puis titre
 * énorme display bold avec letter-spacing serré.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ChapterProps {
  /** Numéro affiché en éyaille (ex: "02"). */
  number?: string;
  /** Label en majuscule à côté du numéro (ex: "STACK"). */
  eyebrow?: string;
  /** Titre principal du chapitre. */
  title: string;
  /** Optionnel : sous-titre en italique gris. */
  subtitle?: ReactNode;
  className?: string;
}

export function Chapter({ number, eyebrow, title, subtitle, className }: ChapterProps) {
  return (
    <header className={cn('border-b border-ink-line pb-6', className)}>
      {(number || eyebrow) && (
        <div className="mb-4 flex items-baseline gap-3 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
          {number && <span>{number}</span>}
          {number && eyebrow && <span className="opacity-40">—</span>}
          {eyebrow && <span>{eyebrow}</span>}
        </div>
      )}
      <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-display-tight text-ink sm:text-6xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-4 max-w-prose font-display text-2xl italic leading-tight text-ink-subtle">
          {subtitle}
        </p>
      )}
    </header>
  );
}
