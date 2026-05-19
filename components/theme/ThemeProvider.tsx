'use client';

/**
 * ThemeProvider — wrapper next-themes qui injecte la classe `dark` sur <html>.
 *
 * Configuration : dark forcé par défaut, mais l'utilisateur peut basculer
 * via <ThemeToggle>. La préférence est persistée dans localStorage.
 */

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps, ReactNode } from 'react';

type NextThemesProps = ComponentProps<typeof NextThemesProvider>;

interface ThemeProviderProps {
  children: ReactNode;
  attribute?: NextThemesProps['attribute'];
  defaultTheme?: string;
  enableSystem?: boolean;
}

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'dark',
  enableSystem = false,
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
