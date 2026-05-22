import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Inter_Tight } from 'next/font/google';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { APP_NAME } from '@/lib/branding';
import './globals.css';

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

/**
 * RootLayout — layout racine OBLIGATOIRE pour Next.js App Router.
 *
 * Tout sous-layout (ex : `app/(app)/agents/layout.tsx`) s'imbrique sous ce
 * RootLayout. Il fournit l'élément `<html>` et `<body>`, ainsi que les
 * métadonnées par défaut et les styles globaux.
 */

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Plateforme multi-agents IA pour conseillers, managers et assistantes en agence immobilière. 12 agents spécialisés (synthèse RDV, prospection, juridique, KPIs…).",
  applicationName: APP_NAME,
  keywords: [
    'immobilier',
    'IA',
    'agents',
    'conseiller',
    'prospection',
    'juridique',
  ],
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`dark ${GeistSans.variable} ${GeistMono.variable} ${interTight.variable}`}
    >
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-50 antialiased">
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            closeButton
            duration={3500}
            toastOptions={{
              classNames: {
                toast:
                  'font-sans rounded-xl border shadow-md backdrop-blur-md',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
