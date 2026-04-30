import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import {
  ChevronRight, ChevronDown, ChevronUp, Plus, Trash2, Sparkles,
  MapPin, Check, AlertTriangle, Save, Send, Mail, Eye, Navigation,
  X, ArrowLeft, Loader, Clock, FileText,
} from 'lucide-react';

/**
 * QuoteForm — Wizard 4 étapes artisanal atelier.
 *
 * Étapes : 1 Client · 2 Prestations · 3 Conditions · 4 Récapitulatif
 * Générateur IA dashed émeraude (description → postes)
 * Alerte IA oublis (bandeau or)
 * Postes groupés expandables avec inputs inline
 * Sidebar sticky : Totaux · Probabilité signature 87% · Client · Similaires
 * Footbar ink avec sauvegarde auto
 *
 * API : POST /api/quotes · GET /api/leads · GET /api/quotes (similaires)
 * Fallbacks inline complets.
 */

/* ─── CSS tokens ───────────────────────────────────────────────── */
const tokenStyle = `
  .qf-root {
    --bg: oklch(0.965 0.012 80);
    --surface: oklch(0.985 0.008 85);
    --surface-2: oklch(0.945 0.014 78);
    --ink: oklch(0.165 0.012 60);
    --ink-2: oklch(0.32 0.012 60);
    --ink-3: oklch(0.52 0.010 60);
    --ink-4: oklch(0.72 0.008 70);
    --line: oklch(0.85 0.012 75);
    --line-2: oklch(0.92 0.010 78);
    --accent: oklch(0.52 0.13 165);
    --accent-soft: oklch(0.93 0.05 165);
    --warm: oklch(0.62 0.14 45);
    --warm-soft: oklch(0.94 0.05 45);
    --gold: oklch(0.72 0.13 85);
    --gold-soft: oklch(0.95 0.05 85);
    --cool: oklch(0.60 0.10 220);
    --cool-soft: oklch(0.94 0.04 220);
  }
  .qf-root {
    background: var(--bg);
    min-height: 100vh;
    color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    font-feature-settings: "ss01", "cv11";
    -webkit-font-smoothing: antialiased;
    padding-bottom: 80px;
  }
  .qf-display { font-family: 'Fraunces', serif; font-weight: 400; letter-spacing: -0.02em; }
  .qf-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .qf-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); font-weight: 500; }

  .qf-step-dot {
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700;
    transition: all .2s;
    flex-shrink: 0;
  }
  .qf-step-dot-done    { background: var(--accent); color: white; }
  .qf-step-dot-active  { background: var(--ink); color: var(--bg); }
  .qf-step-dot-pending { background: var(--surface-2); color: var(--ink-4); border: 1.5px solid var(--line); }

  .qf-field {
    background: var(--surface);
    border: 1.5px solid var(--line);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 14px;
    color: var(--ink);
    outline: none;
    transition: border .15s, box-shadow .15s;
    width: 100%;
    font-family: inherit;
  }
  .qf-field:focus { border-color: var(--accent); box-shadow: 0 0 0 3px oklch(0.52 0.13 165 / 0.1); }
  .qf-field::placeholder { color: var(--ink-4); }
  select.qf-field { cursor: pointer; }

  .qf-ai-panel {
    border: 2px dashed var(--accent);
    border-radius: 14px;
    background: var(--accent-soft);
    padding: 20px;
  }

  .qf-gold-alert {
    background: var(--gold-soft);
    border: 1.5px solid var(--gold);
    border-radius: 10px;
    padding: 12px 16px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .qf-poste-row {
    display: grid;
    grid-template-columns: 1fr 80px 80px 90px 32px;
    gap: 8px;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--line-2);
  }
  .qf-poste-row:last-child { border-bottom: none; }

  .qf-sidebar {
    position: sticky;
    top: 24px;
    width: 300px;
    flex-shrink: 0;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
    padding-right: 4px;
  }
  .qf-sidebar::-webkit-scrollbar { width: 6px; }
  .qf-sidebar::-webkit-scrollbar-thumb { background: var(--line); border-radius: 3px; }
  .qf-sidebar-card {
    background: var(--surface);
    border: 1.5px solid var(--line);
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 12px;
  }
  .qf-sidebar-card.compact { padding: 12px 14px; }
  .qf-sidebar-card.tinted { background: var(--accent-soft); border-color: oklch(0.75 0.08 165); }
  .qf-stat-mini {
    display: flex; align-items: baseline; gap: 6px;
    padding: 6px 0;
    border-bottom: 1px dashed var(--line-2);
  }
  .qf-stat-mini:last-child { border-bottom: 0; }
  .qf-stat-mini-icon { width: 16px; height: 16px; color: var(--ink-3); flex-shrink: 0; }
  .qf-brief-row {
    display: flex; gap: 6px; align-items: flex-start;
    padding: 5px 0;
    font-size: 11px; color: var(--ink-2);
    line-height: 1.4;
  }
  .qf-brief-emoji { font-size: 12px; flex-shrink: 0; line-height: 1.4; }

  .qf-proba-bar {
    height: 8px;
    border-radius: 9999px;
    background: var(--surface-2);
    overflow: hidden;
    margin: 8px 0 4px;
  }
  .qf-proba-fill {
    height: 100%;
    border-radius: 9999px;
    background: linear-gradient(90deg, var(--accent), oklch(0.62 0.15 165));
    transition: width .6s cubic-bezier(.16, 1, .3, 1);
  }

  .qf-footbar {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: var(--ink);
    color: var(--bg);
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    z-index: 100;
    box-shadow: 0 -4px 24px oklch(0.165 0.012 60 / 0.2);
  }
  .qf-footbar-btn {
    padding: 9px 20px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all .15s;
    display: flex;
    align-items: center;
    gap: 6px;
    border: none;
  }
  .qf-footbar-btn-ghost {
    background: transparent;
    color: oklch(0.72 0.008 70);
    border: 1.5px solid oklch(0.35 0.012 60);
  }
  .qf-footbar-btn-ghost:hover { background: oklch(0.25 0.012 60); color: var(--bg); }
  .qf-footbar-btn-primary { background: var(--accent); color: white; }
  .qf-footbar-btn-primary:hover { opacity: 0.9; }
  .qf-footbar-btn-secondary {
    background: oklch(0.28 0.012 60);
    color: var(--bg);
    border: 1.5px solid oklch(0.35 0.012 60);
  }
  .qf-footbar-btn-secondary:hover { background: oklch(0.35 0.012 60); }

  .qf-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--surface-2);
    border-radius: 8px;
    cursor: pointer;
    transition: background .1s;
    margin-bottom: 2px;
  }
  .qf-group-header:hover { background: var(--line); }

  .qf-btn-sm {
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid var(--line);
    background: var(--surface);
    color: var(--ink-2);
    display: flex; align-items: center; gap: 5px;
    transition: all .15s;
  }
  .qf-btn-sm:hover { border-color: var(--ink-3); color: var(--ink); }
  .qf-btn-accent { background: var(--accent); color: white; border-color: var(--accent); }
  .qf-btn-accent:hover { opacity: 0.85; }

  .qf-section {
    background: var(--surface);
    border: 1.5px solid var(--line);
    border-radius: 14px;
    padding: 24px;
    margin-bottom: 20px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .qf-fadein { animation: fadeIn .25s ease; }

  /* Responsive : mobile (≤ 768px) */
  @media (max-width: 768px) {
    .qf-layout { flex-direction: column !important; padding: 14px !important; gap: 14px !important; }
    .qf-sidebar { position: static !important; width: 100% !important; }
    .qf-section { padding: 16px !important; }
    .qf-poste-row { grid-template-columns: 1fr 60px 70px 70px 30px !important; gap: 4px !important; font-size: 12px !important; }
    .qf-footbar { padding: 10px 12px !important; gap: 6px !important; }
    .qf-footbar-btn { padding: 8px 12px !important; font-size: 11px !important; }
    .qf-stepper-row { overflow-x: auto !important; padding: 12px 14px !important; }
    .qf-step-label { display: none !important; }
  }
`;

/* ─── Demo data ────────────────────────────────────────────────── */
const DEMO_LEADS = [];
const DEMO_SIMILAR = [];

const SERVICE_SUGGESTIONS = [
  { label: 'Ménage régulier (2h/semaine)',        unit: 'mois',    price: 320 },
  { label: 'Nettoyage après travaux',             unit: 'forfait', price: 1200 },
  { label: 'Grand ménage annuel',                 unit: 'forfait', price: 480 },
];

const OUBLIS_IA = [
  'TVA non renseignée — précisez 20% ou micro-prestataire',
  'Frais de déplacement non inclus',
  'Délai de paiement non spécifié (30j recommandé)',
];

/* ─── Services proposés (alignés avec SERVICE_TYPES du backend) ─── */
const SERVICE_TYPES = [
  'Ménage', 'Canapé', 'Matelas', 'Tapis', 'Bureaux',
  'Vitres', 'Fin de chantier', 'Déménagement', 'Autre',
];

/* ─── TVA : taux autorisés en France + parsing sûr (0 reste 0) ─── */
const TVA_RATES = [
  { value: 0,   label: '0% — Exonéré / Art. 293B CGI' },
  { value: 5.5, label: '5,5% — Travaux logements anciens' },
  { value: 10,  label: '10% — Travaux d\'amélioration' },
  { value: 20,  label: '20% — Standard' },
];

function parseTva(v, fallback = 20) {
  if (v === 0 || v === '0') return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

/* ─── Helpers ──────────────────────────────────────────────────── */
function fmtEur(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n || 0);
}
function newPoste(label = '') {
  return { id: Date.now() + Math.random(), label, qty: 1, unit: 'forfait', price: 0 };
}
function newGroup(name = 'Nouveau groupe') {
  return { id: Date.now(), name, expanded: true, postes: [newPoste()] };
}

/* ─── Presets prestations : champs contextuels par type de service ── */
const SERVICE_PRESETS = {
  'Ménage': {
    label: 'Ménage à domicile',
    fields: [
      { key: 'surface',    label: 'Surface (m²)',       type: 'number',  placeholder: 'Ex: 75', min: 0 },
      { key: 'pieces',     label: 'Nombre de pièces',   type: 'number',  placeholder: 'Ex: 3', min: 0 },
      { key: 'etat',       label: 'État du logement',   type: 'select',  options: ['Propre (entretien régulier)', 'Normal', 'Très sale (grand ménage)'] },
      { key: 'frequence',  label: 'Fréquence',          type: 'select',  options: ['Unique', 'Hebdomadaire', 'Bimensuelle', 'Mensuelle'] },
      { key: 'duree_h',    label: 'Durée estimée (h)',  type: 'number',  placeholder: 'Ex: 3', step: 0.5, min: 0 },
    ],
    // Calcule qty + price à partir des champs
    buildPostes: (v) => {
      const surface = Number(v.surface) || 0;
      const pieces  = Number(v.pieces) || 0;
      const duree   = Number(v.duree_h) || Math.max(1, Math.ceil(surface / 30));
      const etatMul = v.etat?.startsWith('Très') ? 1.4 : v.etat?.startsWith('Propre') ? 0.9 : 1;
      const pxH = 28 * etatMul;
      const postes = [{
        label: `Ménage ${pieces ? pieces + ' pièce' + (pieces > 1 ? 's' : '') : ''}${surface ? ' · ' + surface + ' m²' : ''} (${v.etat || 'Normal'})`,
        qty: duree, unit: 'heure', price: pxH,
      }];
      if (v.frequence && v.frequence !== 'Unique') {
        postes.push({ label: `Forfait déplacement · ${v.frequence.toLowerCase()}`, qty: 1, unit: 'forfait', price: 12 });
      }
      return postes;
    },
  },
  'Nettoyage bureaux': {
    label: 'Nettoyage de bureaux',
    fields: [
      { key: 'surface_bur',   label: 'Surface (m²)',          type: 'number',  placeholder: 'Ex: 200', min: 0 },
      { key: 'postes',        label: 'Nombre de postes',      type: 'number',  placeholder: 'Ex: 15', min: 0 },
      { key: 'frequence_bur', label: 'Fréquence',             type: 'select',  options: ['3 fois/semaine', '2 fois/semaine', '1 fois/semaine', 'Quotidien', 'Unique'] },
      { key: 'espaces',       label: 'Espaces inclus',        type: 'multiselect', options: ['Open-space', 'Bureaux fermés', 'Salle de réunion', 'Cuisine / kitchenette', 'Sanitaires', 'Accueil / hall', 'Couloirs'] },
      { key: 'vitres_bur',    label: 'Vitres incluses ?',     type: 'select',  options: ['Non', 'Intérieures', 'Int. + extérieures'] },
    ],
    buildPostes: (v) => {
      const surface = Number(v.surface_bur) || 0;
      const px_m2 = 0.9; // EUR/m² moyen
      const postes = [{
        label: `Nettoyage bureaux · ${v.frequence_bur || '1 fois/semaine'}`,
        qty: surface, unit: 'm²', price: px_m2,
      }];
      if (Array.isArray(v.espaces) && v.espaces.length > 0) {
        postes[0].label += ' (' + v.espaces.join(' · ') + ')';
      }
      if (v.vitres_bur && v.vitres_bur !== 'Non') {
        postes.push({ label: `Nettoyage vitres · ${v.vitres_bur}`, qty: 1, unit: 'forfait', price: v.vitres_bur.includes('extérieur') ? 120 : 65 });
      }
      return postes;
    },
  },
  'Canapé': {
    label: 'Nettoyage canapé',
    fields: [
      { key: 'nb_canapes', label: 'Nombre de canapés', type: 'number', placeholder: 'Ex: 2', min: 1 },
      { key: 'places',     label: 'Places au total',   type: 'number', placeholder: 'Ex: 5', min: 1 },
      { key: 'matiere',    label: 'Matière',           type: 'select', options: ['Tissu', 'Cuir', 'Microfibre', 'Alcantara', 'Autre'] },
      { key: 'etat_cana',  label: 'État',              type: 'select', options: ['Léger', 'Normal', 'Très encrassé'] },
    ],
    buildPostes: (v) => {
      const places = Number(v.places) || Number(v.nb_canapes) * 3;
      const pxPlace = v.matiere === 'Cuir' ? 45 : 35;
      const mul = v.etat_cana === 'Très encrassé' ? 1.35 : v.etat_cana === 'Léger' ? 0.85 : 1;
      return [{
        label: `Nettoyage canapé · ${v.matiere || 'tissu'}${v.nb_canapes ? ' · ' + v.nb_canapes + ' canapé' + (v.nb_canapes > 1 ? 's' : '') : ''}`,
        qty: places, unit: 'visite', price: Math.round(pxPlace * mul),
      }];
    },
  },
  'Matelas': {
    label: 'Nettoyage matelas',
    fields: [
      { key: 'nb_matelas', label: 'Nombre de matelas', type: 'number', placeholder: 'Ex: 2', min: 1 },
      { key: 'taille',     label: 'Taille moyenne',    type: 'select', options: ['1 place (90cm)', '2 places (140cm)', 'Queen (160cm)', 'King (180cm)', 'Super King (200cm)'] },
      { key: 'traitement', label: 'Traitement',        type: 'multiselect', options: ['Aspiration poussière', 'Désinfection acariens', 'Détachage', 'Désodorisation'] },
    ],
    buildPostes: (v) => {
      const nb = Number(v.nb_matelas) || 1;
      const mulTaille = v.taille?.includes('Super') ? 1.6 : v.taille?.includes('King') ? 1.4 : v.taille?.includes('Queen') ? 1.2 : v.taille?.includes('2 places') ? 1.0 : 0.8;
      const base = 55 * mulTaille;
      return [{
        label: `Nettoyage matelas · ${v.taille || '2 places'}${v.traitement?.length ? ' (' + v.traitement.join(', ') + ')' : ''}`,
        qty: nb, unit: 'unité', price: Math.round(base),
      }];
    },
  },
  'Tapis': {
    label: 'Nettoyage tapis',
    fields: [
      { key: 'nb_tapis',    label: 'Nombre de tapis', type: 'number', placeholder: 'Ex: 3', min: 1 },
      { key: 'surface_tapis', label: 'Surface totale (m²)', type: 'number', placeholder: 'Ex: 12', min: 0 },
      { key: 'fibre',       label: 'Fibre',           type: 'select',  options: ['Synthétique', 'Laine', 'Soie', 'Mixte'] },
    ],
    buildPostes: (v) => {
      const m2 = Number(v.surface_tapis) || (Number(v.nb_tapis) || 1) * 3;
      const pxM2 = v.fibre === 'Soie' ? 35 : v.fibre === 'Laine' ? 22 : 15;
      return [{
        label: `Nettoyage tapis · ${v.fibre || 'synthétique'} (${v.nb_tapis || 1} unité${(v.nb_tapis || 1) > 1 ? 's' : ''})`,
        qty: m2, unit: 'm²', price: pxM2,
      }];
    },
  },
  'Vitres': {
    label: 'Nettoyage vitres',
    fields: [
      { key: 'surface_vitres', label: 'Surface (m²)',   type: 'number', placeholder: 'Ex: 30', min: 0 },
      { key: 'face',           label: 'Face(s)',         type: 'select', options: ['Intérieures', 'Extérieures', 'Intérieur + extérieur'] },
      { key: 'acces',          label: 'Accès',           type: 'select', options: ['Normal', 'Hauteur (nacelle)', 'Très difficile'] },
    ],
    buildPostes: (v) => {
      const m2 = Number(v.surface_vitres) || 0;
      let px = 6;
      if (v.face?.includes('+')) px = 10;
      if (v.acces?.includes('Hauteur')) px *= 1.5;
      if (v.acces?.includes('difficile')) px *= 2;
      return [{
        label: `Nettoyage vitres · ${v.face || 'intérieures'}${v.acces && v.acces !== 'Normal' ? ' (' + v.acces.toLowerCase() + ')' : ''}`,
        qty: m2, unit: 'm²', price: Math.round(px * 100) / 100,
      }];
    },
  },
  'Fin de chantier': {
    label: 'Nettoyage fin de chantier',
    fields: [
      { key: 'surface_ch',   label: 'Surface (m²)',         type: 'number',  placeholder: 'Ex: 120', min: 0 },
      { key: 'niveau_ch',    label: 'Niveau de salissure',  type: 'select',  options: ['Léger (poussière)', 'Normal', 'Gros œuvre (plâtre, peinture)'] },
      { key: 'urgence',      label: 'Urgence',              type: 'select',  options: ['Planifié', 'Sous 48h', 'Le jour même (+30%)'] },
    ],
    buildPostes: (v) => {
      const m2 = Number(v.surface_ch) || 0;
      let px = 7;
      if (v.niveau_ch?.includes('Gros œuvre')) px = 14;
      else if (v.niveau_ch?.includes('Léger')) px = 5;
      if (v.urgence?.includes('+30%')) px *= 1.3;
      return [{
        label: `Nettoyage fin de chantier · ${v.niveau_ch || 'normal'}`,
        qty: m2, unit: 'm²', price: Math.round(px * 100) / 100,
      }];
    },
  },
  'Déménagement': {
    label: 'Nettoyage déménagement',
    fields: [
      { key: 'surface_dem', label: 'Surface (m²)', type: 'number', placeholder: 'Ex: 70', min: 0 },
      { key: 'type_dem',    label: 'Type',         type: 'select', options: ['Entrée (logement récupéré)', 'Sortie (restitution)', 'Entrée + sortie'] },
      { key: 'meublé',      label: 'Logement',     type: 'select', options: ['Vide', 'Partiellement meublé', 'Meublé'] },
    ],
    buildPostes: (v) => {
      const m2 = Number(v.surface_dem) || 0;
      let px = 8;
      if (v.type_dem?.includes('+')) px = 14;
      if (v.meublé === 'Meublé') px *= 1.2;
      return [{
        label: `Nettoyage déménagement · ${v.type_dem || 'sortie'}`,
        qty: m2, unit: 'm²', price: Math.round(px * 100) / 100,
      }];
    },
  },
};

function matchPreset(serviceType) {
  if (!serviceType) return null;
  const k = serviceType.toString();
  // Essaye match exact d'abord, puis par mot-clé
  if (SERVICE_PRESETS[k]) return { key: k, preset: SERVICE_PRESETS[k] };
  const lower = k.toLowerCase();
  if (lower.includes('bureau')) return { key: 'Nettoyage bureaux', preset: SERVICE_PRESETS['Nettoyage bureaux'] };
  if (lower.includes('canap')) return { key: 'Canapé', preset: SERVICE_PRESETS['Canapé'] };
  if (lower.includes('matela')) return { key: 'Matelas', preset: SERVICE_PRESETS['Matelas'] };
  if (lower.includes('tapis')) return { key: 'Tapis', preset: SERVICE_PRESETS['Tapis'] };
  if (lower.includes('vitre')) return { key: 'Vitres', preset: SERVICE_PRESETS['Vitres'] };
  if (lower.includes('chantier')) return { key: 'Fin de chantier', preset: SERVICE_PRESETS['Fin de chantier'] };
  if (lower.includes('déménag') || lower.includes('demenag')) return { key: 'Déménagement', preset: SERVICE_PRESETS['Déménagement'] };
  if (lower.includes('ménage') || lower.includes('menage')) return { key: 'Ménage', preset: SERVICE_PRESETS['Ménage'] };
  return null;
}

/* ─── Stepper ──────────────────────────────────────────────────── */
const STEPS = [
  { n: 1, label: 'Client',        sub: 'Sélection du prospect' },
  { n: 2, label: 'Prestations',   sub: 'Détail des postes' },
  { n: 3, label: 'Conditions',    sub: 'Délais · paiement' },
  { n: 4, label: 'Récapitulatif', sub: 'Vérification finale' },
];

function Stepper({ current }) {
  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '20px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', maxWidth: 700 }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className={`qf-step-dot ${s.n < current ? 'qf-step-dot-done' : s.n === current ? 'qf-step-dot-active' : 'qf-step-dot-pending'}`}>
                {s.n < current ? <Check style={{ width: 14, height: 14 }} /> : s.n}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.n === current ? 'var(--ink)' : s.n < current ? 'var(--accent)' : 'var(--ink-4)' }}>{s.label}</div>
                <div className="qf-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{s.sub}</div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1.5, background: i < current - 1 ? 'var(--accent)' : 'var(--line)', margin: '0 12px', minWidth: 24 }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 1 : Client ──────────────────────────────────────────── */
function Step1Client({ data, setData, leads }) {
  const selected = leads.find(l => l.id === data.lead_id);

  const handleSelectLead = (leadId) => {
    if (!leadId) {
      setData(d => ({ ...d, lead_id: null }));
      return;
    }
    const lead = leads.find(l => l.id === leadId);
    if (!lead) { setData(d => ({ ...d, lead_id: leadId })); return; }
    setData(d => ({
      ...d,
      lead_id: leadId,
      service_type: d.service_type || lead.service_type || 'Autre',
      title: d.title?.trim()
        ? d.title
        : (lead.service_type ? `${lead.service_type} — ${lead.full_name}` : `Devis — ${lead.full_name}`),
      description: d.description?.trim()
        ? d.description
        : [lead.message, lead.surface ? `Surface : ${lead.surface} m²` : null].filter(Boolean).join('\n'),
      client_name: lead.full_name,
      client_email: lead.email,
      client_phone: lead.phone,
      client_address: lead.address,
      client_city: lead.city,
    }));
  };

  return (
    <div className="qf-section qf-fadein">
      <h2 className="qf-display" style={{ fontSize: 22, marginBottom: 20, fontStyle: 'italic' }}>Sélectionner le client</h2>
      <div style={{ marginBottom: 16 }}>
        <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Prospect *</label>
        <select className="qf-field" value={data.lead_id || ''} onChange={e => handleSelectLead(e.target.value || null)}>
          <option value="">— Choisir un prospect —</option>
          {leads.map(l => <option key={l.id} value={l.id}>{l.full_name}{l.city ? ` · ${l.city}` : ''}</option>)}
        </select>
      </div>
      {selected && (
        <div className="qf-fadein" style={{ background: 'var(--accent-soft)', border: '1.5px solid oklch(0.75 0.08 165)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontFamily: "'Fraunces', serif", fontWeight: 700, flexShrink: 0 }}>
              {(selected.full_name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.full_name}</div>
              {selected.service_type && (
                <div className="qf-mono" style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {selected.service_type}{selected.surface ? ` · ${selected.surface} m²` : ''}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: 'var(--ink-2)' }}>
            {selected.email && (
              <div><span className="qf-label" style={{ fontSize: 9, marginRight: 6 }}>Email</span>{selected.email}</div>
            )}
            {selected.phone && (
              <div><span className="qf-label" style={{ fontSize: 9, marginRight: 6 }}>Tél.</span>{selected.phone}</div>
            )}
            {selected.address && (
              <div style={{ gridColumn: '1 / span 2' }}>
                <MapPin style={{ width: 10, height: 10, display: 'inline', marginRight: 4, color: 'var(--ink-3)' }} />
                {selected.address}
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div>
          <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Service *</label>
          <select className="qf-field" value={data.service_type || ''} onChange={e => setData(d => ({ ...d, service_type: e.target.value }))}>
            <option value="">— Choisir un service —</option>
            {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Titre du devis *</label>
          <input className="qf-field" placeholder="Ex: Ménage régulier 2h/semaine" value={data.title || ''} onChange={e => setData(d => ({ ...d, title: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Description courte</label>
        <textarea className="qf-field" rows={3} placeholder="Contexte, notes spéciales…" value={data.description || ''} onChange={e => setData(d => ({ ...d, description: e.target.value }))} style={{ resize: 'vertical' }} />
      </div>
    </div>
  );
}

/* ─── Step 2 : Prestations ─────────────────────────────────────── */
/* ─── Configurateur intelligent par service ──────────────────── */
function SmartServiceConfigurator({ serviceType, onGenerate }) {
  const match = matchPreset(serviceType);
  const [values, setValues] = useState({});
  const [open, setOpen] = useState(true);

  if (!match) return null;
  const { preset, key } = match;

  const setField = (k, v) => setValues(p => ({ ...p, [k]: v }));

  const handleGenerate = () => {
    const postes = preset.buildPostes(values);
    onGenerate(postes, key);
    setValues({});
  };

  const hasValues = Object.values(values).some(v => v !== '' && v !== undefined && !(Array.isArray(v) && v.length === 0));

  return (
    <div style={{
      background: 'linear-gradient(135deg, oklch(0.93 0.05 165) 0%, oklch(0.96 0.02 85) 100%)',
      border: '1.5px solid oklch(0.52 0.13 165)',
      borderRadius: 14, padding: 18, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 14 : 0, cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles style={{ width: 18, height: 18, color: 'oklch(0.38 0.14 160)' }} />
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500, color: 'oklch(0.165 0.012 60)' }}>
              Configurateur · <em style={{ color: 'oklch(0.38 0.14 160)' }}>{preset.label}</em>
            </div>
            <div className="qf-mono" style={{ fontSize: 10, color: 'oklch(0.38 0.14 160)', letterSpacing: '0.08em', marginTop: 2 }}>
              Renseigne la prestation — les lignes et le prix sont calculés automatiquement
            </div>
          </div>
        </div>
        {open ? <ChevronUp style={{ width: 16, height: 16, color: 'oklch(0.38 0.14 160)' }} /> : <ChevronDown style={{ width: 16, height: 16, color: 'oklch(0.38 0.14 160)' }} />}
      </div>

      {open && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
            {preset.fields.map(f => (
              <div key={f.key}>
                <label className="qf-label" style={{ display: 'block', marginBottom: 5 }}>{f.label}</label>
                {f.type === 'select' ? (
                  <select className="qf-field" style={{ fontSize: 13 }} value={values[f.key] || ''} onChange={e => setField(f.key, e.target.value)}>
                    <option value="">—</option>
                    {f.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : f.type === 'multiselect' ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {f.options.map(o => {
                      const sel = Array.isArray(values[f.key]) && values[f.key].includes(o);
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => {
                            const cur = Array.isArray(values[f.key]) ? values[f.key] : [];
                            setField(f.key, sel ? cur.filter(x => x !== o) : [...cur, o]);
                          }}
                          className="qf-mono"
                          style={{
                            padding: '5px 10px', borderRadius: 999,
                            border: `1px solid ${sel ? 'oklch(0.52 0.13 165)' : 'var(--line)'}`,
                            background: sel ? 'oklch(0.52 0.13 165)' : 'var(--surface)',
                            color: sel ? 'white' : 'var(--ink-3)',
                            fontSize: 10, letterSpacing: '0.04em', cursor: 'pointer',
                          }}
                        >{o}</button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type={f.type}
                    className="qf-field qf-mono"
                    style={{ fontSize: 13 }}
                    placeholder={f.placeholder}
                    value={values[f.key] || ''}
                    min={f.min}
                    step={f.step || 1}
                    onChange={e => setField(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!hasValues}
            className="qf-btn-sm qf-btn-accent"
            style={{
              width: '100%', justifyContent: 'center', padding: '10px 16px',
              opacity: hasValues ? 1 : 0.5, cursor: hasValues ? 'pointer' : 'not-allowed',
              fontSize: 12,
            }}
          >
            <Sparkles style={{ width: 13, height: 13 }} />
            Générer les lignes de prestation
          </button>
        </>
      )}
    </div>
  );
}

function Step2Prestations({ groups, setGroups, serviceType }) {
  const [showOublis, setShowOublis] = useState(true);

  const handleSmartGenerate = (postes, serviceKey) => {
    const newPostes = postes.map(p => ({ ...newPoste(p.label), ...p }));
    setGroups(g => {
      // Remplace ou ajoute dans le premier groupe
      const first = g[0] || newGroup('Prestations principales');
      const updated = { ...first, name: first.name === 'Prestations principales' ? serviceKey : first.name, postes: [...first.postes.filter(p => p.label.trim() !== ''), ...newPostes] };
      return [updated, ...g.slice(1)];
    });
  };

  const totalHT = groups.reduce((s, g) => s + g.postes.reduce((ps, p) => ps + (p.qty || 0) * (p.price || 0), 0), 0);

  const toggleGroup = id => setGroups(g => g.map(gr => gr.id === id ? { ...gr, expanded: !gr.expanded } : gr));
  const addGroup = () => setGroups(g => [...g, newGroup()]);
  const removeGroup = id => setGroups(g => g.filter(gr => gr.id !== id));
  const renameGroup = (id, name) => setGroups(g => g.map(gr => gr.id === id ? { ...gr, name } : gr));
  const addPoste = id => setGroups(g => g.map(gr => gr.id === id ? { ...gr, postes: [...gr.postes, newPoste()] } : gr));
  const removePoste = (gid, pid) => setGroups(g => g.map(gr => gr.id === gid ? { ...gr, postes: gr.postes.filter(p => p.id !== pid) } : gr));
  const updatePoste = (gid, pid, field, val) => setGroups(g => g.map(gr =>
    gr.id === gid ? { ...gr, postes: gr.postes.map(p => p.id === pid ? { ...p, [field]: val } : p) } : gr
  ));

  return (
    <div className="qf-fadein">
      {showOublis && (
        <div className="qf-gold-alert" style={{ marginBottom: 20 }}>
          <AlertTriangle style={{ width: 16, height: 16, color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>L'IA a détecté des oublis potentiels</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {OUBLIS_IA.map((o, i) => (
                <li key={i} className="qf-mono" style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 2 }}>· {o}</li>
              ))}
            </ul>
          </div>
          <button onClick={() => setShowOublis(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      <SmartServiceConfigurator serviceType={serviceType} onGenerate={handleSmartGenerate} />

      {groups.map(group => {
        const groupTotal = group.postes.reduce((s, p) => s + (p.qty || 0) * (p.price || 0), 0);
        return (
          <div key={group.id} className="qf-section" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <div className="qf-group-header" style={{ borderRadius: 0 }} onClick={() => toggleGroup(group.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {group.expanded ? <ChevronUp style={{ width: 15, height: 15, color: 'var(--ink-3)' }} /> : <ChevronDown style={{ width: 15, height: 15, color: 'var(--ink-3)' }} />}
                <input
                  className="qf-mono"
                  style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: 'var(--ink)', cursor: 'text' }}
                  value={group.name}
                  onClick={e => e.stopPropagation()}
                  onChange={e => renameGroup(group.id, e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="qf-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{fmtEur(groupTotal)}</span>
                {groups.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); removeGroup(group.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                )}
              </div>
            </div>
            {group.expanded && (
              <div style={{ padding: '0 16px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px 32px', gap: 8, padding: '8px 0 4px', borderBottom: '1px solid var(--line)' }}>
                  {['Désignation', 'Qté', 'Unité', 'Prix unit.', ''].map((h, i) => (
                    <span key={i} className="qf-label" style={{ fontSize: 10 }}>{h}</span>
                  ))}
                </div>
                {group.postes.map(p => (
                  <div key={p.id} className="qf-poste-row">
                    <input className="qf-field" style={{ padding: '7px 10px', fontSize: 13 }} placeholder="Désignation" value={p.label} onChange={e => updatePoste(group.id, p.id, 'label', e.target.value)} />
                    <input className="qf-field qf-mono" style={{ padding: '7px 8px', fontSize: 13, textAlign: 'right' }} type="number" min="0" step="0.5" value={p.qty} onChange={e => updatePoste(group.id, p.id, 'qty', parseFloat(e.target.value) || 0)} />
                    <select className="qf-field" style={{ padding: '7px 8px', fontSize: 12 }} value={p.unit} onChange={e => updatePoste(group.id, p.id, 'unit', e.target.value)}>
                      {['forfait', 'heure', 'jour', 'mois', 'm²', 'kg', 'visite'].map(u => <option key={u}>{u}</option>)}
                    </select>
                    <input className="qf-field qf-mono" style={{ padding: '7px 8px', fontSize: 13, textAlign: 'right' }} type="number" min="0" step="0.01" value={p.price} onChange={e => updatePoste(group.id, p.id, 'price', parseFloat(e.target.value) || 0)} />
                    <button onClick={() => removePoste(group.id, p.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 4, borderRadius: 6 }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--warm)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-4)'}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                ))}
                <button className="qf-btn-sm" style={{ marginTop: 8 }} onClick={() => addPoste(group.id)}>
                  <Plus style={{ width: 12, height: 12 }} /> Ajouter un poste
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button className="qf-btn-sm" onClick={addGroup} style={{ marginBottom: 16 }}>
        <Plus style={{ width: 12, height: 12 }} /> Ajouter un groupe
      </button>
      <div style={{ textAlign: 'right', padding: '12px 0', borderTop: '2px solid var(--line)' }}>
        <span className="qf-label" style={{ marginRight: 12 }}>Total HT</span>
        <span className="qf-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{fmtEur(totalHT)}</span>
      </div>
    </div>
  );
}

/* ─── Step 3 : Conditions ──────────────────────────────────────── */
function Step3Conditions({ data, setData, groups }) {
  const frequency = data.frequency || 'unique';
  const interventionsCount = Number(data.interventions_count) || 1;

  // Calcul HT de base (1 intervention)
  const baseHT = (groups || []).reduce((s, g) => s + g.postes.reduce((ps, p) => ps + (p.qty || 0) * (p.price || 0), 0), 0);
  const totalRecurrent = baseHT * interventionsCount;

  const FREQ_LABELS = {
    unique:       { label: 'Intervention unique', cadence: 'une seule fois' },
    quotidien:    { label: 'Quotidien',           cadence: 'par jour' },
    hebdomadaire: { label: 'Hebdomadaire',        cadence: 'par semaine' },
    bimensuelle:  { label: 'Bimensuelle',         cadence: 'toutes les 2 semaines' },
    mensuel:      { label: 'Mensuel',             cadence: 'par mois' },
    trimestriel:  { label: 'Trimestriel',         cadence: 'tous les 3 mois' },
    annuel:       { label: 'Annuel',              cadence: 'par an' },
  };

  return (
    <div className="qf-fadein">
      {/* ─── Récurrence ─── */}
      <div className="qf-section" style={{ marginBottom: 18, borderLeft: '4px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Sparkles style={{ width: 16, height: 16, color: 'var(--accent)' }} />
          <h2 className="qf-display" style={{ fontSize: 20, margin: 0 }}>
            Récurrence &amp; <em style={{ color: 'var(--accent)' }}>planification</em>
          </h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16, fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
          Définis la fréquence et le nombre d'interventions — le total du devis est multiplié automatiquement.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Fréquence</label>
            <select className="qf-field" value={frequency} onChange={e => setData(d => ({ ...d, frequency: e.target.value }))}>
              {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {frequency !== 'unique' && (
            <div>
              <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>
                Nombre d'interventions
              </label>
              <input
                type="number"
                min="1"
                max="365"
                className="qf-field qf-mono"
                value={data.interventions_count || 1}
                onChange={e => setData(d => ({ ...d, interventions_count: Math.max(1, parseInt(e.target.value) || 1) }))}
              />
              <div className="qf-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.04em' }}>
                {interventionsCount} × {FREQ_LABELS[frequency]?.cadence}
              </div>
            </div>
          )}

          <div>
            <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Date de début souhaitée</label>
            <input type="date" className="qf-field qf-mono" value={data.start_date || ''} onChange={e => setData(d => ({ ...d, start_date: e.target.value }))} />
          </div>

          {frequency !== 'unique' && (
            <div>
              <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Jour(s) préféré(s)</label>
              <select className="qf-field" value={data.preferred_day || ''} onChange={e => setData(d => ({ ...d, preferred_day: e.target.value }))}>
                <option value="">— Flexible —</option>
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Aperçu calcul */}
        {frequency !== 'unique' && interventionsCount > 1 && (
          <div style={{
            background: 'var(--accent-soft)', border: '1px solid var(--accent)',
            borderRadius: 10, padding: '12px 14px',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'baseline',
          }}>
            <div>
              <div className="qf-label" style={{ color: 'var(--accent)', marginBottom: 3 }}>Calcul récurrence</div>
              <div className="qf-mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                {fmtEur(baseHT)} par passage × {interventionsCount} intervention{interventionsCount > 1 ? 's' : ''} {FREQ_LABELS[frequency]?.cadence}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="qf-label" style={{ color: 'var(--accent)', marginBottom: 3 }}>Total HT</div>
              <div className="qf-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                {fmtEur(totalRecurrent)}
              </div>
            </div>
          </div>
        )}

        {/* Type de facturation */}
        {frequency !== 'unique' && (
          <div style={{ marginTop: 14 }}>
            <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Mode de facturation</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { k: 'per_visit', label: 'Une facture par passage' },
                { k: 'monthly',   label: 'Mensualisée (facture mensuelle)' },
                { k: 'upfront',   label: 'Forfait global (à l\'avance)' },
              ].map(opt => {
                const sel = (data.billing_mode || 'per_visit') === opt.k;
                return (
                  <button
                    key={opt.k}
                    type="button"
                    onClick={() => setData(d => ({ ...d, billing_mode: opt.k }))}
                    className="qf-mono"
                    style={{
                      padding: '7px 12px', borderRadius: 999,
                      border: `1px solid ${sel ? 'var(--accent)' : 'var(--line)'}`,
                      background: sel ? 'var(--accent)' : 'var(--surface)',
                      color: sel ? 'white' : 'var(--ink-2)',
                      fontSize: 11, letterSpacing: '0.04em', cursor: 'pointer',
                    }}
                  >{opt.label}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Conditions contractuelles ─── */}
      <div className="qf-section">
        <h2 className="qf-display" style={{ fontSize: 20, marginBottom: 16, fontStyle: 'italic' }}>Conditions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div>
            <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Date de validité</label>
            <input type="date" className="qf-field" value={data.expiry_date || ''} onChange={e => setData(d => ({ ...d, expiry_date: e.target.value }))} />
          </div>
          <div>
            <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Délai d'intervention</label>
            <input type="text" className="qf-field" placeholder="Ex: Dès la semaine prochaine" value={data.delay || ''} onChange={e => setData(d => ({ ...d, delay: e.target.value }))} />
          </div>
          <div>
            <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Mode de paiement</label>
            <select className="qf-field" value={data.payment_mode || 'virement'} onChange={e => setData(d => ({ ...d, payment_mode: e.target.value }))}>
              {['virement', 'chèque', 'espèces', 'prélèvement', 'carte'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Délai de paiement</label>
            <select className="qf-field" value={data.payment_delay || '30 jours'} onChange={e => setData(d => ({ ...d, payment_delay: e.target.value }))}>
              {['À réception', '15 jours', '30 jours', '45 jours', '60 jours'].map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Taux de TVA</label>
            <select className="qf-field" value={data.tva ?? '20'} onChange={e => setData(d => ({ ...d, tva: e.target.value }))}>
              {TVA_RATES.map(t => <option key={t.value} value={String(t.value)}>{t.label}</option>)}
            </select>
            {parseTva(data.tva) === 0 && (
              <div className="qf-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
                Aucune TVA ne sera calculée.
              </div>
            )}
          </div>
          <div>
            <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Remise globale (%)</label>
            <input type="number" min="0" max="100" className="qf-field qf-mono" value={data.discount || 0} onChange={e => setData(d => ({ ...d, discount: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>

        {/* ═══ Frais de déplacement ═══ */}
        <div style={{
          marginTop: 18, padding: 14, borderRadius: 12,
          background: 'var(--surface, #f8fafc)',
          border: '1px solid var(--line, #e2e8f0)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: data.transport_fee_enabled ? 12 : 0 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Frais de déplacement</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3, #64748b)', marginTop: 2 }}>
                {data.transport_fee_enabled
                  ? 'Affiché au client dans le PDF'
                  : 'Mention « non inclus » sur le PDF'}
              </div>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
              <span className="qf-mono" style={{ fontSize: 11, fontWeight: 600, color: data.transport_fee_enabled ? 'var(--accent, #10b981)' : 'var(--ink-3, #64748b)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {data.transport_fee_enabled ? 'Oui' : 'Non'}
              </span>
              <span style={{
                position: 'relative',
                width: 44, height: 24, borderRadius: 999,
                background: data.transport_fee_enabled ? 'var(--accent, #10b981)' : 'var(--line, #cbd5e1)',
                transition: 'background .2s',
              }}>
                <input
                  type="checkbox"
                  checked={!!data.transport_fee_enabled}
                  onChange={e => setData(d => ({ ...d, transport_fee_enabled: e.target.checked }))}
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', margin: 0 }}
                />
                <span style={{
                  position: 'absolute', top: 2, left: data.transport_fee_enabled ? 22 : 2,
                  width: 20, height: 20, borderRadius: 999, background: '#fff',
                  transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </span>
            </label>
          </div>

          {data.transport_fee_enabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, alignItems: 'flex-end' }}>
              <div>
                <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Montant HT (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="qf-field qf-mono"
                  value={data.transport_fee_amount ?? 0}
                  onChange={e => setData(d => ({ ...d, transport_fee_amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3, #64748b)', lineHeight: 1.5, paddingBottom: 8 }}>
                {(data.transport_fee_amount || 0) === 0
                  ? <>Affiché en <strong style={{ color: 'var(--accent, #10b981)' }}>« Offerts »</strong> dans le PDF</>
                  : <>S'ajoute au Net HT, soumis à la TVA</>}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Notes / conditions particulières</label>
          <textarea className="qf-field" rows={3} placeholder="Conditions particulières, notes au client…" value={data.notes || ''} onChange={e => setData(d => ({ ...d, notes: e.target.value }))} style={{ resize: 'vertical' }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Step 4 : Récapitulatif ───────────────────────────────────── */
function Step4Recap({ formData, groups, leads }) {
  const lead = leads.find(l => l.id === formData.lead_id);
  const baseHT = groups.reduce((s, g) => s + g.postes.reduce((ps, p) => ps + (p.qty || 0) * (p.price || 0), 0), 0);
  const count = (formData.frequency && formData.frequency !== 'unique')
    ? Math.max(1, Number(formData.interventions_count) || 1) : 1;
  const totalHT = baseHT * count;
  const discount = ((formData.discount || 0) / 100) * totalHT;
  const netHT = totalHT - discount;
  const transportEnabled = !!formData.transport_fee_enabled;
  const transportHT = transportEnabled ? Number(formData.transport_fee_amount || 0) : 0;
  const base = netHT + transportHT;
  const tva = (parseTva(formData.tva) / 100) * base;
  const ttc = base + tva;

  return (
    <div className="qf-fadein">
      <div className="qf-section">
        <h2 className="qf-display" style={{ fontSize: 22, marginBottom: 20, fontStyle: 'italic' }}>Récapitulatif</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <div className="qf-label" style={{ marginBottom: 8 }}>Client</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{lead?.full_name || '—'}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{lead?.city || ''}</div>
          </div>
          <div>
            <div className="qf-label" style={{ marginBottom: 8 }}>Devis</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{formData.title || '(sans titre)'}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
              Service : <strong>{formData.service_type || '—'}</strong> · Validité : {formData.expiry_date || 'non définie'}
            </div>
          </div>
        </div>
        {groups.map(g => (
          <div key={g.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{g.name}</div>
            {g.postes.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line-2)', fontSize: 13 }}>
                <span style={{ color: 'var(--ink-2)' }}>{p.label || '(poste sans nom)'} — {p.qty} {p.unit}</span>
                <span className="qf-mono" style={{ fontWeight: 600 }}>{fmtEur((p.qty || 0) * (p.price || 0))}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ paddingTop: 16, borderTop: '2px solid var(--line)' }}>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>
              <span>Remise ({formData.discount}%)</span><span className="qf-mono">- {fmtEur(discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>
            <span>Net HT</span><span className="qf-mono">{fmtEur(netHT)}</span>
          </div>
          {transportEnabled ? (
            transportHT > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>
                <span>Frais de déplacement</span><span className="qf-mono">{fmtEur(transportHT)}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--accent, #10b981)', marginBottom: 4, fontStyle: 'italic' }}>
                <span>Frais de déplacement</span><span className="qf-mono">Offerts</span>
              </div>
            )
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', marginBottom: 4, fontStyle: 'italic', opacity: 0.8 }}>
              <span>Frais de déplacement</span><span className="qf-mono">non inclus</span>
            </div>
          )}
          {parseTva(formData.tva) > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)', marginBottom: 8 }}>
              <span>TVA ({parseTva(formData.tva)}%)</span><span className="qf-mono">{fmtEur(tva)}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)', marginBottom: 8, fontStyle: 'italic' }}>
              <span>TVA non applicable (0%)</span><span className="qf-mono">—</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
            <span>Total TTC</span>
            <span className="qf-mono" style={{ color: 'var(--accent)' }}>{fmtEur(ttc)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Parser du message structuré du lead (même logique que LeadDossier) */
const BRIEF_EMOJIS = { services: '🧽', calcul: '🧮', intervention: '📍', client: '👤' };
function parseBrief(text) {
  if (!text || typeof text !== 'string') return null;
  const sections = [];
  const parts = text.split(/\n(?=(?:🧽|🧮|📍|👤|##\s))/);
  for (const part of parts) {
    const m = part.match(/^(🧽|🧮|📍|👤|##\s*)(.*)/);
    if (m) {
      const emoji = m[1].trim();
      const kindMap = { '🧽': 'services', '🧮': 'calcul', '📍': 'intervention', '👤': 'client' };
      const kind = kindMap[emoji] || 'services';
      const body = part.slice(m[0].length).trim();
      if (body) sections.push({ emoji: BRIEF_EMOJIS[kind] || '•', kind, body });
    }
  }
  if (sections.length === 0 && text.trim()) return [{ emoji: '•', kind: 'note', body: text.trim().slice(0, 200) }];
  return sections.length ? sections : null;
}

/* ─── Sidebar ──────────────────────────────────────────────────── */
function Sidebar({ groups, formData, leads }) {
  const lead = leads.find(l => l.id === formData.lead_id);
  const baseHT = groups.reduce((s, g) => s + g.postes.reduce((ps, p) => ps + (p.qty || 0) * (p.price || 0), 0), 0);
  const recCount = (formData.frequency && formData.frequency !== 'unique')
    ? Math.max(1, Number(formData.interventions_count) || 1) : 1;
  const totalHT = baseHT * recCount;
  const discount = ((formData.discount || 0) / 100) * totalHT;
  const base = totalHT - discount;
  const tva = (parseTva(formData.tva) / 100) * base;
  const ttc = base + tva;
  const proba = 87;

  /* Cartes additionnelles : brief / engagement / distance */
  const [engagement, setEngagement] = useState(null);
  const [distance, setDistance] = useState(null);
  const [leadFull, setLeadFull] = useState(null);

  useEffect(() => {
    if (!formData.lead_id) {
      setEngagement(null); setDistance(null); setLeadFull(null);
      return;
    }
    let alive = true;
    Promise.all([
      api.get(`/leads/${formData.lead_id}`).catch(() => ({ data: null })),
      api.get(`/leads/${formData.lead_id}/distance`).catch(() => ({ data: null })),
      api.get(`/leads/${formData.lead_id}/engagement`).catch(() => ({ data: null })),
    ]).then(([l, d, e]) => {
      if (!alive) return;
      setLeadFull(l.data || null);
      setDistance(d.data || null);
      setEngagement(e.data || null);
    });
    return () => { alive = false; };
  }, [formData.lead_id]);

  const brief = useMemo(() => parseBrief(leadFull?.message || lead?.message), [leadFull, lead]);

  const fmtAgo = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days}j`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="qf-sidebar">
      {/* ── Totaux (compact) ── */}
      <div className="qf-sidebar-card">
        <div className="qf-label" style={{ marginBottom: 8 }}>Totaux</div>
        <div className="qf-mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', lineHeight: 1, marginBottom: 3 }}>{fmtEur(ttc)}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 10 }}>TTC · {fmtEur(base)} HT</div>
        {[['Total HT', fmtEur(base)], [`TVA ${parseTva(formData.tva)}%`, parseTva(formData.tva) > 0 ? fmtEur(tva) : '—'], ['Total TTC', fmtEur(ttc)]].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-2)', marginBottom: 2 }}>
            <span>{l}</span><span className="qf-mono" style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* ── Probabilité (compact) ── */}
      <div className="qf-sidebar-card compact">
        <div className="qf-label" style={{ marginBottom: 6 }}>Probabilité</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="qf-mono" style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{proba}%</div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>signature</div>
        </div>
        <div className="qf-proba-bar"><div className="qf-proba-fill" style={{ width: `${proba}%` }} /></div>
      </div>

      {/* ── Client (compact) ── */}
      {lead && (
        <div className="qf-sidebar-card compact">
          <div className="qf-label" style={{ marginBottom: 8 }}>Client</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontFamily: "'Fraunces', serif", fontWeight: 700, border: '1.5px solid oklch(0.8 0.07 165)', flexShrink: 0 }}>
              {(lead.full_name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.full_name}</div>
              <div className="qf-mono" style={{ fontSize: 9, color: 'var(--ink-4)' }}>{lead.city || ''}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Brief des besoins ── */}
      {brief && brief.length > 0 && (
        <div className="qf-sidebar-card compact">
          <div className="qf-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText style={{ width: 11, height: 11 }} /> Brief client
          </div>
          {brief.slice(0, 4).map((s, i) => (
            <div key={i} className="qf-brief-row">
              <span className="qf-brief-emoji">{s.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                {s.body.split('\n').slice(0, 2).join(' · ').slice(0, 110)}
                {s.body.length > 110 ? '…' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Engagement (tracking) ── */}
      {engagement && (engagement.email_opens > 0 || engagement.quote_views > 0 || engagement.interactions_count > 0) && (
        <div className="qf-sidebar-card compact tinted">
          <div className="qf-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}>
            <Eye style={{ width: 11, height: 11 }} /> Engagement
          </div>
          <div className="qf-stat-mini">
            <Mail className="qf-stat-mini-icon" />
            <span className="qf-mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{engagement.email_opens || 0}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              {(engagement.email_opens || 0) > 1 ? 'ouvertures' : 'ouverture'}
            </span>
          </div>
          <div className="qf-stat-mini">
            <Eye className="qf-stat-mini-icon" />
            <span className="qf-mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{engagement.quote_views || 0}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              {(engagement.quote_views || 0) > 1 ? 'vues devis' : 'vue devis'}
            </span>
          </div>
          {engagement.last_quote_view_at && (
            <div style={{ fontSize: 10, color: 'var(--accent)', fontStyle: 'italic', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock style={{ width: 10, height: 10 }} />
              Dernière vue {fmtAgo(engagement.last_quote_view_at)}
            </div>
          )}
        </div>
      )}

      {/* ── Distance / trajet ── */}
      {distance && distance.distance_km != null && (
        <div className="qf-sidebar-card compact">
          <div className="qf-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Navigation style={{ width: 11, height: 11 }} /> Trajet
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <span className="qf-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
              {distance.distance_km}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>km</span>
            <span className="qf-mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', marginLeft: 6 }}>
              {distance.duration_min}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>min</span>
          </div>
          {distance.destination_label && (
            <div style={{ fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.3 }}>
              {distance.destination_label}
            </div>
          )}
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(distance.origin || '')}&destination=${encodeURIComponent(distance.destination || '')}&travelmode=driving`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
              fontSize: 10, color: 'var(--accent)', textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em',
            }}
          >
            <MapPin style={{ width: 10, height: 10 }} /> Voir sur Maps →
          </a>
        </div>
      )}

      {/* ── Devis similaires (compact) ── */}
      <div className="qf-sidebar-card compact">
        <div className="qf-label" style={{ marginBottom: 8 }}>Devis similaires</div>
        {DEMO_SIMILAR.slice(0, 3).map(s => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--line-2)', fontSize: 11 }}>
            <div style={{ minWidth: 0 }}>
              <div className="qf-mono" style={{ color: 'var(--ink-3)', fontSize: 9 }}>{s.number}</div>
              <div style={{ color: 'var(--ink-2)', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.client}</div>
            </div>
            <span className="qf-mono" style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 12, flexShrink: 0 }}>{fmtEur(s.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────── */
export default function QuoteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const prefillLeadId = searchParams.get('leadId');
  const isEdit = Boolean(id);

  const [step, setStep] = useState(1);
  const [leads, setLeads] = useState(DEMO_LEADS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [formData, setFormData] = useState({
    lead_id: null, service_type: '', title: '', description: '',
    expiry_date: '', delay: '', payment_mode: 'virement',
    payment_delay: '30 jours', tva: '20', discount: 0, notes: '',
    // Récurrence
    frequency: 'unique', interventions_count: 1, start_date: '',
    preferred_day: '', billing_mode: 'per_visit',
  });
  const [groups, setGroups] = useState([newGroup('Prestations principales')]);

  // Mapping uniforme d'un lead brut (backend) → format composant
  const mapLead = (l) => {
    const addr = l.address || '';
    const cityMatch = addr.match(/\d{5}\s+([^,]+)/);
    const city = cityMatch ? cityMatch[1].trim() : (addr.split(',').pop() || '').trim();
    return {
      id: l.lead_id,
      full_name: l.name || l.full_name || 'Inconnu',
      city,
      address: addr,
      email: l.email || '',
      phone: l.phone || '',
      service_type: l.service_type || '',
      surface: l.surface || null,
      message: l.message || '',
      frequency: l.frequency || l.preferred_frequency || null,
      urgency: l.urgency || null,
      tags: l.tags || [],
    };
  };

  // ─── Génère un premier poste auto basé sur service + surface
  const generateInitialPostes = useCallback((lead, brief) => {
    const postes = [];

    // 1) Si le brief contient une section "calcul" (🧮) avec prix : extraire
    if (brief && Array.isArray(brief)) {
      const calcSection = brief.find(s => s.kind === 'calcul');
      if (calcSection && calcSection.body) {
        // Cherche des lignes type "label ... 120 €" ou "label : 120€" ou "label - 120 EUR"
        const lines = calcSection.body.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          const m = line.match(/^[-•·*]?\s*(.+?)\s*[:\-—]\s*([\d\s]+[,.]?\d*)\s*(?:€|EUR)/i);
          if (m) {
            const label = m[1].trim().replace(/\s+/g, ' ');
            const price = parseFloat(m[2].replace(/\s/g, '').replace(',', '.')) || 0;
            if (label && label.length < 80 && price > 0) {
              postes.push({
                ...newPoste(label),
                qty: 1,
                unit: 'forfait',
                price,
              });
            }
          }
        }
      }
    }

    // 2) Fallback : poste basé sur service_type + surface
    if (postes.length === 0) {
      const svc = lead.service_type || 'Prestation';
      const surface = Number(lead.surface || 0);
      const isAreaService = /ménage|menage|vitres|vitrerie|sols|carrelage|tapis/i.test(svc);

      if (isAreaService && surface > 0) {
        postes.push({
          ...newPoste(`${svc} — ${surface} m²`),
          qty: surface,
          unit: 'm²',
          price: 0,
        });
      } else {
        postes.push({
          ...newPoste(svc),
          qty: 1,
          unit: 'forfait',
          price: 0,
        });
      }
    }

    return postes;
  }, []);

  // Pré-remplit formData + groups depuis un lead (non destructif : respecte ce qui est déjà saisi)
  const prefillFromLead = useCallback((lead) => {
    if (!lead) return;
    const brief = parseBrief(lead.message);

    // Construire description depuis le brief si parsable, sinon message brut
    let description = '';
    let notesAuto = '';
    if (brief && brief.length > 0) {
      const services = brief.find(s => s.kind === 'services');
      const intervention = brief.find(s => s.kind === 'intervention');
      const client = brief.find(s => s.kind === 'client');
      const note = brief.find(s => s.kind === 'note');
      description = [
        services ? `🧽 Services demandés\n${services.body}` : null,
        intervention ? `📍 Intervention\n${intervention.body}` : null,
        note ? note.body : null,
      ].filter(Boolean).join('\n\n');
      notesAuto = client ? `Profil client : ${client.body}` : '';
    } else if (lead.message) {
      description = lead.message;
    }
    if (lead.surface) description += (description ? '\n\n' : '') + `Surface estimée : ${lead.surface} m²`;
    if (lead.urgency) notesAuto = (notesAuto ? notesAuto + ' · ' : '') + `Urgence : ${lead.urgency}`;

    // Date de validité par défaut J+30
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    const expiryISO = expiry.toISOString().slice(0, 10);

    // Fréquence si signalée par le lead
    const freqMap = {
      hebdomadaire: 'hebdomadaire',
      bimensuelle: 'bimensuelle',
      mensuel: 'mensuel',
      mensuelle: 'mensuel',
      trimestriel: 'trimestriel',
      annuel: 'annuel',
      ponctuel: 'unique',
      unique: 'unique',
    };
    const detectedFreq = lead.frequency ? freqMap[String(lead.frequency).toLowerCase()] || null : null;

    setFormData(d => ({
      ...d,
      lead_id: lead.id,
      service_type: d.service_type || lead.service_type || 'Autre',
      title: d.title?.trim() ? d.title
        : (lead.service_type
            ? `${lead.service_type} — ${lead.full_name}${lead.surface ? ` · ${lead.surface} m²` : ''}`
            : `Devis — ${lead.full_name}`),
      description: d.description?.trim() ? d.description : description,
      notes: d.notes?.trim() ? d.notes : notesAuto,
      expiry_date: d.expiry_date || expiryISO,
      frequency: d.frequency && d.frequency !== 'unique' ? d.frequency : (detectedFreq || d.frequency || 'unique'),
      client_name: lead.full_name,
      client_email: lead.email,
      client_phone: lead.phone,
      client_address: lead.address,
      client_city: lead.city,
    }));

    // Pré-remplir les postes : seulement si le formulaire est encore vierge (un seul groupe avec un seul poste vide)
    setGroups(currentGroups => {
      const isEmpty = currentGroups.length === 1
        && currentGroups[0].postes.length === 1
        && !currentGroups[0].postes[0].label.trim()
        && !currentGroups[0].postes[0].price;
      if (!isEmpty) return currentGroups;

      const initialPostes = generateInitialPostes(lead, brief);
      if (initialPostes.length === 0) return currentGroups;

      return [{
        ...currentGroups[0],
        name: lead.service_type || 'Prestations principales',
        postes: initialPostes,
      }];
    });
  }, [generateInitialPostes]);

  // ⚡ Fetch direct du lead ciblé (rapide) — AVANT le chargement de toute la liste
  useEffect(() => {
    if (!prefillLeadId || isEdit) return;
    api.get(`/leads/${prefillLeadId}`)
      .then(r => {
        if (!r.data) return;
        const lead = mapLead(r.data);
        // Ajoute ce lead à la liste pour que le dropdown l'affiche (même si la
        // liste complète n'est pas encore chargée)
        setLeads(prev => prev.some(l => l.id === lead.id) ? prev : [lead, ...prev]);
        prefillFromLead(lead);
      })
      .catch(() => {});
  }, [prefillLeadId, isEdit, prefillFromLead]);

  // Chargement de la liste complète des leads (pour le dropdown)
  useEffect(() => {
    api.get('/leads', { params: { page_size: 200, period: 'all' } })
      .then(r => {
        const raw = r.data?.items || r.data || [];
        const mapped = (Array.isArray(raw) ? raw : []).map(mapLead);
        setLeads(prev => {
          // Garde les leads déjà chargés (dont celui pré-sélectionné) en tête,
          // puis ajoute les nouveaux non encore présents.
          const ids = new Set(mapped.map(l => l.id));
          const kept = prev.filter(l => !ids.has(l.id));
          return [...kept, ...mapped];
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/quotes/${id}`).then(r => {
      const q = r.data;
      if (!q) return;
      setFormData(prev => ({
        ...prev,
        lead_id: q.lead_id || null,
        service_type: q.service_type || '',
        title: q.title || '',
        description: q.details || '',
        expiry_date: q.expiry_date || '',
        payment_mode: q.payment_mode || 'virement',
        payment_delay: q.payment_delay || '30 jours',
        tva: String(q.tva_rate ?? 20),
        discount: q.discount || 0,
        transport_fee_enabled: !!q.transport_fee_enabled,
        transport_fee_amount: Number(q.transport_fee_amount || 0),
        notes: q.notes || '',
        frequency: q.frequency || 'unique',
        interventions_count: q.interventions_count || 1,
        start_date: q.start_date || '',
        preferred_day: q.preferred_day || '',
        billing_mode: q.billing_mode || 'per_visit',
      }));
      if (q.line_items?.length) {
        const groupMap = {};
        q.line_items.forEach(item => {
          const gname = item.group || 'Prestations principales';
          if (!groupMap[gname]) groupMap[gname] = { id: Date.now() + Math.random(), name: gname, expanded: true, postes: [] };
          const poste = newPoste(item.label || '');
          poste.qty = item.qty || 1;
          poste.unit = item.unit || 'forfait';
          poste.price = item.price || 0;
          groupMap[gname].postes.push(poste);
        });
        const rebuilt = Object.values(groupMap);
        if (rebuilt.length) setGroups(rebuilt);
      }
    }).catch(() => {});
  }, [id, isEdit]);

  useEffect(() => {
    if (!formData.lead_id && !formData.title) return;
    const t = setTimeout(() => setLastSaved(new Date()), 3000);
    return () => clearTimeout(t);
  }, [formData, groups]);

  const canNext = useCallback(() => {
    if (step === 1) return Boolean(formData.lead_id && formData.service_type && formData.title.trim());
    if (step === 2) return groups.some(g => g.postes.some(p => p.label.trim() && p.price > 0));
    return true;
  }, [step, formData, groups]);

  const handleSave = async (andSend = false) => {
    setSaving(true);
    const baseHT = groups.reduce((s, g) => s + g.postes.reduce((ps, p) => ps + (p.qty || 0) * (p.price || 0), 0), 0);
    const recurrenceMultiplier = (formData.frequency && formData.frequency !== 'unique')
      ? Math.max(1, Number(formData.interventions_count) || 1)
      : 1;
    const totalHT = baseHT * recurrenceMultiplier;
    const tvaRate = parseTva(formData.tva);
    const netHT = totalHT * (1 - (formData.discount || 0) / 100);
    const transportEnabled = !!formData.transport_fee_enabled;
    const transportHT = transportEnabled ? Number(formData.transport_fee_amount || 0) : 0;
    const baseTva = netHT + transportHT;
    const amount = baseTva * (1 + tvaRate / 100);
    const line_items = groups.flatMap(g => g.postes.map(p => ({
      group: g.name, label: p.label, qty: p.qty, unit: p.unit, price: p.price,
    })));
    const payload = {
      lead_id: formData.lead_id,
      service_type: formData.service_type || 'Autre',
      title: formData.title,
      amount,
      details: formData.description || '',
      expiry_date: formData.expiry_date || null,
      payment_mode: formData.payment_mode,
      payment_delay: formData.payment_delay,
      tva_rate: tvaRate,
      discount: formData.discount || 0,
      transport_fee_enabled: transportEnabled,
      transport_fee_amount: transportHT,
      notes: formData.notes || '',
      line_items,
      status: andSend ? 'envoyé' : 'brouillon',
      // Récurrence
      frequency: formData.frequency || 'unique',
      interventions_count: recurrenceMultiplier,
      start_date: formData.start_date || null,
      preferred_day: formData.preferred_day || null,
      billing_mode: formData.billing_mode || 'per_visit',
    };
    try {
      setSaveError(null);
      if (isEdit) await api.patch(`/quotes/${id}`, payload);
      else await api.post('/quotes', payload);
      navigate('/quotes');
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.response?.data?.message || e?.message || 'Erreur inconnue';
      setSaveError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="qf-root">
      <style>{tokenStyle}</style>

      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/quotes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Devis
        </button>
        <ChevronRight style={{ width: 13, height: 13, color: 'var(--ink-4)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          {isEdit ? `Modifier devis #${id}` : 'Nouveau devis'}
        </span>
      </div>

      <Stepper current={step} />

      <div className="qf-layout" style={{ display: 'flex', gap: 24, padding: '24px', alignItems: 'flex-start', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {step === 1 && <Step1Client data={formData} setData={setFormData} leads={leads} />}
          {step === 2 && <Step2Prestations groups={groups} setGroups={setGroups} serviceType={formData.service_type} />}
          {step === 3 && <Step3Conditions data={formData} setData={setFormData} groups={groups} />}
          {step === 4 && <Step4Recap formData={formData} groups={groups} leads={leads} />}
        </div>
        <Sidebar groups={groups} formData={formData} leads={leads} />
      </div>

      {saveError && (
        <div style={{ position: 'fixed', bottom: 80, left: 24, right: 24, zIndex: 101, background: 'oklch(0.94 0.08 25)', border: '1.5px solid oklch(0.55 0.18 25)', color: 'oklch(0.25 0.15 25)', padding: '12px 18px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            <strong style={{ marginRight: 6 }}>Échec de l'enregistrement :</strong>{saveError}
          </div>
          <button onClick={() => setSaveError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6 }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      <div className="qf-footbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {step > 1 && (
            <button className="qf-footbar-btn qf-footbar-btn-ghost" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Précédent
            </button>
          )}
          {lastSaved && (
            <span className="qf-mono" style={{ fontSize: 10, opacity: 0.45 }}>
              Sauvegardé {lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="qf-footbar-btn qf-footbar-btn-secondary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader style={{ width: 13, height: 13, animation: 'spin 0.7s linear infinite' }} /> : <Save style={{ width: 13, height: 13 }} />}
            Enregistrer brouillon
          </button>
          {step < 4 ? (
            <button
              className="qf-footbar-btn qf-footbar-btn-primary"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              style={{ opacity: canNext() ? 1 : 0.4, cursor: canNext() ? 'pointer' : 'not-allowed' }}
            >
              Étape suivante <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          ) : (
            <button className="qf-footbar-btn qf-footbar-btn-primary" onClick={() => handleSave(true)} disabled={saving}>
              <Send style={{ width: 13, height: 13 }} /> Enregistrer et envoyer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
