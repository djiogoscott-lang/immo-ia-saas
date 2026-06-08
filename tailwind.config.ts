import type { Config } from 'tailwindcss';

/**
 * Configuration Tailwind CSS.
 *
 * `content` doit couvrir TOUS les fichiers qui contiennent des classes
 * Tailwind, sinon le purge supprime les classes utilisées dynamiquement
 * (ex : conditions sur classes générées au runtime).
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
        display: ['var(--font-display)', 'var(--font-sans)'],
      },
      colors: {
        // Palette éditoriale NAIOM-like (utilisée uniquement par les composants /editorial)
        ink: {
          DEFAULT: '#0a0a0a',
          soft: '#1a1a1a',
          muted: '#525252',
          subtle: '#a3a3a3',
          line: '#e5e5e5',
        },
        paper: {
          DEFAULT: '#ffffff',
          soft: '#fafafa',
          muted: '#f5f5f5',
        },
        accent: {
          DEFAULT: '#ea580c', // orange brûlé
          dark: '#c2410c',
          soft: '#fed7aa',
        },
        // Palette Vercel (DESIGN.md) — tokens d'inspiration pour les
        // composants modernes Linear/Vercel-like (Landing, AgentGrid, AgentWorkspace).
        vercel: {
          link: '#0070f3',              // bleu signature liens
          'link-deep': '#0761d1',
          cyan: '#50e3c2',              // mint-cyan, stop gradient develop
          'cyan-deep': '#29bc9b',
          violet: '#7928ca',            // deep purple, stop gradient preview
          'violet-deep': '#4c2889',
          pink: '#ff0080',              // magenta vif, stop gradient preview
          magenta: '#eb367f',
          // Gradient develop : bleu -> cyan
          'develop-start': '#007cf0',
          'develop-end': '#00dfd8',
          // Gradient preview : violet -> magenta (le plus iconique)
          'preview-start': '#7928ca',
          'preview-end': '#ff0080',
          // Gradient ship : rouge -> jaune
          'ship-start': '#ff4d4d',
          'ship-end': '#f9cb28',
        },
      },
      letterSpacing: {
        'display-tight': '-0.04em',
        'display-tighter': '-0.05em',
        // Letter-spacings derives de DESIGN.md (px -> em) :
        //   display-xl (48px)  -2.4px  -> -0.05em  -> tracking-vercel-hero
        //   display-lg (32px)  -1.28px -> -0.04em  -> tracking-vercel-display
        //   display-md (24px)  -0.96px -> -0.04em  -> tracking-vercel-display
        //   display-sm (20px)  -0.6px  -> -0.03em  -> tracking-vercel-display-sm
        //   body-sm    (14px)  -0.28px -> -0.02em  -> tracking-vercel-body-sm
        'vercel-hero': '-0.05em',
        'vercel-display': '-0.04em',
        'vercel-display-sm': '-0.03em',
        'vercel-body-sm': '-0.02em',
      },
      backgroundImage: {
        // Gradients Vercel pretes-a-l'emploi
        'gradient-develop': 'linear-gradient(90deg, #007cf0 0%, #00dfd8 100%)',
        'gradient-preview': 'linear-gradient(90deg, #7928ca 0%, #ff0080 100%)',
        'gradient-ship': 'linear-gradient(90deg, #ff4d4d 0%, #f9cb28 100%)',
        // Mesh gradient signature Vercel (multi-stop atmospheric)
        'gradient-mesh-vercel':
          'radial-gradient(ellipse at 20% 30%, rgba(121,40,202,0.35) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(0,112,243,0.30) 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, rgba(255,0,128,0.28) 0%, transparent 50%), radial-gradient(ellipse at 30% 70%, rgba(80,227,194,0.20) 0%, transparent 50%)',
      },
      maxWidth: {
        prose: '68ch',
        editorial: '880px',
      },
    },
  },
  plugins: [],
};

export default config;
