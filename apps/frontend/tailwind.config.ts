import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: ['class'],
  content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}','./src/components/**/*.{js,ts,jsx,tsx,mdx}','./src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: { DEFAULT:'#070B14', surface:'#0C1220', elevated:'#111827', overlay:'#162032' },
        edge:   { DEFAULT:'#1A2740', muted:'#0F1A2E', bright:'#243350' },
        critical:{ DEFAULT:'#EF4444', dim:'#7F1D1D' },
        warning: { DEFAULT:'#F59E0B', dim:'#78350F' },
        success: { DEFAULT:'#10B981', dim:'#064E3B' },
        info:    { DEFAULT:'#3B82F6', dim:'#1E3A8A' },
      },
      fontFamily: {
        display:['Syne','sans-serif'],
        sans:   ['DM Sans','sans-serif'],
        mono:   ['JetBrains Mono','monospace'],
      },
      fontSize: { '2xs':['0.65rem',{lineHeight:'1rem'}] },
      animation: {
        'pulse-slow':'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':'fadeIn 0.3s ease-out',
        'slide-up':'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn:  {'0%':{opacity:'0'},'100%':{opacity:'1'}},
        slideUp: {'0%':{transform:'translateY(12px)',opacity:'0'},'100%':{transform:'translateY(0)',opacity:'1'}},
      },
    },
  },
  plugins: [],
};
export default config;
