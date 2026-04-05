import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'gch-theme-prefs';

const DEFAULTS = {
  theme: 'dark',
  accentColor: '#8b5cf6',
  fontSize: 'medium',
  density: 'comfortable',
  animationsEnabled: true,
  roundedCorners: true,
};

const FONT_SIZE_MAP = { small: '13px', medium: '14px', large: '16px', xlarge: '18px' };
const DENSITY_MAP = { compact: '0.5rem', comfortable: '1rem', spacious: '1.5rem' };

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function resolveTheme(theme) {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return theme;
}

function applyToDOM(prefs) {
  const root = document.documentElement;
  const resolved = resolveTheme(prefs.theme);
  const rgb = hexToRgb(prefs.accentColor);

  // Theme attribute
  root.setAttribute('data-theme', resolved);

  // CSS custom properties
  root.style.setProperty('--accent-color', prefs.accentColor);
  root.style.setProperty('--accent-rgb', rgb);
  root.style.setProperty('--accent-light', `rgba(${rgb}, 0.15)`);
  root.style.setProperty('--accent-medium', `rgba(${rgb}, 0.20)`);
  root.style.setProperty('--accent-dark', `rgba(${rgb}, 0.30)`);
  root.style.setProperty('--font-size-base', FONT_SIZE_MAP[prefs.fontSize] || '14px');
  root.style.setProperty('--density-spacing', DENSITY_MAP[prefs.density] || '1rem');
  root.style.setProperty('--border-radius-base', prefs.roundedCorners ? '1rem' : '0.25rem');

  // Animations
  if (!prefs.animationsEnabled) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }
}

function loadPrefs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULTS, ...JSON.parse(stored) };
    }
  } catch (e) { /* ignore */ }
  return { ...DEFAULTS };
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) { /* ignore */ }
}

export function ThemeProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    const p = loadPrefs();
    // Apply immediately (before first paint as much as possible)
    applyToDOM(p);
    return p;
  });

  // Re-apply whenever prefs change
  useEffect(() => {
    applyToDOM(prefs);
    savePrefs(prefs);
  }, [prefs]);

  // Listen for system theme changes when mode is "auto"
  useEffect(() => {
    if (prefs.theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyToDOM(prefs);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [prefs]);

  const updateTheme = useCallback((key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  const setAllPrefs = useCallback((newPrefs) => {
    setPrefs(prev => ({ ...prev, ...newPrefs }));
  }, []);

  return (
    <ThemeContext.Provider value={{ prefs, updateTheme, setAllPrefs }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
