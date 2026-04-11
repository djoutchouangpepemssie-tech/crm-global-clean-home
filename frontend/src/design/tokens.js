/**
 * Design tokens centraux du CRM Global Clean Home.
 *
 * Un seul endroit pour définir l'identité visuelle. Tout le reste du code
 * (Tailwind config, composants, animations) consomme ces tokens.
 *
 * Convention :
 *   - Les valeurs sont des chaînes utilisables en CSS natif
 *   - Les échelles sont numériques, ordonnées du plus petit au plus grand
 *   - Les couleurs sont exposées en HEX ET en HSL (pour Tailwind + CSS vars)
 */

export const colors = {
  // Couleurs de marque — violet premium
  brand: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6', // primary
    600: '#7C3AED', // primary-hover
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  // Accent rose pour CTAs secondaires
  accent: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
  },
  // Statuts fonctionnels
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
  // Échelle neutre (gris chauds légers)
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
    950: '#0C0A09',
  },
};

/**
 * Échelle d'espacement — base 4px.
 * On suit la scale Tailwind pour compatibilité maximale.
 */
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
};

/**
 * Rayons — identité "moderne polie"
 */
export const radius = {
  none: '0',
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '18px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
};

/**
 * Ombres — douceur premium, pas de noir dur
 */
export const shadows = {
  xs: '0 1px 2px 0 rgba(28, 25, 23, 0.05)',
  sm: '0 1px 3px 0 rgba(28, 25, 23, 0.08), 0 1px 2px -1px rgba(28, 25, 23, 0.05)',
  md: '0 4px 8px -2px rgba(28, 25, 23, 0.08), 0 2px 4px -2px rgba(28, 25, 23, 0.04)',
  lg: '0 10px 20px -4px rgba(28, 25, 23, 0.08), 0 4px 8px -2px rgba(28, 25, 23, 0.04)',
  xl: '0 20px 32px -8px rgba(28, 25, 23, 0.10), 0 8px 16px -4px rgba(28, 25, 23, 0.04)',
  '2xl': '0 32px 64px -16px rgba(28, 25, 23, 0.16)',
  // Ombres colorées pour CTAs
  brand: '0 8px 24px -6px rgba(139, 92, 246, 0.32)',
  accent: '0 8px 24px -6px rgba(244, 63, 94, 0.32)',
  success: '0 8px 24px -6px rgba(16, 185, 129, 0.28)',
  danger: '0 8px 24px -6px rgba(239, 68, 68, 0.28)',
};

/**
 * Typographie — Manrope pour les titres, Inter pour le corps
 */
export const typography = {
  fontFamily: {
    display: '"Manrope", "Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  fontSize: {
    xs: ['12px', { lineHeight: '16px' }],
    sm: ['13px', { lineHeight: '20px' }],
    base: ['14px', { lineHeight: '22px' }],
    md: ['15px', { lineHeight: '24px' }],
    lg: ['17px', { lineHeight: '26px' }],
    xl: ['20px', { lineHeight: '28px' }],
    '2xl': ['24px', { lineHeight: '32px' }],
    '3xl': ['30px', { lineHeight: '38px' }],
    '4xl': ['36px', { lineHeight: '44px' }],
    '5xl': ['48px', { lineHeight: '56px' }],
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
};

/**
 * Timings et courbes d'animation — pour une sensation "premium soft"
 */
export const motion = {
  duration: {
    instant: '100ms',
    fast: '150ms',
    normal: '220ms',
    slow: '320ms',
    slower: '480ms',
  },
  easing: {
    // Pour les entrées/sorties naturelles
    standard: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    // Pour les clics et feedback immédiats
    snappy: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Pour les hovers élégants
    soft: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    // Pour les animations "spring" avec rebond léger
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

/**
 * Breakpoints responsive
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

/**
 * Z-index — une échelle discrète pour éviter les conflits
 */
export const zIndex = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  toast: 1700,
  tooltip: 1800,
};

const tokens = {
  colors,
  spacing,
  radius,
  shadows,
  typography,
  motion,
  breakpoints,
  zIndex,
};

export default tokens;
