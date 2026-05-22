/**
 * CoverSection — section pleine largeur fond noir / texte blanc, modèle NAIOM
 * couverture (p.1) et fin (p.12).
 *
 * Titre en deux temps : une ligne en blanc bold + une ligne en italique gris
 * (effet visuel signature NAIOM). Sous-titre optionnel en gris pâle.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface CoverSectionProps {
  /** Eyebrow optionnelle en haut (ex: "GUIDE PLATEFORME — MULTI-AGENT"). */
  eyebrow?: string;
  /** Première ligne du titre (rendue en blanc bold). */
  titleLine1: string;
  /** Deuxième ligne du titre (rendue en gris italique). */
  titleLine2: string;
  /** Sous-titre optionnel sous le titre. */
  subtitle?: ReactNode;
  /** Footer optionnel (signature, date). */
  footer?: ReactNode;
  className?: string;
}

export function CoverSection({
  eyebrow,
  titleLine1,
  titleLine2,
  subtitle,
  footer,
  className,
}: CoverSectionProps) {
  return (
    <section
      className={cn(
        'relative bg-ink px-6 py-20 text-paper sm:px-12 sm:py-28',
        className
      )}
    >
      <div className="mx-auto max-w-editorial">
        {eyebrow && (
          <div className="mb-10 text-[11px] font-medium uppercase tracking-[0.22em] text-paper/60">
            {eyebrow}
          </div>
        )}

        <h1 className="font-display text-6xl font-extrabold leading-[0.92] tracking-display-tighter sm:text-7xl md:text-8xl">
          <span className="block text-paper">{titleLine1}</span>
          <span className="block italic text-paper/40">{titleLine2}</span>
        </h1>

        {subtitle && (
          <p className="mt-8 max-w-prose text-base leading-relaxed text-paper/70 sm:text-lg">
            {subtitle}
          </p>
        )}

        {footer && (
          <div className="mt-16 border-t border-paper/15 pt-6 text-xs text-paper/60">
            {footer}
          </div>
        )}
      </div>
    </section>
  );
}
