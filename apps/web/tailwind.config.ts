import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {},
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('portrait', '@media (orientation: portrait)');
      addVariant('landscape', '@media (orientation: landscape)');
    }),
  ],
};

export default config;
