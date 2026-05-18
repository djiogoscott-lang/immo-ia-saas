/**
 * Configuration Next.js — Nestenn IA V2 (multi-agents).
 *
 * Volontairement minimal : on ajoute des options uniquement quand un besoin
 * concret apparaît (ex : `images.remotePatterns` quand on hostera des photos
 * de boîtes aux lettres ou de biens sur un CDN tiers).
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Les routes API du chat et du router doivent toujours être dynamiques (streaming).
  // Pas besoin de config explicite : `export const dynamic = 'force-dynamic'`
  // est déjà déclaré dans chaque route.ts.

  // Les paquets externes utilisés côté serveur (AI SDK + OpenRouter) doivent
  // être préservés (ne pas être bundlés agressivement).
  experimental: {
    serverComponentsExternalPackages: [
      '@openrouter/ai-sdk-provider',
      'ai',
    ],
  },
};

export default nextConfig;
