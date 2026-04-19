// MagazineShell.jsx — enveloppe magazine générique.
// Fournit un header uniforme (label + titre Fraunces + sous-titre italique)
// et les tokens atelier, puis rend l'ancienne page en dessous comme contenu.
// Utile pour les pages complexes qu'on ne peut pas refondre entièrement
// (Map, Director, Workflows, etc.) : on leur donne tout de même une
// identité visuelle cohérente avec le reste du magazine.

import React from 'react';

const tokenStyle = `
  .mag-shell {
    --bg: oklch(0.965 0.012 80);
    --surface: oklch(0.985 0.008 85);
    --surface-2: oklch(0.945 0.014 78);
    --ink: oklch(0.165 0.012 60);
    --ink-2: oklch(0.32 0.012 60);
    --ink-3: oklch(0.52 0.010 60);
    --line: oklch(0.85 0.012 75);
    --line-2: oklch(0.92 0.010 78);
  }
  .mag-shell {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
  }
  .mag-shell-header {
    padding: 40px 48px 24px; display: flex; align-items: flex-end;
    justify-content: space-between; gap: 24px; flex-wrap: wrap;
    border-bottom: 1px solid var(--line-2);
    background: var(--bg);
  }
  .mag-shell-label {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--ink-3); font-weight: 500;
    margin-bottom: 12px;
  }
  .mag-shell-title {
    font-family: 'Fraunces', serif; letter-spacing: -0.02em;
    font-size: 56px; font-weight: 300; line-height: 0.95;
    margin: 0 0 6px; color: var(--ink);
  }
  .mag-shell-title em {
    font-style: italic; font-weight: 400;
  }
  .mag-shell-sub {
    font-family: 'Fraunces', serif; font-style: italic;
    font-size: 15px; color: var(--ink-3);
  }
  /* Le contenu legacy hérite du fond neutre atelier */
  .mag-shell-content {
    background: var(--bg);
  }

  @keyframes magFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .mag-shell-fade { animation: magFadeIn .3s ease; }

  @media (max-width: 960px) {
    .mag-shell-header { padding: 18px 20px !important; }
    .mag-shell-title { font-size: 36px !important; }
  }
`;

/**
 * MagazineShell
 * @param label      — petite étiquette en haut (ex: "Marketing · Campagnes")
 * @param title      — titre principal. Peut inclure un <em> pour l'accent italique.
 *                     Ex: "Le <em>tableau</em> d'affichage"
 * @param subtitle   — sous-titre italique court
 * @param accent     — couleur de l'accent italique (CSS couleur, ex: "oklch(.52 .13 165)")
 * @param actions    — élément ReactNode à afficher à droite du header
 * @param children   — contenu de la page
 */
export default function MagazineShell({ label, title, subtitle, accent, actions, children }) {
  // Permet de passer une string HTML simple ou du JSX
  const renderTitle = () => {
    if (typeof title === 'string') {
      // Remplace <em>...</em> en jsx
      const parts = title.split(/(<em>[^<]*<\/em>)/g);
      return parts.map((p, i) => {
        const m = p.match(/^<em>([^<]*)<\/em>$/);
        if (m) return <em key={i} style={{ color: accent || 'oklch(0.52 0.13 165)' }}>{m[1]}</em>;
        return <React.Fragment key={i}>{p}</React.Fragment>;
      });
    }
    return title;
  };

  return (
    <div className="mag-shell">
      <style>{tokenStyle}</style>
      <div className="mag-shell-header mag-shell-fade">
        <div style={{ flex: 1, minWidth: 280 }}>
          {label && <div className="mag-shell-label">{label}</div>}
          <h1 className="mag-shell-title">{renderTitle()}</h1>
          {subtitle && <div className="mag-shell-sub">{subtitle}</div>}
        </div>
        {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
      </div>
      <div className="mag-shell-content">
        {children}
      </div>
    </div>
  );
}
