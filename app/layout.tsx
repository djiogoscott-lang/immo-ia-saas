import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

import { APP_NAME } from '@/lib/branding';
import './globals.css';

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
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          duration={3500}
          toastOptions={{
            classNames: {
              toast:
                'font-sans rounded-xl border shadow-md',
            },
          }}
        />
      </body>
    </html>
  );
}
