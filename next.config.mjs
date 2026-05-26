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
        // pdf-to-png-converter delegue le rendu a pdfjs-dist qui charge
        // dynamiquement les cmaps (CJK + caracteres non-latins) et les
        // polices standards via fs.readFile. Ces fichiers sont des assets
        // .bcmap / .pfb que le tracer Next.js ne detecte pas tout seul.
        // Sans cette inclusion, l'OCR plante avec "Failed to fetch cMap"
        // sur tout PDF qui n'embarque pas ses propres polices.
        './node_modules/pdfjs-dist/cmaps/**',
        './node_modules/pdfjs-dist/standard_fonts/**',
      ],
    },
  },
};

export default nextConfig;
