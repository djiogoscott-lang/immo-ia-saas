/**
 * DocumentLayout — wrapper qui force le mode clair éditorial localement.
 *
 * Le root layout impose encore `dark` sur <html>. Ce wrapper neutralise
 * visuellement le dark en posant un fond blanc + texte ink sur la zone qu'il
 * englobe. À utiliser pour /design-system et toutes les futures pages refondues
 * tant que le mode dark global n'est pas démantelé (Lot 2).
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface DocumentLayoutProps {
  children: ReactNode;
  className?: string;
}

export function DocumentLayout({ children, className }: DocumentLayoutProps) {
  return (
    <div
      className={cn(
        'min-h-screen bg-paper text-ink',
        'font-sans antialiased',
        className
      )}
    >
      {children}
    </div>
  );
}
