import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: ['class'],
  content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}','./src/components/**/*.{js,ts,jsx,tsx,mdx}','./src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: { DEFAULT:'#060910', surface:'#0B0F1A', elevated:'#101625', overlay:'#151C30' },
        edge:   { DEFAULT:'#1A2240', muted:'#0F1528', bright:'#243350' },
        critical:{ DEFAULT:'#EF4444', dim:'#7F1D1D' },
        warning: { DEFAULT:'#F59E0B', dim:'#78350F' },
        success: { DEFAULT:'#10B981', dim:'#064E3B' },
        info:    { DEFAULT:'#6366F1', dim:'#312E81' },
      },
      fontFamily: {
        display:['Syne','system-ui','sans-serif'],
        sans:   ['DM Sans','system-ui','sans-serif'],
        mono:   ['JetBrains Mono','Menlo','monospace'],
      },
      fontSize: { '2xs':['0.65rem',{lineHeight:'1rem'}] },
      borderRadius: { card:'12px' },
      boxShadow: {
        card:'0 1px 3px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.02)',
        'card-hover':'0 4px 24px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.03)',
        dropdown:'0 8px 40px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.03)',
      },
      animation: {
        'pulse-slow':'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':'fadeIn 0.35s ease-out both',
        'slide-up':'slideUp 0.45s ease-out both',
        'scale-in':'scaleIn 0.3s ease-out both',
        'count-up':'countUp 0.5s ease-out both',
        'spin-slow':'spin 8s linear infinite',
      },
      keyframes: {
        fadeIn:  {'0%':{opacity:'0',transform:'translateY(6px)'},'100%':{opacity:'1',transform:'translateY(0)'}},
        slideUp: {'0%':{opacity:'0',transform:'translateY(14px)'},'100%':{opacity:'1',transform:'translateY(0)'}},
        scaleIn: {'0%':{opacity:'0',transform:'scale(0.95)'},'100%':{opacity:'1',transform:'scale(1)'}},
        countUp: {'0%':{opacity:'0',transform:'translateY(6px)',filter:'blur(3px)'},'100%':{opacity:'1',transform:'translateY(0)',filter:'blur(0)'}},
      },
    },
  },
  plugins: [],
};
export default config;
