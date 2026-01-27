import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'sovereign-green': '#0B5D3B',
        'hazard-yellow': '#F2B705',
        'landfill-black': '#0B0E0C',
        'dark-green-bg': '#0D1410',
        'concrete': '#2E3532',
        'slime': '#3CFF8F',
        'profit': '#2EEB7F',
        'loss': '#E5484D',
        'warning': '#FF8C42',
      },
    },
  },
  plugins: [],
};

export default config;
