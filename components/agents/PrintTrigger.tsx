'use client';

/**
 * PrintTrigger — déclenche window.print() au montage.
 *
 * Utilisé sur les pages `/print` pour ouvrir automatiquement le dialog
 * Save as PDF du navigateur. Sécurité : on attend 200ms que le DOM soit
 * complètement rendu (sinon le print peut capturer un état intermédiaire).
 */

import { useEffect } from 'react';

export function PrintTrigger() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
