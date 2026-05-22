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
      // OCR pipeline : ces packages contiennent des binaires natifs (.node)
      // que Webpack ne sait pas bundler. Les marquer external les laisse
      // chargés via require() au runtime Node.
      'pdf-to-png-converter',
      '@napi-rs/canvas',
      'pdf-parse',
    ],

    // Sur Vercel (build serverless lambda), on doit explicitement inclure les
    // binaires natifs Linux x64 dans le bundle de la lambda /api/agent-files/upload
    // sinon ils sont elagues a la trace.
    outputFileTracingIncludes: {
      '/api/agent-files/upload': [
        './node_modules/@napi-rs/canvas-linux-x64-gnu/**',
        './node_modules/@napi-rs/canvas-linux-x64-musl/**',
        './node_modules/pdf-to-png-converter/**',
      ],
    },
  },
};

export default nextConfig;
