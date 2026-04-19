// SettingsEtabli.jsx — « L'établi ».
// Identité : chapitres numérotés de 01 à 15 façon atelier d'artisan.
// Chaque section est une "station" avec son outil. Minuscules numéros en exergue,
// titres Fraunces italiques, description courte. Grille aérée, fond bois sépia clair.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Building2, Bell, Shield, Users, CreditCard, Mail, CalendarDays,
  MapPin, FileText, Zap, Key, Database, Sliders, Palette, Search, ArrowRight,
} from 'lucide-react';

/* ─────────────────── TOKENS ─────────────────── */
const tokenStyle = `
  .eta-root {
    --bg: oklch(0.965 0.012 80);
    --paper: oklch(0.975 0.014 82);
    --surface: oklch(0.985 0.008 85);
    --surface-2: oklch(0.945 0.014 78);
    --ink: oklch(0.165 0.012 60);
    --ink-2: oklch(0.32 0.012 60);
    --ink-3: oklch(0.52 0.010 60);
    --ink-4: oklch(0.72 0.008 70);
    --line: oklch(0.85 0.012 75);
    --line-2: oklch(0.92 0.010 78);
    --emerald: oklch(0.52 0.13 165);
    --emerald-soft: oklch(0.93 0.05 165);
    --sepia: oklch(0.55 0.08 65);
    --sepia-soft: oklch(0.92 0.04 65);
    --wood: oklch(0.70 0.08 55);
    --wood-deep: oklch(0.45 0.08 55);
    --gold: oklch(0.72 0.13 85);
  }
  .eta-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 80px;
  }
  .eta-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .eta-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .eta-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .eta-italic  { font-style: italic; color: var(--sepia); font-weight: 400; }

  /* Carte chapitre d'atelier */
  .eta-chapter {
    display: grid; grid-template-columns: 80px 1fr auto;
    gap: 18px; align-items: center;
    padding: 26px 28px;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 14px;
    text-decoration: none; color: var(--ink);
    position: relative; overflow: hidden;
    transition: transform .2s, box-shadow .2s, border-color .2s;
  }
  .eta-chapter::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0;
    width: 3px; background: var(--sepia);
    transform: scaleY(0); transform-origin: top;
    transition: transform .25s;
  }
  .eta-chapter:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0,0,0,0.06); border-color: var(--sepia); }
  .eta-chapter:hover::before { transform: scaleY(1); }

  .eta-chapter-num {
    font-family: 'Fraunces', serif;
    font-size: 54px; font-weight: 300; line-height: 1;
    color: var(--ink-4); letter-spacing: -0.04em;
    font-variant-numeric: oldstyle-nums tabular-nums;
    text-align: right;
  }
  .eta-chapter:hover .eta-chapter-num { color: var(--sepia); }

  .eta-chapter-arrow {
    width: 36px; height: 36px; border-radius: 999px;
    background: var(--surface-2); color: var(--ink-3);
    display: flex; align-items: center; justify-content: center;
    transition: all .2s;
  }
  .eta-chapter:hover .eta-chapter-arrow { background: var(--ink); color: var(--bg); transform: translateX(3px); }

  .eta-chapter-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: var(--sepia-soft); color: var(--sepia);
    display: flex; align-items: center; justify-content: center;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .eta-fade { animation: fadeIn .3s ease; }

  @media (max-width: 860px) {
    .eta-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .eta-header-title { font-size: 36px !important; }
    .eta-body { padding: 0 20px 40px !important; }
    .eta-grid { grid-template-columns: 1fr !important; }
    .eta-chapter { grid-template-columns: 60px 1fr auto !important; padding: 20px !important; }
    .eta-chapter-num { font-size: 40px !important; }
  }
`;

const CHAPTERS = [
  { id: 'profile',       num: '01', title: 'Profil',           sub: 'Identité et préférences personnelles',                    icon: User },
  { id: 'company',       num: '02', title: 'Entreprise',       sub: 'Raison sociale, logo, SIRET, TVA',                         icon: Building2 },
  { id: 'appearance',    num: '03', title: 'Apparence',        sub: 'Thème, couleurs, typographie, densité',                    icon: Palette },
  { id: 'notifications', num: '04', title: 'Notifications',    sub: 'Canaux et évènements surveillés',                          icon: Bell },
  { id: 'security',      num: '05', title: 'Sécurité',         sub: 'Mot de passe, 2FA, sessions actives',                      icon: Shield },
  { id: 'team',          num: '06', title: 'Équipe',           sub: 'Membres, rôles et invitations',                            icon: Users },
  { id: 'billing',       num: '07', title: 'Facturation',      sub: 'Abonnement, moyens de paiement, factures',                 icon: CreditCard },
  { id: 'email',         num: '08', title: 'Email & SMS',      sub: 'Expéditeur, templates, SMS transactionnels',               icon: Mail },
  { id: 'scheduling',    num: '09', title: 'Planning',         sub: 'Horaires, jours fériés, capacité',                         icon: CalendarDays },
  { id: 'zones',         num: '10', title: 'Zones',            sub: 'Secteurs d\'intervention et frais de déplacement',         icon: MapPin },
  { id: 'documents',     num: '11', title: 'Documents',        sub: 'Modèles devis/factures, mentions légales',                 icon: FileText },
  { id: 'integrations',  num: '12', title: 'Intégrations',     sub: 'Stripe, Google, Meta, outils tiers',                       icon: Zap },
  { id: 'api',           num: '13', title: 'API',              sub: 'Clés d\'accès et webhooks',                                icon: Key },
  { id: 'data',          num: '14', title: 'Données',          sub: 'Import, export, sauvegarde, purge',                        icon: Database },
  { id: 'advanced',      num: '15', title: 'Avancé',           sub: 'Options expérimentales et configuration technique',        icon: Sliders },
];

/* ═════════════════════ MAIN ═════════════════════ */
export default function SettingsEtabli() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = CHAPTERS.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q) || c.num.includes(q);
  });

  return (
    <div className="eta-root">
      <style>{tokenStyle}</style>

      {/* ═══════════ HEADER ═══════════ */}
      <div className="eta-header eta-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="eta-label" style={{ marginBottom: 12 }}>Paramètres · Atelier</div>
          <h1 className="eta-display eta-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            L'<em className="eta-italic">établi</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {CHAPTERS.length} chapitres pour régler l'atelier · chaque outil à sa place
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
          padding: '8px 14px', minWidth: 260,
        }}>
          <Search style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher un chapitre…"
            className="eta-mono"
            style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
          />
        </div>
      </div>

      {/* ═══════════ INTRO MANUSCRITE ═══════════ */}
      <div className="eta-body eta-fade" style={{ padding: '0 48px 24px' }}>
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--line)',
          borderRadius: 14, padding: '28px 32px',
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 30, alignItems: 'center',
        }}>
          <div>
            <div className="eta-label" style={{ marginBottom: 10 }}>Note de l'artisan</div>
            <p style={{
              fontFamily: 'Fraunces, serif', fontSize: 17, fontStyle: 'italic', lineHeight: 1.55,
              color: 'var(--ink-2)', margin: 0,
            }}>
              Ici on règle les outils avant d'ouvrir l'atelier. Du profil personnel aux
              intégrations techniques, chaque chapitre a sa place et son usage —
              numérotés pour qu'on s'y retrouve même les jours chargés.
            </p>
          </div>
          <div style={{
            width: 70, height: 70, borderRadius: 12,
            background: 'var(--sepia-soft)', border: '1px solid var(--sepia)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fraunces, serif', fontSize: 34, color: 'var(--sepia)', fontWeight: 400,
          }}>
            §
          </div>
        </div>
      </div>

      {/* ═══════════ CHAPITRES ═══════════ */}
      <div className="eta-body eta-fade" style={{ padding: '0 48px 40px' }}>
        <div className="eta-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14,
        }}>
          {filtered.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1', padding: 60, textAlign: 'center',
              background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 14,
              fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)',
            }}>
              Aucun chapitre ne correspond à « {search} ».
            </div>
          ) : (
            filtered.map((c) => (
              <a
                key={c.id}
                className="eta-chapter"
                href={`/settings/legacy?tab=${c.id}`}
                onClick={(e) => { e.preventDefault(); navigate(`/settings/legacy?tab=${c.id}`); }}
              >
                <div className="eta-chapter-num">{c.num}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div className="eta-chapter-icon">
                      <c.icon style={{ width: 16, height: 16 }} />
                    </div>
                    <div className="eta-display" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>
                      {c.title}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'Fraunces, serif', fontStyle: 'italic',
                    fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.45, paddingLeft: 46,
                  }}>
                    {c.sub}
                  </div>
                </div>
                <div className="eta-chapter-arrow">
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
