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
      // Espace pour étendre la palette aux couleurs de la marque Nestenn
      // si besoin (ex : couleurs primaires de l'identité graphique).
    },
  },
  plugins: [],
};

export default config;
