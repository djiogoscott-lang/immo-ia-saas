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
      },
      letterSpacing: {
        'display-tight': '-0.04em',
        'display-tighter': '-0.05em',
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
