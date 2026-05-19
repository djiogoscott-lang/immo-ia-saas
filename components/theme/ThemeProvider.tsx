'use client';

/**
 * ThemeProvider — force la classe `dark` sur <html>.
 *
 * Choix produit : dark forcé partout, light mode désactivé. forcedTheme
 * ignore localStorage et override toute préférence système.
 */

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      forcedTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
