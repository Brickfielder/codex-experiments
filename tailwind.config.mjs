import typography from '@tailwindcss/typography';

const typographyPlugin = typography?.default ?? typography;

export default {
  darkMode: 'class',
  content: ['src/**/*.{astro,tsx,ts,jsx,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter var"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [typographyPlugin]
};
