/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme=\"dark\"]'],
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '14px', '3xl': '18px', '4xl': '22px',
      },
      colors: {
        background: 'hsl(var(--background))', foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))', input: 'hsl(var(--input))', ring: 'hsl(var(--ring))',
        brand: { 50:'#ECFDF5',100:'#D1FAE5',200:'#A7F3D0',300:'#6EE7B7',400:'#34D399',500:'#10B981',600:'#059669',700:'#047857',800:'#065F46',900:'#064E3B' },
        terracotta: { 50:'#FEF6F1',100:'#FDEAE0',200:'#FAD0BB',300:'#F4A87F',400:'#E48865',500:'#D97757',600:'#C25E40',700:'#A04A30',800:'#7E3A26',900:'#5E2B1C' },
        neutral: { 0:'#FFFFFF',50:'#FBFAF6',100:'#F5F2EB',200:'#ECE7DC',300:'#DBD3C2',400:'#A89E89',500:'#736B5C',600:'#544E43',700:'#3A3631',800:'#26241F',900:'#1A1814',950:'#0F0E0B' },
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgba(38,36,31,0.06), 0 1px 2px -1px rgba(38,36,31,0.04)',
        'card-lg': '0 10px 20px -4px rgba(38,36,31,0.06), 0 4px 8px -2px rgba(38,36,31,0.03)',
        'card-xl': '0 20px 32px -8px rgba(38,36,31,0.08), 0 8px 16px -4px rgba(38,36,31,0.03)',
        'brand':   '0 8px 24px -6px rgba(5,150,105,0.28)',
        'accent':  '0 8px 24px -6px rgba(217,119,87,0.28)',
        'success': '0 8px 24px -6px rgba(16,185,129,0.24)',
        'danger':  '0 8px 24px -6px rgba(220,38,38,0.24)',
      },
      keyframes: {
        'accordion-down': { from:{height:'0'}, to:{height:'var(--radix-accordion-content-height)'} },
        'accordion-up':   { from:{height:'var(--radix-accordion-content-height)'}, to:{height:'0'} },
        'fade-in-up':     { from:{opacity:'0',transform:'translateY(8px)'}, to:{opacity:'1',transform:'translateY(0)'} },
        'scale-in':       { from:{opacity:'0',transform:'scale(0.96)'}, to:{opacity:'1',transform:'scale(1)'} },
        'shimmer':        { '0%':{backgroundPosition:'-200% 0'}, '100%':{backgroundPosition:'200% 0'} },
        'pulse-soft':     { '0%,100%':{opacity:'1'}, '50%':{opacity:'0.6'} },
      },
      animation: {
        'accordion-down': 'accordion-down 0.22s cubic-bezier(0.4,0,0.2,1)',
        'accordion-up':   'accordion-up 0.22s cubic-bezier(0.4,0,0.2,1)',
        'fade-in-up':     'fade-in-up 0.32s cubic-bezier(0.22,0.61,0.36,1)',
        'scale-in':       'scale-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        'shimmer':        'shimmer 1.8s linear infinite',
        'pulse-soft':     'pulse-soft 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
