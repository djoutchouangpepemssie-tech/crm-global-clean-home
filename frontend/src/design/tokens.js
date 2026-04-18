/**
 * Design tokens — Atelier direction (v2.0)
 * Global Clean Home CRM
 *
 * CHANGEMENT MAJEUR vs v1.0 :
 *   - Palette : violet/rose → émeraude/terracotta sur fond crème
 *   - Typo display : Manrope → Fraunces (serif éditorial)
 *   - Neutres : gris froid → gris chauds toniques (oklch)
 *
 * Ces tokens sont consommés par tailwind.config.js + styles/tokens.css.
 * Modifier ICI en premier, propagation automatique partout.
 */

export const colors = {
  // ── Marque : émeraude profond (propreté + fraîcheur) ────────
  brand: {
    50:  '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669', // primary
    700: '#047857', // primary-hover
    800: '#065F46',
    900: '#064E3B',
  },
  // ── Accent : terracotta (chaleur, hospitality) ──────────────
  accent: {
    50:  '#FEF6F1',
    100: '#FDEAE0',
    200: '#FAD0BB',
    300: '#F4A87F',
    500: '#D97757',
    600: '#C25E40',
    700: '#A04A30',
  },
  // ── Statuts ─────────────────────────────────────────────────
  success: { 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 600: '#059669', 700: '#047857' },
  warning: { 50: '#FEFCE8', 100: '#FEF3C7', 500: '#EAB308', 600: '#CA8A04', 700: '#A16207' },
  danger:  { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#DC2626', 600: '#B91C1C', 700: '#991B1B' },
  info:    { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },

  // ── Neutres CHAUDS (fond crème éditorial) ───────────────────
  // Convertis depuis oklch en hex pour compat Tailwind.
  neutral: {
    0:   '#FFFFFF',
    50:  '#FBFAF6', // surface (papier)
    100: '#F5F2EB', // bg (crème)
    200: '#ECE7DC', // surface-2
    300: '#DBD3C2',
    400: '#A89E89',
    500: '#736B5C',
    600: '#544E43',
    700: '#3A3631',
    800: '#26241F',
    900: '#1A1814',
    950: '#0F0E0B',
  },
};

export const spacing = {
  px: '1px', 0: '0', 0.5: '2px', 1: '4px', 1.5: '6px', 2: '8px', 2.5: '10px',
  3: '12px', 4: '16px', 5: '20px', 6: '24px', 7: '28px', 8: '32px', 10: '40px',
  12: '48px', 14: '56px', 16: '64px', 20: '80px', 24: '96px', 32: '128px',
};

// Rayons plus contenus — direction éditoriale
export const radius = {
  none: '0',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '14px',
  '2xl': '18px',
  '3xl': '22px',
  full: '9999px',
};

// Ombres très douces, presque imperceptibles (style éditorial)
export const shadows = {
  xs: '0 1px 2px 0 rgba(38, 36, 31, 0.04)',
  sm: '0 1px 3px 0 rgba(38, 36, 31, 0.06), 0 1px 2px -1px rgba(38, 36, 31, 0.04)',
  md: '0 4px 8px -2px rgba(38, 36, 31, 0.06), 0 2px 4px -2px rgba(38, 36, 31, 0.03)',
  lg: '0 10px 20px -4px rgba(38, 36, 31, 0.06), 0 4px 8px -2px rgba(38, 36, 31, 0.03)',
  xl: '0 20px 32px -8px rgba(38, 36, 31, 0.08), 0 8px 16px -4px rgba(38, 36, 31, 0.03)',
  '2xl': '0 32px 64px -16px rgba(38, 36, 31, 0.12)',
  brand: '0 8px 24px -6px rgba(5, 150, 105, 0.28)',
  accent: '0 8px 24px -6px rgba(217, 119, 87, 0.28)',
  success: '0 8px 24px -6px rgba(16, 185, 129, 0.24)',
  danger: '0 8px 24px -6px rgba(220, 38, 38, 0.24)',
};

// Typo : Fraunces display + Inter body + JetBrains Mono
export const typography = {
  fontFamily: {
    display: '"Fraunces", "Instrument Serif", Georgia, serif',
    body:    '"Inter", system-ui, sans-serif',
    mono:    '"JetBrains Mono", ui-monospace, monospace',
  },
  fontSize: {
    xs: ['11px', { lineHeight: '16px', letterSpacing: '0.02em' }],
    sm: ['12px', { lineHeight: '18px' }],
    base: ['14px', { lineHeight: '22px' }],
    md: ['15px', { lineHeight: '24px' }],
    lg: ['17px', { lineHeight: '26px' }],
    xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.015em' }],
    '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
    '3xl': ['32px', { lineHeight: '38px', letterSpacing: '-0.025em' }],
    '4xl': ['44px', { lineHeight: '48px', letterSpacing: '-0.03em' }],
    '5xl': ['56px', { lineHeight: '60px', letterSpacing: '-0.035em' }],
    '6xl': ['72px', { lineHeight: '72px', letterSpacing: '-0.04em' }],
  },
  fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
};

export const motion = {
  duration: { instant: '100ms', fast: '150ms', normal: '220ms', slow: '320ms', slower: '480ms' },
  easing: {
    standard: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    snappy:   'cubic-bezier(0.4, 0, 0.2, 1)',
    soft:     'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

export const breakpoints = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' };

export const zIndex = {
  hide: -1, base: 0, docked: 10, dropdown: 1000, sticky: 1100,
  banner: 1200, overlay: 1300, modal: 1400, popover: 1500, toast: 1700, tooltip: 1800,
};

const tokens = { colors, spacing, radius, shadows, typography, motion, breakpoints, zIndex };
export default tokens;

