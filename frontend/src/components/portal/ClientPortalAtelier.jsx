// ClientPortalAtelier.jsx — Portail client pro, identité magazine atelier.
// 8 vues : Accueil · Devis · Factures · Interventions · Documents · Fidélité · Conseiller · Profil.
// Mobile-first avec bottom nav + notifications bell + cartes dark/light alternées.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  FileText, CreditCard, Calendar, Home, MessageSquare, User, Bell, Mail,
  Phone, MapPin, ChevronRight, Check, X, Send, ArrowRight, Download,
  Star, Gift, LogOut, Edit3, Sparkles, Plus, RefreshCw, ExternalLink,
  Shield, Award, Clock, CheckCircle, AlertCircle, HelpCircle, Folder,
  Settings, Copy, TrendingUp, TrendingDown, Navigation, Activity, Zap, Receipt,
  Menu,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts';
import BACKEND_URL from '../../config.js';

const API_URL = BACKEND_URL + '/api/portal';
const CHAT_API = BACKEND_URL + '/api/chat';

const pAxios = axios.create({ withCredentials: true });
pAxios.interceptors.request.use(config => {
  const token = localStorage.getItem('portal_token');
  if (token) {
    config.headers['X-Portal-Token'] = token;
    config.headers['x-portal-token'] = token;
  }
  return config;
});
const _init = localStorage.getItem('portal_token');
if (_init) pAxios.defaults.headers.common['X-Portal-Token'] = _init;

/* ═══════════ TOKENS & STYLES ═══════════ */
const tokenStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:ital,wght@0,400..600;1,400..500&display=swap');

  .cpa-root {
    /* ═══ Surfaces crème pastel ═══ */
    --bg: oklch(0.965 0.014 82);
    --paper: oklch(0.985 0.008 85);
    --surface: oklch(0.975 0.012 82);
    --surface-2: oklch(0.945 0.014 78);

    /* ═══ Texte bleu marine profond ═══ */
    --ink: oklch(0.20 0.04 250);
    --ink-2: oklch(0.36 0.03 250);
    --ink-3: oklch(0.55 0.02 240);
    --ink-4: oklch(0.72 0.014 240);

    /* ═══ Lignes douces ═══ */
    --line: oklch(0.88 0.012 240);
    --line-2: oklch(0.93 0.008 240);

    /* ═══ Pastels distinctifs ═══ */
    /* Bleu poudré */
    --pastel-blue:    oklch(0.92 0.04 240);
    --pastel-blue-fg: oklch(0.30 0.10 240);
    /* Sage / vert pastel */
    --pastel-sage:    oklch(0.92 0.05 165);
    --pastel-sage-fg: oklch(0.32 0.12 165);
    /* Rose poudré */
    --pastel-rose:    oklch(0.93 0.04 25);
    --pastel-rose-fg: oklch(0.42 0.13 25);
    /* Ocre / sable */
    --pastel-ocre:    oklch(0.93 0.05 80);
    --pastel-ocre-fg: oklch(0.42 0.12 75);
    /* Lilas */
    --pastel-lilas:    oklch(0.92 0.04 290);
    --pastel-lilas-fg: oklch(0.36 0.14 290);

    /* ═══ Accents principaux ═══ */
    --emerald: oklch(0.45 0.13 165);
    --emerald-deep: oklch(0.32 0.13 160);
    --emerald-soft: oklch(0.92 0.05 165);
    --gold: oklch(0.55 0.13 80);
    --gold-soft: oklch(0.93 0.05 80);
    --rouge: oklch(0.50 0.16 25);
    --rouge-soft: oklch(0.93 0.04 25);
    --cool: oklch(0.46 0.10 240);
    --sepia: oklch(0.50 0.07 65);

    background: var(--bg);
    min-height: 100vh;
    color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    padding-bottom: 80px;
    letter-spacing: -0.005em;
  }

  /* ═══ Typographie ═══ */
  .cpa-display { font-family: 'Fraunces', 'Times New Roman', serif; letter-spacing: -0.025em; font-weight: 500; }
  .cpa-serif   { font-family: 'Fraunces', serif; letter-spacing: -0.012em; }
  .cpa-mono    { font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }
  .cpa-label   { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
                 color: var(--ink-3); font-weight: 600; }
  .cpa-italic  { font-family: 'Fraunces', serif; font-style: italic; color: var(--emerald); font-weight: 500; }

  /* ═══ Layout shell ═══ */
  .cpa-shell {
    max-width: 1320px; margin: 0 auto;
    padding: 0 32px;
    position: relative;
  }
  @media (min-width: 1480px) {
    .cpa-shell { max-width: 1400px; }
  }

  /* ═══ Topbar (sticky, sober) ═══ */
  .cpa-topbar {
    position: sticky; top: 0; z-index: 40;
    background: oklch(0.965 0.014 82 / 0.85);
    backdrop-filter: blur(14px) saturate(140%); -webkit-backdrop-filter: blur(14px) saturate(140%);
    padding: 16px 0;
    border-bottom: 1px solid var(--line-2);
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  .cpa-topbar-logo {
    font-family: 'Fraunces', serif; font-size: 19px; font-weight: 500;
    color: var(--ink); letter-spacing: -0.015em;
  }
  .cpa-topbar-logo em { font-style: italic; color: var(--emerald); font-weight: 500; }

  .cpa-icon-btn {
    position: relative;
    width: 40px; height: 40px; border-radius: 999px;
    background: var(--paper);
    border: 1px solid var(--line);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--ink-2);
    transition: all .2s ease;
  }
  .cpa-icon-btn:hover {
    border-color: var(--ink); color: var(--ink);
  }
  .cpa-icon-btn .badge {
    position: absolute; top: -2px; right: -2px;
    min-width: 16px; height: 16px; padding: 0 4px;
    border-radius: 999px;
    background: var(--rouge); color: white;
    font-size: 9px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--bg);
  }

  /* ═══ Hero greeting (XXL serif) ═══ */
  .cpa-hero {
    margin: 36px 0 32px;
    position: relative;
  }
  .cpa-hero-eyebrow {
    font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
    color: var(--ink-3); font-weight: 600;
  }
  .cpa-hero-title {
    font-family: 'Fraunces', serif;
    font-size: clamp(40px, 8vw, 80px);
    font-weight: 500; line-height: 1;
    color: var(--ink); letter-spacing: -0.035em;
    margin: 14px 0 14px;
  }
  .cpa-hero-sub {
    font-family: 'Fraunces', serif;
    font-size: 18px; line-height: 1.5; color: var(--ink-3);
    font-style: italic; max-width: 620px;
  }
  @media (min-width: 1280px) {
    .cpa-hero { margin: 48px 0 40px; }
    .cpa-hero-title { font-size: clamp(56px, 6vw, 88px); }
    .cpa-hero-sub { font-size: 20px; }
  }

  /* ═══ Tabs nav (top center, like reference) ═══ */
  .cpa-tabs {
    display: inline-flex; gap: 4px; padding: 5px;
    background: var(--paper); border-radius: 999px;
    border: 1px solid var(--line);
  }
  .cpa-tab {
    padding: 10px 20px; border-radius: 999px;
    background: transparent; border: none; cursor: pointer;
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
    color: var(--ink-3); transition: all .2s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .cpa-tab:hover { color: var(--ink); }
  .cpa-tab.active {
    background: var(--ink); color: var(--paper);
    box-shadow: 0 4px 12px oklch(0.20 0.04 250 / 0.18);
  }

  /* ═══ KPI CARDS (4 colonnes pastel) ═══ */
  .cpa-kpi-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
    margin-bottom: 32px;
  }
  .cpa-kpi {
    padding: 24px 26px;
    border-radius: 20px;
    border: 1px solid;
    transition: transform .25s ease, box-shadow .25s ease;
    position: relative;
    overflow: hidden;
  }
  .cpa-kpi:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 30px -10px rgba(20, 25, 40, 0.12);
  }
  .cpa-kpi-label {
    font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
    font-weight: 700; opacity: 0.75;
  }
  .cpa-kpi-value {
    font-family: 'Fraunces', serif; font-weight: 500; letter-spacing: -0.03em;
    font-size: 40px; line-height: 1; margin: 14px 0 8px;
  }
  .cpa-kpi-hint {
    font-size: 12px; opacity: 0.78;
  }
  @media (min-width: 1280px) {
    .cpa-kpi-value { font-size: 44px; }
    .cpa-kpi { padding: 26px 28px; }
  }
  .cpa-kpi.k-blue { background: var(--pastel-blue); border-color: oklch(0.85 0.06 240); color: var(--pastel-blue-fg); }
  .cpa-kpi.k-sage { background: var(--pastel-sage); border-color: oklch(0.85 0.07 165); color: var(--pastel-sage-fg); }
  .cpa-kpi.k-rose { background: var(--pastel-rose); border-color: oklch(0.86 0.06 25); color: var(--pastel-rose-fg); }
  .cpa-kpi.k-ocre { background: var(--pastel-ocre); border-color: oklch(0.86 0.07 80); color: var(--pastel-ocre-fg); }
  .cpa-kpi.k-lilas{ background: var(--pastel-lilas); border-color: oklch(0.85 0.06 290); color: var(--pastel-lilas-fg); }

  /* ═══ Layout 2 cols (desktop) + stack (mobile) ═══ */
  .cpa-cols {
    display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
    gap: 24px; align-items: flex-start;
  }
  @media (min-width: 1280px) {
    .cpa-cols { gap: 28px; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); }
  }
  @media (max-width: 880px) {
    .cpa-cols { grid-template-columns: 1fr; gap: 14px; }
    .cpa-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 18px; }
    .cpa-shell { padding: 0 16px; }
    .cpa-hero { margin: 18px 0 16px; }
    .cpa-hero-title { font-size: clamp(32px, 9vw, 52px) !important; }
    .cpa-section { padding: 20px 18px; border-radius: 18px; }
    .cpa-section-title { font-size: 22px; }
    .cpa-tabs { display: flex; overflow-x: auto; max-width: 100%; }
    .cpa-tab { padding: 9px 16px; font-size: 12px; white-space: nowrap; }
    .cpa-kpi { padding: 16px 16px; }
    .cpa-kpi-value { font-size: 30px; }
    .cpa-intv-row { grid-template-columns: 64px 1fr auto; gap: 12px; padding: 12px; }
    .cpa-intv-date .day-num { font-size: 18px; }
    .cpa-cta { padding: 14px 18px; font-size: 12px; }
    .cpa-amount { font-size: clamp(44px, 11vw, 60px) !important; }
  }
  @media (max-width: 540px) {
    .cpa-shell { padding: 0 12px; }
    .cpa-section { padding: 16px 16px; border-radius: 16px; }
    .cpa-section-head { flex-wrap: wrap; gap: 6px; }
    .cpa-section-title { font-size: 19px; }
    .cpa-section-link { font-size: 12px; }
    .cpa-hero-sub { font-size: 14px; }
    .cpa-pill { font-size: 9px; padding: 3px 8px; }
    .cpa-intv-row { padding: 10px; gap: 10px; grid-template-columns: 56px 1fr auto; }
    .cpa-intv-date { padding: 7px 4px; }
    .cpa-intv-date .day-num { font-size: 16px; }
    .cpa-msg { padding: 12px 14px; }
    .cpa-msg-head { gap: 6px; }
    .cpa-icon-btn { width: 36px; height: 36px; }
    .cpa-topbar { padding: 12px 0; }
    .cpa-topbar-logo { font-size: 16px; }
  }
  @media (max-width: 420px) {
    .cpa-kpi-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    .cpa-kpi { padding: 14px 14px; }
    .cpa-kpi-value { font-size: 26px; }
    .cpa-kpi-label { font-size: 9px; letter-spacing: 0.1em; }
    .cpa-kpi-hint { font-size: 11px; }
    .cpa-shell { padding: 0 10px; }
    .cpa-tab { padding: 8px 12px; font-size: 11px; }
  }

  /* ═══ Section card (like "Prochaines interventions" container) ═══ */
  .cpa-section {
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 24px;
    padding: 30px 30px;
    margin-bottom: 22px;
    transition: border-color .25s ease, box-shadow .25s ease;
  }
  .cpa-section:hover {
    border-color: oklch(0.82 0.014 240);
  }
  .cpa-section-head {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 20px;
  }
  .cpa-section-title {
    font-family: 'Fraunces', serif; font-size: 30px; font-weight: 500;
    color: var(--ink); letter-spacing: -0.02em; line-height: 1;
  }
  .cpa-section-link {
    color: var(--ink-2); text-decoration: none; font-size: 13px;
    font-weight: 500;
    transition: color .2s;
    display: inline-flex; align-items: center; gap: 4px;
  }
  .cpa-section-link:hover { color: var(--emerald); }
  @media (min-width: 1280px) {
    .cpa-section { padding: 32px 34px; }
    .cpa-section-title { font-size: 32px; }
  }
  /* Sticky sidebar sur desktop large pour que le panel droit reste visible au scroll */
  @media (min-width: 1100px) {
    .cpa-cols > *:last-child { position: sticky; top: 80px; }
  }

  /* ═══ Intervention row (style référence) ═══ */
  .cpa-intv-row {
    display: grid; grid-template-columns: 86px 1fr auto;
    gap: 18px; align-items: center;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: 16px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: border-color .2s, transform .2s;
  }
  .cpa-intv-row:hover { border-color: var(--ink); transform: translateY(-1px); }
  .cpa-intv-date {
    background: var(--pastel-blue); color: var(--pastel-blue-fg);
    border-radius: 12px; padding: 10px 6px; text-align: center;
    font-family: 'Inter', sans-serif;
  }
  .cpa-intv-date .day-name {
    font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
    font-weight: 700; opacity: 0.7;
  }
  .cpa-intv-date .day-num {
    font-family: 'Fraunces', serif; font-size: 22px;
    font-weight: 500; line-height: 1; margin-top: 2px;
  }

  /* ═══ Status pills ═══ */
  .cpa-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 999px;
    font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase;
    font-weight: 700;
    border: 1px solid;
  }
  .cpa-pill.confirmed { background: var(--pastel-sage); color: var(--pastel-sage-fg); border-color: oklch(0.80 0.10 165); }
  .cpa-pill.pending   { background: var(--pastel-ocre); color: var(--pastel-ocre-fg); border-color: oklch(0.80 0.10 80); }
  .cpa-pill.late      { background: var(--pastel-rose); color: var(--pastel-rose-fg); border-color: oklch(0.80 0.12 25); }
  .cpa-pill.recurrent { background: var(--pastel-lilas); color: var(--pastel-lilas-fg); border-color: oklch(0.80 0.10 290); }

  /* ═══ Hero dark card (devis = preserved magazine) ═══ */
  .cpa-dark {
    background: linear-gradient(165deg, oklch(0.16 0.04 250) 0%, oklch(0.20 0.06 165) 100%);
    color: oklch(0.97 0.005 80);
    border-radius: 24px;
    padding: 28px;
    position: relative; overflow: hidden;
    box-shadow: 0 14px 36px oklch(0.10 0.04 250 / 0.18);
  }
  .cpa-dark::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 80% 20%, oklch(0.45 0.18 165 / 0.32), transparent 60%);
    pointer-events: none;
  }
  .cpa-amount {
    font-family: 'Fraunces', serif; font-weight: 500; line-height: 1;
    font-size: clamp(52px, 11vw, 80px); letter-spacing: -0.04em;
    color: oklch(0.97 0.005 80);
  }
  .cpa-amount-currency {
    font-size: 0.4em; color: oklch(0.78 0.13 80); font-style: italic;
    margin-left: 6px; letter-spacing: 0; font-weight: 400;
  }

  /* ═══ Buttons ═══ */
  .cpa-cta {
    width: 100%; display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 14px 22px; border-radius: 14px;
    background: var(--ink); color: var(--paper); border: none;
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer; transition: all .2s;
    box-shadow: 0 6px 16px oklch(0.20 0.04 250 / 0.18);
  }
  .cpa-cta:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px oklch(0.20 0.04 250 / 0.22);
  }
  .cpa-cta:disabled { opacity: 0.45; cursor: wait; }

  .cpa-cta-ghost {
    width: 100%; display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 13px 20px; border-radius: 14px;
    background: var(--paper); color: var(--ink); border: 1.5px solid var(--ink);
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all .2s;
  }
  .cpa-cta-ghost:hover { background: var(--ink); color: var(--paper); }

  .cpa-cta-ghost-dark {
    width: 100%; display: inline-flex; align-items: center; justify-content: center;
    gap: 6px; padding: 13px 20px; border-radius: 14px;
    background: transparent; color: oklch(0.92 0.04 85);
    border: 1px solid oklch(0.40 0.04 60);
    font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all .2s;
  }
  .cpa-cta-ghost-dark:hover { background: oklch(0.22 0.04 60); }

  .cpa-cta-dark {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 13px 20px; border-radius: 14px;
    background: var(--ink); color: var(--paper); border: none;
    font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: opacity .2s; width: 100%;
  }
  .cpa-cta-dark:hover { opacity: 0.88; }

  .cpa-chip-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 8px 14px; border-radius: 999px;
    background: var(--paper); border: 1px solid var(--line);
    font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500;
    color: var(--ink-2); cursor: pointer; transition: all .2s;
  }
  .cpa-chip-btn:hover { border-color: var(--ink); color: var(--ink); }
  .cpa-chip-btn.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }

  /* ═══ Card primitive ═══ */
  .cpa-card {
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 22px;
  }
  .cpa-card-click {
    cursor: pointer;
    transition: transform .2s ease, border-color .2s ease;
  }
  .cpa-card-click:hover { transform: translateY(-1px); border-color: var(--ink); }

  /* ═══ Bottom nav (mobile only) ═══ */
  .cpa-nav {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: oklch(0.985 0.008 85 / 0.95);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid var(--line-2);
    display: none; padding: 10px 12px 20px; z-index: 50;
  }
  @media (max-width: 880px) {
    .cpa-nav { display: flex; }
  }
  .cpa-nav-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 4px; padding: 8px 4px; background: transparent; border: none;
    cursor: pointer; color: var(--ink-3); transition: color .15s;
    position: relative;
  }
  .cpa-nav-btn.active { color: var(--ink); }
  .cpa-nav-btn span { font-size: 10px; font-weight: 600; }
  .cpa-nav-dot {
    position: absolute; top: 4px; right: 50%; transform: translateX(12px);
    width: 6px; height: 6px; border-radius: 999px; background: var(--rouge);
  }

  /* ═══ Map trail (preserved) ═══ */
  .cpa-trail {
    position: relative; height: 140px; border-radius: 16px;
    background: var(--surface);
    border: 1px solid var(--line);
    background-image:
      repeating-linear-gradient(0deg, oklch(0.92 0.010 78) 0 1px, transparent 1px 22px),
      repeating-linear-gradient(90deg, oklch(0.92 0.010 78) 0 1px, transparent 1px 22px);
    overflow: hidden;
  }

  /* ═══ Drawer (notifications) ═══ */
  .cpa-drawer-back {
    position: fixed; inset: 0; background: oklch(0.20 0.04 250 / 0.4);
    backdrop-filter: blur(4px); z-index: 90;
  }
  .cpa-drawer {
    position: fixed; top: 0; right: 0; bottom: 0;
    width: 88vw; max-width: 420px;
    background: var(--paper); z-index: 91;
    border-left: 1px solid var(--line);
    display: flex; flex-direction: column;
    animation: cpa-slide-in .25s cubic-bezier(.16,1,.3,1);
  }
  @keyframes cpa-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }

  /* ═══ Burger menu desktop (slide-in depuis la gauche) ═══ */
  .cpa-burger-back {
    position: fixed; inset: 0;
    background: oklch(0.30 0.03 250 / 0.28);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    z-index: 90;
    animation: cpa-fade-bg .25s ease;
  }
  @keyframes cpa-fade-bg { from { opacity: 0; } to { opacity: 1; } }
  .cpa-burger {
    position: fixed; top: 0; left: 0; bottom: 0;
    width: 320px; max-width: 88vw;
    background: #fffaf3;
    color: oklch(0.20 0.04 250);
    z-index: 91;
    border-right: 1px solid oklch(0.88 0.012 240);
    display: flex; flex-direction: column;
    box-shadow: 12px 0 40px oklch(0.20 0.04 250 / 0.18);
    animation: cpa-slide-from-left .3s cubic-bezier(.16,1,.3,1);
  }
  @keyframes cpa-slide-from-left { from { transform: translateX(-100%); } to { transform: translateX(0); } }

  .cpa-burger-btn {
    width: 40px; height: 40px; border-radius: 12px;
    background: #fffaf3;
    border: 1px solid oklch(0.88 0.012 240);
    display: none; align-items: center; justify-content: center;
    cursor: pointer; color: oklch(0.36 0.03 250);
    transition: all .15s;
  }
  .cpa-burger-btn:hover {
    border-color: oklch(0.20 0.04 250);
    color: oklch(0.20 0.04 250);
    background: oklch(0.99 0.005 85);
  }
  @media (min-width: 881px) {
    .cpa-burger-btn { display: inline-flex; }
  }

  .cpa-burger-item {
    display: flex; align-items: center; gap: 14px;
    padding: 13px 16px; border-radius: 12px;
    background: transparent;
    border: 1px solid transparent;
    color: oklch(0.20 0.04 250);
    cursor: pointer;
    font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;
    text-align: left; width: 100%;
    transition: all .15s; position: relative;
  }
  .cpa-burger-item:hover {
    background: oklch(0.96 0.014 80);
    border-color: oklch(0.88 0.012 240);
  }
  .cpa-burger-item.active {
    background: oklch(0.20 0.04 250);
    color: #fffaf3 !important;
    box-shadow: 0 8px 22px oklch(0.20 0.04 250 / 0.30);
  }
  .cpa-burger-item.active * { color: #fffaf3 !important; }
  .cpa-burger-item.active svg { color: #fffaf3 !important; stroke: #fffaf3; }
  .cpa-burger-item .cpa-burger-dot {
    position: absolute; top: 50%; right: 14px;
    transform: translateY(-50%);
    width: 8px; height: 8px; border-radius: 999px;
    background: oklch(0.50 0.16 25);
    box-shadow: 0 0 8px oklch(0.50 0.16 25 / 0.6);
  }

  @keyframes cpa-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .cpa-fade { animation: cpa-fade .4s cubic-bezier(.16,1,.3,1); }

  /* ═══ Message bubble ═══ */
  .cpa-msg {
    padding: 14px 16px; border-radius: 16px;
    background: var(--surface); border: 1px solid var(--line-2);
    margin-bottom: 10px;
  }
  .cpa-msg-head {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 6px;
  }
  .cpa-msg-author { font-weight: 600; font-size: 14px; color: var(--ink); }
  .cpa-msg-role { font-size: 12px; color: var(--ink-3); margin-top: 1px; }
  .cpa-msg-time { font-size: 11px; color: var(--ink-3); }
  .cpa-msg-body { font-size: 13px; color: var(--ink-2); line-height: 1.55; }

  /* ═══ INPUTS — anti-autofill (fix invisible text mobile) ═══ */
  .cpa-root input,
  .cpa-root textarea,
  .cpa-root select {
    color: var(--ink);
    -webkit-text-fill-color: var(--ink);
    caret-color: var(--ink);
    background-color: transparent;
    font-family: inherit;
  }
  .cpa-root input::placeholder,
  .cpa-root textarea::placeholder {
    color: var(--ink-3);
    -webkit-text-fill-color: var(--ink-3);
    opacity: 1;
  }
  .cpa-root input:-webkit-autofill,
  .cpa-root input:-webkit-autofill:hover,
  .cpa-root input:-webkit-autofill:focus,
  .cpa-root input:-webkit-autofill:active {
    -webkit-text-fill-color: var(--ink) !important;
    -webkit-box-shadow: 0 0 0 30px var(--surface) inset !important;
    box-shadow: 0 0 0 30px var(--surface) inset !important;
    transition: background-color 9999s ease-in-out 0s;
    caret-color: var(--ink) !important;
  }
  .cpa-root input:focus,
  .cpa-root textarea:focus { outline: none; }

  /* ═══ Invoice row (sidebar style) ═══ */
  .cpa-inv-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 0; border-bottom: 1px solid var(--line-2);
    cursor: pointer; transition: padding-left .2s;
  }
  .cpa-inv-row:hover { padding-left: 4px; }
  .cpa-inv-row:last-child { border-bottom: none; }
`;

/* ═══════════ HELPERS ═══════════ */
const fmtEur = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
const fmtEur2 = (n) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};
const fmtDateShort = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); }
  catch { return '—'; }
};
const fmtTime = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};
const greeting = () => {
  const h = new Date().getHours();
  return h < 6 ? 'Bonsoir' : h < 13 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
};

/* ═══════════ LOGIN MAGIC LINK ═══════════ */
function PortalLogin({ onAuth, magicError, initialMode = 'login', initialResetToken = null }) {
  // mode: 'login' | 'register' | 'forgot' | 'reset' | 'forgot-sent'
  const [mode, setMode] = useState(initialResetToken ? 'reset' : initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [name, setName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Persist session token + auth user
  const persistAuth = (data) => {
    if (data?.token) {
      localStorage.setItem('portal_token', data.token);
      pAxios.defaults.headers.common['X-Portal-Token'] = data.token;
    }
    onAuth({ lead_id: data.lead_id, lead_name: data.lead_name, name: data.lead_name, email: data.email });
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password }, { withCredentials: true });
      persistAuth(res.data);
      toast.success('Bienvenue');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Connexion impossible');
    }
    setLoading(false);
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères'); return; }
    if (password !== password2) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/register`, { email, password, name: name || null }, { withCredentials: true });
      persistAuth(res.data);
      toast.success('Compte sécurisé — bienvenue');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Création impossible');
    }
    setLoading(false);
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await axios.post(`${API_URL}/forgot`, { email });
      setMode('forgot-sent');
    } catch (err) {
      setError('Erreur réseau — réessayez');
    }
    setLoading(false);
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères'); return; }
    if (password !== password2) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/reset`, { token: initialResetToken, password }, { withCredentials: true });
      persistAuth(res.data);
      toast.success('Mot de passe défini — bienvenue');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Lien invalide ou expiré');
    }
    setLoading(false);
  };

  const requestMagicLink = async () => {
    if (!email) { setError('Saisissez votre email d\'abord'); return; }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/magic-link`, { email });
      toast.success('Lien envoyé — vérifiez votre boîte mail');
    } catch { toast.error('Envoi impossible'); }
    setLoading(false);
  };

  const titles = {
    login: { eyebrow: 'Espace Client', title: <>Votre <em className="cpa-italic">espace</em></>, sub: 'Connectez-vous pour accéder à vos devis, factures et suivi d\'intervention.' },
    register: { eyebrow: 'Première connexion', title: <>Créez votre <em className="cpa-italic">accès</em></>, sub: 'Définissez un mot de passe pour sécuriser votre espace personnel.' },
    forgot: { eyebrow: 'Mot de passe oublié', title: <>On vous <em className="cpa-italic">aide</em></>, sub: 'Saisissez votre email — nous vous envoyons un lien pour choisir un nouveau mot de passe.' },
    'forgot-sent': { eyebrow: 'Email envoyé', title: <>C'est <em className="cpa-italic">parti</em></>, sub: 'Si un compte existe pour cet email, vous recevrez un lien sous quelques secondes. Vérifiez aussi vos spams.' },
    reset: { eyebrow: 'Nouveau mot de passe', title: <>Choisissez votre <em className="cpa-italic">mot de passe</em></>, sub: 'Au moins 8 caractères. Vous serez automatiquement connecté ensuite.' },
  };
  const t = titles[mode] || titles.login;

  const inputBox = {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
    padding: '12px 14px', marginBottom: 12,
  };
  const inputStyle = { flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 14, color: 'var(--ink)' };
  const linkBtn = {
    background: 'transparent', border: 'none', color: 'var(--emerald)',
    fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
    cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2,
  };

  return (
    <div className="cpa-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, minHeight: '100vh' }}>
      <style>{tokenStyle}</style>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="cpa-label" style={{ marginBottom: 12 }}>{t.eyebrow}</div>
          <h1 className="cpa-display" style={{ fontSize: 44, fontWeight: 500, lineHeight: 1, margin: 0, letterSpacing: '-0.03em' }}>
            {t.title}
          </h1>
          <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.5 }}>
            {t.sub}
          </p>
        </div>

        <div className="cpa-card" style={{ padding: '24px 22px' }}>
          {(error || magicError) && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--pastel-rose)', color: 'var(--pastel-rose-fg)', fontSize: 13, marginBottom: 14, fontWeight: 500 }}>
              {error || magicError}
            </div>
          )}

          {/* ─── LOGIN ─── */}
          {mode === 'login' && (
            <form onSubmit={submitLogin}>
              <label className="cpa-label" style={{ display: 'block', marginBottom: 8 }}>Email</label>
              <div style={inputBox}>
                <Mail style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" style={inputStyle} />
              </div>
              <label className="cpa-label" style={{ display: 'block', marginBottom: 8, marginTop: 4 }}>Mot de passe</label>
              <div style={inputBox}>
                <Shield style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                <input type={showPwd ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                <button type="button" onClick={() => setShowPwd(s => !s)} style={{ background: 'transparent', border: 0, color: 'var(--ink-3)', cursor: 'pointer', fontSize: 11, padding: 4 }}>
                  {showPwd ? 'Cacher' : 'Voir'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <button type="button" onClick={() => { setError(null); setMode('forgot'); }} style={linkBtn}>Mot de passe oublié ?</button>
              </div>
              <button type="submit" disabled={loading || !email || !password} className="cpa-cta">
                {loading ? 'Connexion…' : 'Se connecter'} <ArrowRight style={{ width: 14, height: 14 }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 14px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
                <span style={{ fontFamily: 'Inter', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>ou</span>
                <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
              </div>
              <button type="button" onClick={() => { setError(null); setMode('register'); }} className="cpa-cta-ghost" style={{ marginBottom: 10 }}>
                Première connexion ? Créer mon mot de passe
              </button>
              <button type="button" onClick={requestMagicLink} disabled={loading || !email} style={{
                width: '100%', padding: '11px 14px', borderRadius: 12,
                background: 'transparent', border: '1px dashed var(--line)',
                color: 'var(--ink-3)', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Mail style={{ width: 12, height: 12 }} /> Recevoir un lien magique à la place
              </button>
            </form>
          )}

          {/* ─── REGISTER ─── */}
          {mode === 'register' && (
            <form onSubmit={submitRegister}>
              <label className="cpa-label" style={{ display: 'block', marginBottom: 8 }}>Email</label>
              <div style={inputBox}>
                <Mail style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" style={inputStyle} />
              </div>
              <label className="cpa-label" style={{ display: 'block', marginBottom: 8 }}>Nom (optionnel)</label>
              <div style={inputBox}>
                <User style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Prénom Nom" style={inputStyle} />
              </div>
              <label className="cpa-label" style={{ display: 'block', marginBottom: 8 }}>Mot de passe (8 caractères min.)</label>
              <div style={inputBox}>
                <Shield style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                <input type={showPwd ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                <button type="button" onClick={() => setShowPwd(s => !s)} style={{ background: 'transparent', border: 0, color: 'var(--ink-3)', cursor: 'pointer', fontSize: 11, padding: 4 }}>
                  {showPwd ? 'Cacher' : 'Voir'}
                </button>
              </div>
              <label className="cpa-label" style={{ display: 'block', marginBottom: 8 }}>Confirmer</label>
              <div style={inputBox}>
                <Shield style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                <input type={showPwd ? 'text' : 'password'} required value={password2} onChange={e => setPassword2(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading || !email || !password || !password2} className="cpa-cta" style={{ marginTop: 4 }}>
                {loading ? 'Création…' : 'Créer mon accès'} <Check style={{ width: 14, height: 14 }} />
              </button>
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button type="button" onClick={() => { setError(null); setMode('login'); }} style={linkBtn}>← Retour à la connexion</button>
              </div>
            </form>
          )}

          {/* ─── FORGOT ─── */}
          {mode === 'forgot' && (
            <form onSubmit={submitForgot}>
              <label className="cpa-label" style={{ display: 'block', marginBottom: 8 }}>Votre email</label>
              <div style={inputBox}>
                <Mail style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading || !email} className="cpa-cta">
                {loading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'} <ArrowRight style={{ width: 14, height: 14 }} />
              </button>
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button type="button" onClick={() => { setError(null); setMode('login'); }} style={linkBtn}>← Retour à la connexion</button>
              </div>
            </form>
          )}

          {/* ─── FORGOT SENT ─── */}
          {mode === 'forgot-sent' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--pastel-sage)', color: 'var(--pastel-sage-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Mail style={{ width: 24, height: 24 }} />
              </div>
              <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>
                Lien envoyé à <strong style={{ color: 'var(--ink)' }}>{email}</strong>.<br/>
                Cliquez dans l'email pour choisir votre nouveau mot de passe.
              </p>
              <button onClick={() => { setError(null); setMode('login'); }} className="cpa-cta-ghost" style={{ marginTop: 18 }}>
                ← Retour à la connexion
              </button>
            </div>
          )}

          {/* ─── RESET (via reset link) ─── */}
          {mode === 'reset' && (
            <form onSubmit={submitReset}>
              <label className="cpa-label" style={{ display: 'block', marginBottom: 8 }}>Nouveau mot de passe (8 caractères min.)</label>
              <div style={inputBox}>
                <Shield style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                <input type={showPwd ? 'text' : 'password'} required autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                <button type="button" onClick={() => setShowPwd(s => !s)} style={{ background: 'transparent', border: 0, color: 'var(--ink-3)', cursor: 'pointer', fontSize: 11, padding: 4 }}>
                  {showPwd ? 'Cacher' : 'Voir'}
                </button>
              </div>
              <label className="cpa-label" style={{ display: 'block', marginBottom: 8 }}>Confirmer</label>
              <div style={inputBox}>
                <Shield style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                <input type={showPwd ? 'text' : 'password'} required value={password2} onChange={e => setPassword2(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading || !password || !password2} className="cpa-cta">
                {loading ? 'Enregistrement…' : 'Définir et se connecter'} <ArrowRight style={{ width: 14, height: 14 }} />
              </button>
            </form>
          )}
        </div>

        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 12,
          background: 'var(--pastel-sage)', border: '1px solid oklch(0.80 0.10 165)',
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12,
          color: 'var(--pastel-sage-fg)', lineHeight: 1.5, textAlign: 'center',
        }}>
          <Shield style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Espace 100 % sécurisé — chiffrement bcrypt, sessions 30 jours
        </div>
      </div>
    </div>
  );
}

/* ═══════════ MAP TRAIL (pour vue intervention) ═══════════ */
function MapTrail({ distance = '12 m' }) {
  return (
    <div className="cpa-trail">
      <div style={{
        position: 'absolute', top: 10, left: 12,
        padding: '4px 10px', borderRadius: 999,
        background: 'var(--paper)', border: '1px solid var(--line)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-2)',
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        📍 {distance} de la cible
      </div>
      <svg viewBox="0 0 400 160" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="cpa-target-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="oklch(0.52 0.13 165)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="oklch(0.52 0.13 165)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="340" cy="70" r="60" fill="url(#cpa-target-glow)" />
        <path
          d="M 40 110 Q 120 60, 180 100 T 340 70"
          fill="none" stroke="oklch(0.52 0.13 165)" strokeWidth="2.5"
          strokeDasharray="4 5" strokeLinecap="round"
        />
        <circle cx="40" cy="110" r="6" fill="oklch(0.52 0.13 165)" />
        <circle cx="340" cy="70" r="8" fill="oklch(0.165 0.012 60)" />
      </svg>
    </div>
  );
}

/* ═══════════ QUOTE HERO ═══════════ */
function QuoteHeroFull({ quote, advisor, onSign, onRefuse, onChat, onDownload }) {
  // Items détaillés (line_items) ou liste générique
  const lineItems = useMemo(() => {
    if (Array.isArray(quote.line_items) && quote.line_items.length) {
      return quote.line_items.map(li => ({
        group: li.group || 'Prestations',
        label: li.label || li.description || '',
        qty: Number(li.qty || li.quantity || 1),
        unit: li.unit || 'forfait',
        price: Number(li.price || li.unit_price || 0),
      })).filter(li => li.label);
    }
    return [];
  }, [quote]);

  const totals = useMemo(() => {
    const ttc = Number(quote.amount ?? 0);
    const tvaRate = Number(quote.tva_rate ?? 0);
    const discount = Number(quote.discount ?? 0);
    const transportEnabled = !!quote.transport_fee_enabled;
    const transportAmount = Number(quote.transport_fee_amount ?? 0);
    const ht = quote.amount_ht != null
      ? Number(quote.amount_ht)
      : (tvaRate > 0 ? ttc / (1 + tvaRate / 100) : ttc);
    const tva = Math.max(0, ttc - ht);
    return { ht, tva, ttc, tvaRate, discount, transportEnabled, transportAmount };
  }, [quote]);

  const isPending = ['envoyé', 'envoye'].includes(quote.status);
  const isDone = ['accepté', 'accepte', 'signé'].includes(quote.status);
  const isRefused = ['refusé', 'refuse'].includes(quote.status);
  const validity = quote.expiry_date
    ? new Date(quote.expiry_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  // Groupage des line_items par section
  const groupedItems = useMemo(() => {
    const groups = {};
    lineItems.forEach(li => {
      if (!groups[li.group]) groups[li.group] = [];
      groups[li.group].push(li);
    });
    return groups;
  }, [lineItems]);

  return (
    <div className="cpa-fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ─── Header : numéro + statut ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="cpa-label">Devis {quote.quote_number || quote.quote_id?.slice(-8).toUpperCase()}</div>
          <h2 className="cpa-display" style={{ fontSize: 28, fontWeight: 500, margin: '6px 0 0', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Votre <em className="cpa-italic">devis</em> est prêt
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {quote.frequency && quote.frequency !== 'unique' && (
            <span className="cpa-pill recurrent">Récurrent</span>
          )}
          {isPending && <span className="cpa-pill pending">À signer</span>}
          {isDone && <span className="cpa-pill confirmed">✓ Accepté</span>}
          {isRefused && <span className="cpa-pill late">Refusé</span>}
        </div>
      </div>

      {/* ─── Hero TOTAL TTC pastel sage ─── */}
      <div style={{
        padding: '24px 24px',
        borderRadius: 20,
        background: 'var(--pastel-sage)',
        border: '1px solid oklch(0.80 0.10 165)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div className="cpa-label" style={{ color: 'var(--pastel-sage-fg)' }}>Total TTC</div>
        <div className="cpa-display" style={{
          fontSize: 'clamp(48px, 12vw, 76px)', fontWeight: 500,
          color: 'var(--pastel-sage-fg)', lineHeight: 0.95, letterSpacing: '-0.04em',
          marginTop: 6,
        }}>
          {fmtEur(totals.ttc)}<span style={{ fontSize: '0.42em', fontFamily: 'Fraunces, serif', fontStyle: 'italic', marginLeft: 8, opacity: 0.65 }}>€</span>
        </div>
        <div style={{
          marginTop: 8,
          fontSize: 13,
          color: 'var(--pastel-sage-fg)',
          opacity: 0.8,
          fontFamily: 'Inter, sans-serif',
        }}>
          {fmtEur(totals.ht)} € HT
          {totals.tvaRate > 0 ? ` · TVA ${totals.tvaRate}% (${fmtEur(totals.tva)} €)` : ' · TVA non applicable'}
        </div>
      </div>

      {/* ─── Détail des prestations (line_items groupés) ─── */}
      {lineItems.length > 0 ? (
        <div style={{
          padding: '20px 22px', borderRadius: 18,
          background: 'var(--paper)', border: '1px solid var(--line)',
        }}>
          <div className="cpa-label" style={{ marginBottom: 14 }}>Détail des prestations</div>
          {Object.entries(groupedItems).map(([groupName, items]) => (
            <div key={groupName} style={{ marginBottom: 14 }}>
              {Object.keys(groupedItems).length > 1 && (
                <div className="cpa-mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--pastel-sage-fg)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {groupName}
                </div>
              )}
              {items.map((li, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  padding: '10px 0',
                  borderBottom: i < items.length - 1 ? '1px solid var(--line-2)' : 'none',
                  gap: 14,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                      {li.label}
                    </div>
                    <div className="cpa-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                      {li.qty} {li.unit} × {fmtEur(li.price)} €
                    </div>
                  </div>
                  <div className="cpa-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)' }}>
                    {fmtEur(li.qty * li.price)} €
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Sous-totaux */}
          <div style={{ paddingTop: 14, borderTop: '1.5px solid var(--line)', marginTop: 4 }}>
            {totals.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--pastel-sage-fg)', marginBottom: 4 }}>
                <span>Remise {totals.discount}%</span>
                <span className="cpa-mono">−{fmtEur(totals.ht * totals.discount / 100)} €</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>
              <span>Sous-total HT</span>
              <span className="cpa-mono">{fmtEur(totals.ht - (totals.transportEnabled ? totals.transportAmount : 0))} €</span>
            </div>
            {totals.transportEnabled ? (
              totals.transportAmount > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>
                  <span>Frais de déplacement</span>
                  <span className="cpa-mono">{fmtEur(totals.transportAmount)} €</span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--pastel-sage-fg)', fontStyle: 'italic', marginBottom: 4 }}>
                  <span>Frais de déplacement</span>
                  <span className="cpa-mono">Offerts</span>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic', opacity: 0.75, marginBottom: 4 }}>
                <span>Frais de déplacement</span>
                <span className="cpa-mono">non inclus</span>
              </div>
            )}
            {totals.tvaRate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)' }}>
                <span>TVA {totals.tvaRate}%</span>
                <span className="cpa-mono">{fmtEur(totals.tva)} €</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Fallback : liste simple si pas de line_items
        <div style={{
          padding: '20px 22px', borderRadius: 18,
          background: 'var(--paper)', border: '1px solid var(--line)',
        }}>
          <div className="cpa-label" style={{ marginBottom: 12 }}>Inclus dans votre prestation</div>
          {[
            quote.service_type,
            quote.frequency && quote.frequency !== 'unique' ? `${quote.frequency}${quote.interventions_count > 1 ? ` · ${quote.interventions_count} passages` : ''}` : null,
            'Matériel & produits écolabel fournis',
            'Équipe formée · RC Pro',
            'Résultat garanti',
          ].filter(Boolean).map((t, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line-2)' : 'none',
              fontFamily: 'Inter', fontSize: 14, color: 'var(--ink-2)',
            }}>
              <span>{t}</span>
              <Check style={{ width: 16, height: 16, color: 'var(--pastel-sage-fg)' }} />
            </div>
          ))}
        </div>
      )}

      {/* ─── Validité + Conditions de paiement ─── */}
      {(validity || quote.payment_mode || quote.payment_delay) && (
        <div style={{
          padding: '14px 18px', borderRadius: 14,
          background: 'var(--pastel-ocre)',
          border: '1px solid oklch(0.80 0.10 80)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          {validity && (
            <div>
              <div className="cpa-label" style={{ color: 'var(--pastel-ocre-fg)' }}>Valable jusqu'au</div>
              <div className="cpa-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--pastel-ocre-fg)', marginTop: 2 }}>
                {validity}
              </div>
            </div>
          )}
          {(quote.payment_mode || quote.payment_delay) && (
            <div style={{ textAlign: 'right' }}>
              <div className="cpa-label" style={{ color: 'var(--pastel-ocre-fg)' }}>Paiement</div>
              <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 500, color: 'var(--pastel-ocre-fg)', marginTop: 2 }}>
                {quote.payment_mode || '—'}{quote.payment_delay ? ` · ${quote.payment_delay}` : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Notes / conditions particulières ─── */}
      {quote.notes && (
        <div style={{
          padding: '14px 18px', borderRadius: 14,
          background: 'var(--surface)',
          border: '1px solid var(--line-2)',
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13,
          color: 'var(--ink-2)', lineHeight: 1.6,
        }}>
          {quote.notes}
        </div>
      )}

      {/* ─── Actions ─── */}
      {isPending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <button onClick={onSign} className="cpa-cta">
            <Check style={{ width: 16, height: 16 }} /> Accepter et signer
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onChat} className="cpa-cta-ghost" style={{ flex: 1 }}>
              <MessageSquare style={{ width: 13, height: 13 }} /> Discuter
            </button>
            <button onClick={onRefuse} className="cpa-cta-ghost" style={{ flex: 1, borderColor: 'oklch(0.65 0.18 25)', color: 'oklch(0.42 0.18 25)' }}>
              <X style={{ width: 13, height: 13 }} /> Refuser
            </button>
          </div>
          <button onClick={onDownload} style={{
            width: '100%', padding: '12px', borderRadius: 14,
            background: 'transparent', border: '1px dashed var(--line)',
            color: 'var(--ink-3)', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.color = 'var(--ink-3)'; }}>
            <Download style={{ width: 13, height: 13 }} /> Télécharger en PDF
          </button>
        </div>
      )}
      {(isDone || isRefused) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <div style={{
            padding: '16px 20px', borderRadius: 14,
            background: isDone ? 'var(--pastel-sage)' : 'var(--pastel-rose)',
            color: isDone ? 'var(--pastel-sage-fg)' : 'var(--pastel-rose-fg)',
            border: `1px solid ${isDone ? 'oklch(0.80 0.10 165)' : 'oklch(0.80 0.12 25)'}`,
            fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, textAlign: 'center',
            fontWeight: 500,
          }}>
            {isDone ? '✓ Devis accepté — merci de votre confiance.' : 'Devis refusé.'}
          </div>
          <button onClick={onDownload} className="cpa-cta-ghost">
            <Download style={{ width: 13, height: 13 }} /> Télécharger le PDF
          </button>
        </div>
      )}

      {/* ─── Conseiller ─── */}
      {advisor && (
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: 'var(--pastel-blue)',
          border: '1px solid oklch(0.85 0.06 240)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 999,
            background: 'var(--pastel-blue-fg)', color: 'var(--pastel-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500,
            flexShrink: 0,
          }}>
            {(advisor.name || 'C').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cpa-label" style={{ color: 'var(--pastel-blue-fg)' }}>Votre conseiller</div>
            <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'var(--pastel-blue-fg)', marginTop: 2 }}>
              {advisor.name || 'Global Clean Home'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--pastel-blue-fg)', opacity: 0.78, marginTop: 1 }}>
              {advisor.status || 'Répond en ~5 min'}
            </div>
          </div>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--pastel-sage-fg)', boxShadow: '0 0 8px var(--pastel-sage-fg)' }} />
        </div>
      )}
    </div>
  );
}

/* ═══════════ SIGNATURE SHEET ═══════════ */
function SignatureSheet({ quote, onClose, onConfirm }) {
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  const sign = async () => {
    if (!fullName.trim()) return toast.error('Entrez votre nom complet');
    setSaving(true);
    await onConfirm(fullName);
    setSaving(false);
  };

  return (
    <BottomSheet onClose={onClose}>
      <div className="cpa-label" style={{ marginBottom: 4 }}>Signature électronique</div>
      <h2 className="cpa-display" style={{ fontSize: 26, fontWeight: 300, margin: '0 0 6px' }}>
        Signer le <em className="cpa-italic">devis</em>
      </h2>
      <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>
        Montant · {fmtEur(quote.amount)} € TTC
      </div>

      <div className="cpa-card" style={{ marginBottom: 14, padding: 18 }}>
        <div className="cpa-label" style={{ marginBottom: 6 }}>Votre nom complet</div>
        <input
          value={fullName} onChange={e => setFullName(e.target.value)} autoFocus
          placeholder="Prénom Nom"
          style={{
            width: '100%', padding: 0, border: 0, outline: 0, background: 'transparent',
            fontFamily: 'Fraunces, serif', fontSize: 22, fontStyle: 'italic', color: 'var(--ink)',
          }} />
        {fullName && (
          <div style={{
            marginTop: 14, padding: '20px 14px', borderRadius: 10,
            background: 'var(--emerald-soft)', border: '1px dashed var(--emerald)',
            textAlign: 'center',
          }}>
            <div className="cpa-label" style={{ color: 'var(--emerald-deep)', marginBottom: 6 }}>Aperçu signature</div>
            <div style={{
              fontFamily: 'Caveat, Fraunces, cursive', fontSize: 40,
              color: 'var(--emerald-deep)', lineHeight: 1,
              fontStyle: 'italic', transform: 'rotate(-2deg)',
            }}>
              {fullName}
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)',
        fontFamily: 'Fraunces, serif', fontSize: 12, fontStyle: 'italic', color: 'var(--ink-2)',
        marginBottom: 14, lineHeight: 1.5,
      }}>
        En signant, je confirme accepter le devis pour le montant de <strong style={{ fontStyle: 'normal' }}>{fmtEur(quote.amount)} € TTC</strong>. Cette signature a valeur juridique (art. 1367 du Code civil).
      </div>

      <button onClick={sign} disabled={!fullName.trim() || saving} className="cpa-cta">
        {saving ? 'Signature…' : 'Valider ma signature'} <Check style={{ width: 14, height: 14 }} />
      </button>
    </BottomSheet>
  );
}

/* ═══════════ BOTTOM SHEET (réutilisable) ═══════════ */
function BottomSheet({ onClose, children, maxHeight = '94vh' }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20, 25, 40, 0.45)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', zIndex: 95,
    }}>
      <div onClick={e => e.stopPropagation()} className="cpa-fade" style={{
        background: 'var(--paper)', width: '100%',
        borderRadius: '24px 24px 0 0', maxHeight, overflowY: 'auto',
        padding: '22px 20px 28px',
        position: 'relative',
        boxShadow: '0 -20px 60px rgba(20, 25, 40, 0.18)',
      }}>
        {/* Barre de drag + bouton retour bien visibles */}
        <div style={{
          position: 'sticky', top: -22, zIndex: 5,
          background: 'var(--paper)',
          margin: '-22px -20px 12px',
          padding: '14px 18px 10px',
          borderBottom: '1px solid var(--line-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <button
            onClick={onClose}
            aria-label="Retour"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', border: '1px solid var(--line)',
              color: 'var(--ink-2)', cursor: 'pointer',
              padding: '8px 14px', borderRadius: 999,
              fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--ink-2)'; }}
          >
            <ChevronRight style={{ width: 14, height: 14, transform: 'rotate(180deg)' }} />
            Retour
          </button>
          <div style={{ width: 40, height: 4, background: 'var(--line)', borderRadius: 999 }} />
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 32, height: 32, borderRadius: 999,
              background: 'var(--surface)', border: '1px solid var(--line)',
              color: 'var(--ink-2)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--rouge)'; e.currentTarget.style.color = 'var(--rouge)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--ink-2)'; }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ═══════════ VUE ACCUEIL — Dashboard data-driven ═══════════ */
function ViewAccueil({ client, quotes, invoices, interventions, loyalty, onOpenQuote, onOpenInvoice, onOpenIntv, onSelectTab }) {
  const pendingQuote = quotes.find(q => ['envoyé', 'envoye'].includes(q.status));
  const urgentInvoice = invoices.find(i => i.status === 'en_retard') || invoices.find(i => i.status === 'en_attente');
  const upcoming = interventions.filter(i => i.status !== 'terminée')
    .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''))[0];
  const firstName = (client?.name || client?.full_name || '').split(' ')[0] || '';

  // ═══ Aggregations data-driven (12 derniers mois + comparaison N vs N-1) ═══
  const dash = useMemo(() => {
    const now = new Date();
    const Y = now.getFullYear();
    const PY = Y - 1;
    const isPaid = (i) => ['payée', 'payee'].includes(i.status);
    const dateOf = (x) => x.paid_at || x.created_at || x.scheduled_date || x.completed_at;
    const yearOf = (iso) => { try { return new Date(iso).getFullYear(); } catch { return null; } };
    const ymOf = (iso) => { try { return iso.slice(0, 7); } catch { return ''; } };

    // Interventions par année
    const intvY = interventions.filter(i => yearOf(dateOf(i)) === Y);
    const intvPY = interventions.filter(i => yearOf(dateOf(i)) === PY);

    // Dépenses par année (factures payées)
    const sumPaid = (year) => invoices.filter(isPaid).filter(i => yearOf(dateOf(i)) === year)
      .reduce((s, i) => s + Number(i.amount_ttc || i.amount || 0), 0);
    const spentY = sumPaid(Y);
    const spentPY = sumPaid(PY);

    // Évolution YoY
    const yoyPct = spentPY > 0 ? Math.round(((spentY - spentPY) / spentPY) * 100) : null;

    // Heures cumulées (estimation 2h si non renseigné)
    const totalHours = intvY.reduce((s, i) => s + Number(i.duration_hours || 2), 0);

    // Crédit d'impôt 50 % (services à la personne — France)
    const taxCredit = Math.round(spentY * 0.5);

    // Série 12 mois glissants : { month, cur, prev }
    const monthly = [];
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const kPrev = `${d.getFullYear() - 1}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const sumMonth = (key) => invoices.filter(isPaid)
        .filter(i => ymOf(String(dateOf(i) || '')) === key)
        .reduce((s, i) => s + Number(i.amount_ttc || i.amount || 0), 0);
      monthly.push({
        m: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
        cur: Math.round(sumMonth(k)),
        prev: Math.round(sumMonth(kPrev)),
      });
    }
    const peakCur = Math.max(...monthly.map(p => p.cur), 0);

    // Répartition services (top 5)
    const services = {};
    intvY.forEach(i => {
      const k = (i.service_type || i.title || 'Autre').toString().trim() || 'Autre';
      services[k] = (services[k] || 0) + 1;
    });
    const serviceList = Object.entries(services)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      Y, PY,
      intvY: intvY.length, intvPY: intvPY.length,
      spentY, spentPY, yoyPct,
      totalHours, taxCredit,
      monthly, peakCur,
      serviceList,
      hasData: intvY.length + intvPY.length + spentY > 0,
    };
  }, [interventions, invoices]);

  const points = loyalty?.points || 0;
  const tier = points >= 1000 ? 'Platinum' : points >= 500 ? 'Or' : points >= 100 ? 'Argent' : 'Bronze';

  // Score qualité (note moyenne des reviews) — fallback à 9.7/10 par défaut visuel
  const qualityScore = useMemo(() => {
    const rated = interventions.filter(i => i.review_rating > 0);
    if (rated.length === 0) return null;
    const avg = rated.reduce((s, i) => s + Number(i.review_rating || 0), 0) / rated.length;
    return { value: (avg * 2).toFixed(1), count: rated.length };
  }, [interventions]);

  // 5 prochaines interventions
  const upcomingList = useMemo(() => interventions
    .filter(i => i.status !== 'terminée')
    .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''))
    .slice(0, 5)
  , [interventions]);

  // 3 dernières factures
  const recentInvoices = useMemo(() => [...invoices]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 3)
  , [invoices]);

  const dayLabels = ['DIM.', 'LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.'];
  const fmtIntvDate = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return { day: dayLabels[d.getDay()], num: d.getDate(), month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') };
    } catch { return null; }
  };

  return (
    <div className="cpa-fade" style={{ padding: '0 0 32px' }}>
      {/* ═══════════ HERO GREETING ═══════════ */}
      <div className="cpa-hero">
        <div className="cpa-hero-eyebrow">Tableau de bord</div>
        <h1 className="cpa-hero-title">
          {greeting()} {firstName || 'vous'} <span style={{ display: 'inline-block', transformOrigin: '70% 70%', animation: 'cpa-wave 2s ease-in-out 1' }}>👋</span>
        </h1>
        <div className="cpa-hero-sub">
          {dash.intvY > 0
            ? <>Aperçu de vos interventions, factures et messages — <em style={{ color: 'var(--emerald)' }}>{dash.intvY} passage{dash.intvY > 1 ? 's' : ''} cette année</em>.</>
            : <>Bienvenue dans votre espace privé.</>}
        </div>
        <style>{`@keyframes cpa-wave { 0%,100% { transform: rotate(0); } 25% { transform: rotate(20deg); } 50% { transform: rotate(-12deg); } 75% { transform: rotate(16deg); } }`}</style>
      </div>

      {/* ═══════════ KPI GRID (4 colonnes pastel) ═══════════ */}
      <div className="cpa-kpi-grid">
        <div className="cpa-kpi k-blue">
          <div className="cpa-kpi-label">Heures ce mois</div>
          <div className="cpa-kpi-value">{dash.totalHours}<span style={{ fontSize: 18, marginLeft: 6, opacity: 0.7 }}>h</span></div>
          <div className="cpa-kpi-hint">≈ {Math.round(dash.totalHours / 8)} journées</div>
        </div>
        <div className="cpa-kpi k-sage" style={{ cursor: 'pointer' }} onClick={() => onSelectTab('interventions')}>
          <div className="cpa-kpi-label">Interventions</div>
          <div className="cpa-kpi-value">{dash.intvY}</div>
          <div className="cpa-kpi-hint">{dash.intvPY > 0 ? `vs ${dash.intvPY} en ${dash.PY}` : 'cette année'}</div>
        </div>
        <div className="cpa-kpi k-rose" style={{ cursor: 'pointer' }} onClick={() => onSelectTab('documents')}>
          <div className="cpa-kpi-label">Crédit d'impôt</div>
          <div className="cpa-kpi-value">{fmtEur(dash.taxCredit)}<span style={{ fontSize: 18, marginLeft: 4, opacity: 0.7 }}>€</span></div>
          <div className="cpa-kpi-hint">sur {fmtEur(dash.spentY)} € réglés</div>
        </div>
        <div className="cpa-kpi k-ocre" style={{ cursor: 'pointer' }} onClick={() => onSelectTab('fidelite')}>
          <div className="cpa-kpi-label">{qualityScore ? 'Score qualité' : 'Statut fidélité'}</div>
          <div className="cpa-kpi-value">
            {qualityScore
              ? <>{qualityScore.value}<span style={{ fontSize: 18, marginLeft: 4, opacity: 0.7 }}>/10</span></>
              : tier}
          </div>
          <div className="cpa-kpi-hint">
            {qualityScore ? `basé sur ${qualityScore.count} évaluation${qualityScore.count > 1 ? 's' : ''}` : `${points.toLocaleString('fr-FR')} points`}
          </div>
        </div>
      </div>

      {/* ═══════════ Pending quote (full width hero) ═══════════ */}
      {pendingQuote && (
        <div onClick={() => onOpenQuote(pendingQuote)} style={{ cursor: 'pointer', marginBottom: 20 }}>
          <QuoteHeroPreview quote={pendingQuote} />
        </div>
      )}

      {/* ═══════════ Urgent invoice (full width) ═══════════ */}
      {urgentInvoice && (
        <div className="cpa-card cpa-card-click" style={{
          marginBottom: 20,
          borderColor: urgentInvoice.status === 'en_retard' ? 'oklch(0.80 0.12 25)' : 'oklch(0.80 0.10 80)',
          background: urgentInvoice.status === 'en_retard' ? 'var(--pastel-rose)' : 'var(--pastel-ocre)',
        }} onClick={() => onOpenInvoice(urgentInvoice)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="cpa-label" style={{ color: urgentInvoice.status === 'en_retard' ? 'var(--pastel-rose-fg)' : 'var(--pastel-ocre-fg)' }}>
                {urgentInvoice.status === 'en_retard' ? '⚠ Facture en retard' : 'Facture à régler'}
              </div>
              <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, marginTop: 6 }}>
                {urgentInvoice.invoice_number || 'Facture'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
                Échéance · {fmtDate(urgentInvoice.due_date)}
              </div>
            </div>
            <div className="cpa-display" style={{ fontSize: 32, fontWeight: 500, color: urgentInvoice.status === 'en_retard' ? 'var(--pastel-rose-fg)' : 'var(--pastel-ocre-fg)' }}>
              {fmtEur(urgentInvoice.amount_ttc || urgentInvoice.amount)}<span style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-3)', marginLeft: 4 }}>€</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ LAYOUT 2 COLONNES ═══════════ */}
      <div className="cpa-cols">
        {/* ─── COL GAUCHE : Prochaines interventions ─── */}
        <div>
          <div className="cpa-section">
            <div className="cpa-section-head">
              <h2 className="cpa-section-title">Prochaines interventions</h2>
              <button onClick={() => onSelectTab('interventions')} className="cpa-section-link">
                Voir le planning complet →
              </button>
            </div>

            {upcomingList.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
                Aucune intervention planifiée.
              </div>
            ) : upcomingList.map((i) => {
              const d = fmtIntvDate(i.scheduled_date);
              const isPending = i.status === 'planifiée' || i.status === 'planifiee' || !i.status;
              const isConfirmed = i.status === 'confirmée' || i.status === 'confirmee' || i.status === 'en_cours' || i.status === 'en_route';
              return (
                <div key={i.intervention_id} className="cpa-intv-row" onClick={() => onOpenIntv(i)}>
                  <div className="cpa-intv-date">
                    <div className="day-name">{d?.day || '—'}</div>
                    <div className="day-num">{d?.num || '?'}</div>
                    <div className="day-name" style={{ marginTop: 2, opacity: 0.6 }}>{d?.month || ''}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
                        {i.scheduled_time || '—'}
                      </span>
                      <span className={`cpa-pill ${isConfirmed ? 'confirmed' : 'pending'}`}>
                        {isConfirmed ? 'Confirmé' : 'À confirmer'}
                      </span>
                      {i.is_recurring && <span className="cpa-pill recurrent">Récurrent</span>}
                    </div>
                    <div className="cpa-display" style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.3 }}>
                      {i.title || i.service_type || 'Intervention'}
                    </div>
                    {i.agent_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: 12, color: 'var(--ink-3)' }}>
                        <User style={{ width: 11, height: 11 }} /> {i.agent_name}
                      </div>
                    )}
                  </div>
                  <ChevronRight style={{ width: 18, height: 18, color: 'var(--ink-3)' }} />
                </div>
              );
            })}
          </div>

          {/* ─── Sparkline 12 mois (data-driven) ─── */}
          {dash.hasData && (
            <div className="cpa-section">
              <div className="cpa-section-head">
                <h2 className="cpa-section-title">Évolution {dash.Y}</h2>
                {dash.yoyPct !== null && <YoYBadge pct={dash.yoyPct} prevYear={dash.PY} />}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
                <div className="cpa-display" style={{ fontSize: 36, fontWeight: 500, lineHeight: 1 }}>
                  {fmtEur(dash.spentY)}<span style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-3)', marginLeft: 4 }}>€</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>dépensés cette année</div>
              </div>
              <div style={{ height: 110 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dash.monthly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="curFill2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.45 0.13 165)" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="oklch(0.45 0.13 165)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="m"
                      tick={{ fontFamily: 'Inter', fontSize: 10, fill: 'oklch(0.55 0.02 240)', fontWeight: 500 }}
                      axisLine={false} tickLine={false} interval={1}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: 'oklch(0.985 0.008 85)',
                        border: '1px solid oklch(0.88 0.012 240)',
                        borderRadius: 12,
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 12,
                        boxShadow: '0 8px 24px oklch(0.20 0.04 250 / 0.12)',
                        padding: '8px 12px',
                      }}
                      cursor={{ stroke: 'oklch(0.88 0.012 240)', strokeWidth: 1, strokeDasharray: '3 3' }}
                      formatter={(v, k) => [`${fmtEur(v)} €`, k === 'cur' ? dash.Y : dash.PY]}
                      labelStyle={{ color: 'var(--ink)', fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="prev" stroke="oklch(0.72 0.014 240)" strokeWidth={1} strokeDasharray="3 3" fill="transparent" dot={false} />
                    <Area type="monotone" dataKey="cur" stroke="oklch(0.45 0.13 165)" strokeWidth={2.5} fill="url(#curFill2)" dot={false}
                      activeDot={{ r: 5, fill: 'oklch(0.45 0.13 165)', stroke: 'white', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* ─── COL DROITE : Conseiller + Factures ─── */}
        <div>
          <div className="cpa-section">
            <div className="cpa-section-head">
              <h2 className="cpa-section-title">Messagerie</h2>
              <button onClick={() => onSelectTab('conseiller')} className="cpa-section-link">
                Tous les messages →
              </button>
            </div>

            <div className="cpa-msg">
              <div className="cpa-msg-head">
                <div>
                  <div className="cpa-msg-author">Votre conseiller</div>
                  <div className="cpa-msg-role">Coordination</div>
                </div>
                <div className="cpa-msg-time">en ligne</div>
              </div>
              <div className="cpa-msg-body">
                Une question, une demande spéciale ? Notre équipe vous répond en moyenne en 5 minutes pendant les heures ouvrées.
              </div>
            </div>

            <button onClick={() => onSelectTab('conseiller')} className="cpa-cta" style={{ marginTop: 14 }}>
              <MessageSquare style={{ width: 14, height: 14 }} /> Nouveau message
            </button>
          </div>

          {/* ─── Factures ─── */}
          <div className="cpa-section">
            <div className="cpa-section-head">
              <h2 className="cpa-section-title">Factures</h2>
              <button onClick={() => onSelectTab('invoices')} className="cpa-section-link">
                Toutes les factures →
              </button>
            </div>

            {recentInvoices.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13 }}>
                Aucune facture pour le moment.
              </div>
            ) : recentInvoices.map((inv) => {
              const isPaid = ['payée', 'payee'].includes(inv.status);
              const isLate = inv.status === 'en_retard';
              return (
                <div key={inv.invoice_id} className="cpa-inv-row" onClick={() => onOpenInvoice(inv)}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="cpa-display" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.2 }}>
                      {inv.month_label || (() => {
                        try { return new Date(inv.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }
                        catch { return inv.invoice_number; }
                      })()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'Inter, sans-serif' }}>
                      {inv.invoice_number} · {fmtDateShort(inv.created_at)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="cpa-display" style={{ fontSize: 18, fontWeight: 500 }}>
                      {fmtEur(inv.amount_ttc || inv.amount)}<span style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', marginLeft: 3 }}>€</span>
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <span className={`cpa-pill ${isPaid ? 'confirmed' : isLate ? 'late' : 'pending'}`} style={{ fontSize: 9 }}>
                        {isPaid ? 'Payée' : isLate ? 'En retard' : 'En attente'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── Loyalty preview compact ─── */}
          {points > 0 && (
            <div className="cpa-section cpa-card-click" onClick={() => onSelectTab('fidelite')} style={{ cursor: 'pointer', background: 'var(--pastel-sage)', borderColor: 'oklch(0.80 0.10 165)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="cpa-label" style={{ color: 'var(--pastel-sage-fg)' }}>Fidélité · {tier}</div>
                  <div className="cpa-display" style={{ fontSize: 32, fontWeight: 500, color: 'var(--pastel-sage-fg)', lineHeight: 1, marginTop: 6 }}>
                    {points.toLocaleString('fr-FR')}<span style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, marginLeft: 6, opacity: 0.7 }}>points</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--pastel-sage-fg)', opacity: 0.78, marginTop: 6 }}>
                    {loyalty?.next_reward ? `Prochaine récompense à ${loyalty.next_reward} pts` : 'Parrainez un ami pour +50 pts'}
                  </div>
                </div>
                <Gift style={{ width: 32, height: 32, color: 'var(--pastel-sage-fg)' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ Quick actions footer ═══════════ */}
      <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => onSelectTab('demande')} className="cpa-chip-btn">
          <Plus style={{ width: 12, height: 12 }} /> Demander une intervention
        </button>
        <button onClick={() => onSelectTab('conseiller')} className="cpa-chip-btn">
          <MessageSquare style={{ width: 12, height: 12 }} /> Écrire au conseiller
        </button>
        <button onClick={() => onSelectTab('fidelite')} className="cpa-chip-btn">
          <Gift style={{ width: 12, height: 12 }} /> Parrainer
        </button>
      </div>
    </div>
  );
}

/* ═══════════ Composants dashboard ═══════════ */
function SectionLabel({ children }) {
  return (
    <div className="cpa-label" style={{
      marginBottom: 10, marginTop: 6,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ flex: '0 0 12px', height: 1, background: 'var(--line)' }} />
      {children}
      <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  );
}

function YoYBadge({ pct, prevYear }) {
  const positive = pct > 0;
  const flat = pct === 0;
  const color = flat ? 'var(--ink-3)' : positive ? 'var(--rouge)' : 'var(--emerald-deep)';
  const bg = flat ? 'var(--surface-2)' : positive ? 'var(--rouge-soft)' : 'var(--emerald-soft)';
  const Icon = positive ? TrendingUp : (flat ? null : TrendingDown);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '6px 10px', borderRadius: 10,
      background: bg, color,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
    }}>
      {Icon && <Icon style={{ width: 12, height: 12 }} />}
      {pct > 0 ? '+' : ''}{pct}%
      <span style={{ fontSize: 9, opacity: 0.75, fontWeight: 400, marginLeft: 2 }}>vs {prevYear}</span>
    </div>
  );
}

function ChartLegendDot({ color, label, dashed }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)' }}>
      <span style={{
        width: 12, height: dashed ? 0 : 6, borderRadius: dashed ? 0 : 999,
        background: dashed ? 'transparent' : color,
        borderTop: dashed ? `1.5px dashed ${color}` : 'none',
      }} />
      {label}
    </div>
  );
}

function KpiTile({ icon, label, value, hint, onClick, tone }) {
  const accent = tone === 'gold' ? 'oklch(0.94 0.06 85)' : 'var(--paper)';
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        padding: '14px 14px',
        borderRadius: 14,
        background: accent,
        border: '1px solid var(--line)',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 6,
        transition: 'transform .15s, box-shadow .15s',
        font: 'inherit',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="cpa-label">{label}</span>
        {icon}
      </div>
      <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.05 }}>
        {value}
      </div>
      {hint && (
        <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
          {hint}
        </div>
      )}
    </button>
  );
}

const tileStyle = {
  padding: '14px 16px', borderRadius: 16,
  background: 'var(--paper)', border: '1px solid var(--line)', textAlign: 'left',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
  transition: 'transform .15s, box-shadow .15s',
};

function QuoteHeroPreview({ quote }) {
  return (
    <div style={{
      background: 'linear-gradient(165deg, oklch(0.14 0.018 60) 0%, oklch(0.18 0.03 165) 100%)',
      color: 'oklch(0.95 0.01 80)',
      borderRadius: 18, padding: '18px 20px',
      boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(0.70 0.03 80)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Nouveau devis · {quote.quote_number || ''}
        </div>
        <ArrowRight style={{ width: 14, height: 14, color: 'oklch(0.72 0.13 85)' }} />
      </div>
      <div className="cpa-display" style={{ fontSize: 22, fontWeight: 300, lineHeight: 1.1, color: 'oklch(0.95 0.01 80)' }}>
        Votre <em style={{ fontStyle: 'italic', color: 'oklch(0.72 0.13 85)' }}>devis</em> est prêt
      </div>
      <div className="cpa-display" style={{ fontSize: 30, fontWeight: 500, color: 'oklch(0.72 0.13 85)', marginTop: 4 }}>
        {fmtEur(quote.amount)} <span style={{ fontSize: 15, fontStyle: 'italic', opacity: 0.9 }}>€ TTC</span>
      </div>
    </div>
  );
}

/* ═══════════ VUE DEVIS LIST ═══════════ */
function ViewQuotes({ quotes, onOpen }) {
  const [filter, setFilter] = useState('all');
  const [comparing, setComparing] = useState(false);
  const filtered = quotes.filter(q => {
    if (filter === 'pending') return ['envoyé', 'envoye'].includes(q.status);
    if (filter === 'accepted') return ['accepté', 'accepte', 'signé'].includes(q.status);
    return true;
  });

  const pendingQuotes = quotes.filter(q => ['envoyé', 'envoye'].includes(q.status));
  const canCompare = pendingQuotes.length >= 2;

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-label">Vos devis</div>
      <h1 className="cpa-display" style={{ fontSize: 34, fontWeight: 300, margin: '8px 0 18px', lineHeight: 1 }}>
        Les <em className="cpa-italic">propositions</em>
      </h1>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
        {[
          { k: 'all', label: `Tous (${quotes.length})` },
          { k: 'pending', label: `À signer (${pendingQuotes.length})` },
          { k: 'accepted', label: `Acceptés (${quotes.filter(q => ['accepté', 'accepte', 'signé'].includes(q.status)).length})` },
        ].map(t => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            className={`cpa-chip-btn ${filter === t.k ? 'active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {canCompare && (
        <button onClick={() => setComparing(true)} style={{
          width: '100%', marginBottom: 14, padding: '14px 16px', borderRadius: 14,
          background: 'linear-gradient(165deg, oklch(0.18 0.04 165) 0%, oklch(0.22 0.05 175) 100%)',
          color: 'oklch(0.95 0.01 80)', border: '1px solid oklch(0.52 0.13 165)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          font: 'inherit',
        }}>
          <div style={{ textAlign: 'left' }}>
            <div className="cpa-mono" style={{ fontSize: 10, color: 'oklch(0.78 0.13 165)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {pendingQuotes.length} devis à signer
            </div>
            <div className="cpa-display" style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>
              Comparez côte à côte avant de choisir
            </div>
          </div>
          <ArrowRight style={{ width: 18, height: 18, color: 'oklch(0.72 0.13 85)' }} />
        </button>
      )}

      {comparing && (
        <QuoteComparator quotes={pendingQuotes} onClose={() => setComparing(false)} onSelect={(q) => { setComparing(false); onOpen(q); }} />
      )}

      {filtered.length === 0 ? (
        <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
          Aucun devis dans cette catégorie.
        </div>
      ) : (
        <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((q, i) => {
            const isPending = ['envoyé', 'envoye'].includes(q.status);
            const isAccepted = ['accepté', 'accepte', 'signé'].includes(q.status);
            const tone = isAccepted ? 'var(--emerald)' : isPending ? 'var(--gold)' : 'var(--ink-3)';
            return (
              <div key={q.quote_id} onClick={() => onOpen(q)} style={{
                padding: '16px 18px', borderBottom: i < filtered.length - 1 ? '1px solid var(--line-2)' : 0,
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                      {q.quote_number || q.quote_id?.slice(-8).toUpperCase()}
                    </span>
                    <span className="cpa-pill" style={{ color: tone, background: `color-mix(in oklch, ${tone} 14%, transparent)`, borderColor: tone }}>
                      {q.status}
                    </span>
                  </div>
                  <div className="cpa-display" style={{ fontSize: 16, fontWeight: 500 }}>
                    {q.title || q.service_type || 'Devis'}
                  </div>
                  <div className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>
                    {fmtDate(q.created_at)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 12 }}>
                  <div className="cpa-display" style={{ fontSize: 20, fontWeight: 500 }}>
                    {fmtEur(q.amount)} <span style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>€</span>
                  </div>
                  <ChevronRight style={{ width: 14, height: 14, color: 'var(--ink-3)', marginTop: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════ VUE FACTURES LIST ═══════════ */
function ViewInvoices({ invoices, onOpen, onPay }) {
  const total = invoices.filter(i => ['en_attente', 'en_retard'].includes(i.status))
    .reduce((s, i) => s + Number(i.amount_ttc || i.amount || 0), 0);

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-label">Vos factures</div>
      <h1 className="cpa-display" style={{ fontSize: 34, fontWeight: 300, margin: '8px 0 14px', lineHeight: 1 }}>
        Le <em className="cpa-italic">grand livre</em>
      </h1>

      {total > 0 && (
        <div className="cpa-card" style={{
          background: 'linear-gradient(135deg, oklch(0.94 0.06 85), oklch(0.95 0.02 85))',
          border: '1px solid var(--gold)', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="cpa-label" style={{ color: 'oklch(0.45 0.13 78)' }}>À régler</div>
              <div className="cpa-display" style={{ fontSize: 28, fontWeight: 500, color: 'oklch(0.35 0.13 78)', lineHeight: 1, marginTop: 4 }}>
                {fmtEur(total)} €
              </div>
            </div>
            <CreditCard style={{ width: 30, height: 30, color: 'oklch(0.58 0.13 78)' }} />
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
          Aucune facture.
        </div>
      ) : (
        <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
          {invoices.map((inv, i) => {
            const status = inv.status || 'en_attente';
            const isPaid = ['payée', 'payee'].includes(status);
            const tone = isPaid ? 'var(--emerald)' : status === 'en_retard' ? 'var(--rouge)' : 'var(--gold)';
            return (
              <div key={inv.invoice_id} style={{
                padding: '16px 18px', borderBottom: i < invoices.length - 1 ? '1px solid var(--line-2)' : 0,
              }}>
                <div onClick={() => onOpen(inv)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                        {inv.invoice_number}
                      </span>
                      <span className="cpa-pill" style={{ color: tone, background: `color-mix(in oklch, ${tone} 14%, transparent)`, borderColor: tone }}>
                        {isPaid ? 'Réglée' : status === 'en_retard' ? 'En retard' : 'À régler'}
                      </span>
                    </div>
                    <div className="cpa-display" style={{ fontSize: 16, fontWeight: 500 }}>
                      {inv.project || inv.service_type || 'Prestation'}
                    </div>
                    <div className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>
                      Échéance · {fmtDate(inv.due_date)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 12 }}>
                    <div className="cpa-display" style={{ fontSize: 20, fontWeight: 500 }}>
                      {fmtEur(inv.amount_ttc || inv.amount)} <span style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>€</span>
                    </div>
                  </div>
                </div>
                {!isPaid && (
                  <button onClick={() => onPay(inv)} className="cpa-cta-dark" style={{ marginTop: 10, padding: '10px 14px', fontSize: 10 }}>
                    <CreditCard style={{ width: 11, height: 11 }} /> Payer en ligne
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════ VUE INTERVENTIONS ═══════════ */
function ViewInterventions({ interventions, onOpen, onReview, onSelectTab }) {
  const upcoming = interventions.filter(i => i.status !== 'terminée')
    .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''));
  const past = interventions.filter(i => i.status === 'terminée');

  // ═══ Détection récurrence ═══
  const recurrenceInfo = useMemo(() => {
    const recurringIntvs = interventions.filter(i => i.is_recurring || (i.frequency && i.frequency !== 'unique'));
    if (recurringIntvs.length === 0) return null;

    // Choisir l'intervention récurrente la plus active (la plus récente)
    const sample = recurringIntvs.sort((a, b) => (b.scheduled_date || '').localeCompare(a.scheduled_date || ''))[0];

    // Inférer le pattern (jour de semaine + heure) depuis l'historique
    const pastDates = recurringIntvs
      .map(i => i.scheduled_date)
      .filter(Boolean)
      .map(d => new Date(d))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => b - a);

    let weekday = null;
    if (pastDates.length >= 1) weekday = pastDates[0].getDay();

    const freqLabel = {
      hebdomadaire: 'Tous les',
      bimensuelle: 'Tous les 15 jours,',
      mensuel: 'Une fois par mois,',
      trimestriel: 'Une fois par trimestre,',
    }[(sample.frequency || '').toLowerCase()] || 'Régulièrement,';

    const weekdayLabel = weekday != null ? ['dimanches', 'lundis', 'mardis', 'mercredis', 'jeudis', 'vendredis', 'samedis'][weekday] : '';

    return {
      sample,
      weekday,
      frequency: sample.frequency || 'récurrente',
      freqLabel,
      weekdayLabel,
      time: sample.scheduled_time || '',
      service: sample.service_type || sample.title || 'prestation',
      count: recurringIntvs.length,
    };
  }, [interventions]);

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-label">Vos passages</div>
      <h1 className="cpa-display" style={{ fontSize: 34, fontWeight: 300, margin: '8px 0 18px', lineHeight: 1 }}>
        Les <em className="cpa-italic">interventions</em>
      </h1>

      {/* ═══════════ Rythme récurrent ═══════════ */}
      {recurrenceInfo && (
        <div className="cpa-fade" style={{
          marginBottom: 18, padding: '20px 22px', borderRadius: 18,
          background: 'linear-gradient(165deg, oklch(0.18 0.04 165) 0%, oklch(0.22 0.05 175) 100%)',
          color: 'oklch(0.95 0.01 80)',
          boxShadow: '0 12px 32px oklch(0.18 0.04 165 / 0.22)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.72 0.04 80)' }}>
                Votre rythme
              </div>
              <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.15, marginTop: 6, color: 'oklch(0.95 0.01 80)' }}>
                {recurrenceInfo.freqLabel} <em style={{ color: 'oklch(0.72 0.13 85)', fontStyle: 'italic' }}>{recurrenceInfo.weekdayLabel}</em>
                {recurrenceInfo.time && <span style={{ fontSize: 16, fontStyle: 'italic', color: 'oklch(0.85 0.03 80)' }}> · {recurrenceInfo.time}</span>}
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'oklch(0.78 0.04 80)', marginTop: 4 }}>
                {recurrenceInfo.service}
              </div>
            </div>
            <RefreshCw style={{ width: 22, height: 22, color: 'oklch(0.72 0.13 85)' }} />
          </div>

          <RecurrenceCalendar interventions={upcoming} highlightWeekday={recurrenceInfo.weekday} />

          <button
            onClick={() => onSelectTab && onSelectTab('conseiller')}
            style={{
              marginTop: 14, width: '100%', padding: '10px 14px', borderRadius: 999,
              background: 'transparent', border: '1px solid oklch(0.72 0.13 85 / 0.5)',
              color: 'oklch(0.72 0.13 85)',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Edit3 style={{ width: 12, height: 12 }} /> Modifier ma récurrence
          </button>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div className="cpa-label" style={{ marginBottom: 10 }}>À venir</div>
          <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
            {upcoming.map((i, idx) => (
              <div key={i.intervention_id} onClick={() => onOpen(i)} style={{
                padding: '14px 18px',
                borderBottom: idx < upcoming.length - 1 ? '1px solid var(--line-2)' : 0,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cpa-mono" style={{ fontSize: 10, color: 'var(--emerald)', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>
                    {fmtDate(i.scheduled_date)} · {i.scheduled_time || ''}
                  </div>
                  <div className="cpa-display" style={{ fontSize: 16, fontWeight: 500, margin: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {i.title || i.service_type}
                    {i.is_recurring && <RefreshCw style={{ width: 12, height: 12, color: 'var(--emerald)' }} />}
                  </div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)' }}>
                    {i.address || ''}{i.agent_name ? ` · ${i.agent_name}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div className="cpa-label" style={{ marginBottom: 10 }}>Passées</div>
          <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
            {past.map((i, idx) => {
              const hasReview = i.review_rating;
              return (
                <div key={i.intervention_id} style={{
                  padding: '14px 18px',
                  borderBottom: idx < past.length - 1 ? '1px solid var(--line-2)' : 0,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onOpen(i)}>
                    <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {fmtDate(i.scheduled_date || i.completed_at)}
                    </div>
                    <div className="cpa-display" style={{ fontSize: 15, fontWeight: 500, margin: '3px 0' }}>
                      {i.title || i.service_type}
                    </div>
                  </div>
                  {hasReview ? (
                    <div style={{ display: 'flex', gap: 1 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} style={{ width: 14, height: 14, color: n <= i.review_rating ? 'var(--gold)' : 'var(--line)', fill: n <= i.review_rating ? 'var(--gold)' : 'transparent' }} />
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => onReview(i)} className="cpa-chip-btn" style={{
                      background: 'var(--emerald-soft)', color: 'var(--emerald-deep)', borderColor: 'var(--emerald)',
                    }}>
                      <Star style={{ width: 11, height: 11 }} /> Noter
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {interventions.length === 0 && (
        <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
          Aucune intervention planifiée.
        </div>
      )}
    </div>
  );
}

/* ═══════════ Mini-calendrier 6 semaines (récurrence) ═══════════ */
function RecurrenceCalendar({ interventions, highlightWeekday }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // 6 semaines glissantes (42 jours) à partir du début de la semaine courante
  const startOfWeek = new Date(today);
  const dow = (today.getDay() + 6) % 7; // Lundi = 0
  startOfWeek.setDate(today.getDate() - dow);

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }

  // Map des jours avec intervention
  const intvByDate = new Map();
  interventions.forEach(intv => {
    const iso = (intv.scheduled_date || '').slice(0, 10);
    if (!iso) return;
    if (!intvByDate.has(iso)) intvByDate.set(iso, []);
    intvByDate.get(iso).push(intv);
  });

  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const monthLabel = today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', color: 'oklch(0.72 0.04 80)' }}>
          {monthLabel}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(0.72 0.04 80)' }}>
          6 prochaines semaines
        </div>
      </div>

      {/* Header jours */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {dayLabels.map((d, i) => (
          <div key={i} style={{
            textAlign: 'center', fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9, color: 'oklch(0.62 0.03 80)', fontWeight: 600,
          }}>{d}</div>
        ))}
      </div>

      {/* Grille jours */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const intvs = intvByDate.get(iso) || [];
          const isToday = d.getTime() === today.getTime();
          const isPast = d < today;
          const isWeekdayMatch = highlightWeekday != null && d.getDay() === highlightWeekday && !isPast && intvs.length === 0;
          const hasIntv = intvs.length > 0;
          const hasRecurrent = intvs.some(i => i.is_recurring);

          return (
            <div key={i} style={{
              aspectRatio: '1',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8,
              background: isToday
                ? 'oklch(0.72 0.13 85 / 0.22)'
                : hasIntv
                  ? (hasRecurrent ? 'oklch(0.52 0.13 165 / 0.32)' : 'oklch(0.72 0.13 85 / 0.18)')
                  : isWeekdayMatch
                    ? 'oklch(0.95 0.01 80 / 0.06)'
                    : 'transparent',
              border: isToday
                ? '1px solid oklch(0.72 0.13 85)'
                : hasRecurrent
                  ? '1px solid oklch(0.52 0.13 165 / 0.6)'
                  : '1px solid transparent',
              opacity: isPast ? 0.32 : 1,
              position: 'relative',
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                color: isToday ? 'oklch(0.86 0.15 85)' : hasIntv ? 'oklch(0.95 0.01 80)' : 'oklch(0.85 0.03 80)',
                fontWeight: isToday || hasIntv ? 700 : 400,
              }}>
                {d.getDate()}
              </div>
              {hasIntv && (
                <div style={{
                  position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', gap: 2,
                }}>
                  {intvs.slice(0, 3).map((_, j) => (
                    <span key={j} style={{
                      width: 3, height: 3, borderRadius: 999,
                      background: hasRecurrent ? 'oklch(0.78 0.14 165)' : 'oklch(0.86 0.15 85)',
                    }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 14, marginTop: 10, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(0.72 0.04 80)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'oklch(0.78 0.14 165)' }} /> Récurrent
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'oklch(0.86 0.15 85)' }} /> Ponctuel
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, border: '1px solid oklch(0.72 0.13 85)' }} /> Aujourd'hui
        </span>
      </div>
    </div>
  );
}

/* ═══════════ VUE DOCUMENTS ═══════════ */
function ViewDocuments({ quotes, invoices, interventions = [], client }) {
  // Années disponibles
  const allYears = useMemo(() => {
    const ys = new Set();
    [...quotes, ...invoices, ...interventions].forEach(d => {
      const dt = d.created_at || d.scheduled_date || d.completed_at;
      if (dt) ys.add(new Date(dt).getFullYear());
    });
    const sorted = [...ys].sort((a, b) => b - a);
    return sorted.length ? sorted : [new Date().getFullYear()];
  }, [quotes, invoices, interventions]);

  const [year, setYear] = useState(allYears[0]);

  // Filtrage par année + récap fiscal
  const fiscal = useMemo(() => {
    const inYear = (d) => {
      const dt = d?.paid_at || d?.created_at || d?.scheduled_date || d?.completed_at;
      if (!dt) return false;
      try { return new Date(dt).getFullYear() === year; } catch { return false; }
    };
    const yearInvoices = invoices.filter(inYear);
    const yearQuotes = quotes.filter(inYear);
    const yearIntvs = interventions.filter(inYear);
    const paidAmount = yearInvoices
      .filter(i => ['payée', 'payee'].includes(i.status))
      .reduce((s, i) => s + Number(i.amount_ttc || i.amount || 0), 0);
    const taxCredit = Math.round(paidAmount * 0.5);
    const completedIntvs = yearIntvs.filter(i => ['terminée', 'terminee'].includes(i.status)).length;
    const totalHours = yearIntvs.reduce((s, i) => s + Number(i.duration_hours || 2), 0);
    return {
      yearInvoices, yearQuotes, yearIntvs,
      paidAmount, taxCredit, completedIntvs, totalHours,
    };
  }, [invoices, quotes, interventions, year]);

  // ═══ Export CSV (factures) ═══
  const exportInvoicesCsv = () => {
    const headers = ['Numéro', 'Date', 'Date paiement', 'Prestation', 'Montant HT', 'Montant TTC', 'Statut'];
    const rows = fiscal.yearInvoices.map(i => [
      i.invoice_number || '',
      (i.created_at || '').slice(0, 10),
      (i.paid_at || '').slice(0, 10),
      (i.project || i.service_type || 'Prestation').replace(/[",;]/g, ' '),
      Number(i.amount_ht || (i.amount_ttc || i.amount || 0) / 1.2).toFixed(2),
      Number(i.amount_ttc || i.amount || 0).toFixed(2),
      i.status || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factures_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Export CSV généré · ${fiscal.yearInvoices.length} factures`);
  };

  const exportInterventionsCsv = () => {
    const headers = ['Date', 'Heure', 'Service', 'Adresse', 'Durée (h)', 'Statut', 'Intervenant'];
    const rows = fiscal.yearIntvs.map(i => [
      (i.scheduled_date || '').slice(0, 10),
      i.scheduled_time || '',
      (i.service_type || i.title || '').replace(/[",;]/g, ' '),
      (i.address || '').replace(/[",;]/g, ' '),
      Number(i.duration_hours || 2),
      i.status || '',
      (i.agent_name || '').replace(/[",;]/g, ' '),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interventions_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Export CSV généré · ${fiscal.yearIntvs.length} interventions`);
  };

  // ═══ Attestation fiscale (page imprimable) ═══
  const printFiscalCert = () => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Bloqué — autorisez les pop-ups'); return; }
    const name = client?.name || client?.full_name || 'Client';
    const addr = client?.address || '';
    const total = fmtEur2(fiscal.paidAmount);
    const credit = fmtEur2(fiscal.taxCredit);
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const tableRows = fiscal.yearInvoices
      .filter(i => ['payée', 'payee'].includes(i.status))
      .map(i => `
        <tr>
          <td>${i.invoice_number || ''}</td>
          <td>${(i.paid_at || i.created_at || '').slice(0, 10)}</td>
          <td>${(i.project || i.service_type || 'Prestation')}</td>
          <td style="text-align:right">${fmtEur2(i.amount_ttc || i.amount || 0)} €</td>
        </tr>`).join('');

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Attestation fiscale ${year} — ${name}</title>
<style>
  @page { margin: 18mm; size: A4; }
  body { font-family: 'Times New Roman', Georgia, serif; color: #1a1a1a; line-height: 1.5; }
  h1 { font-size: 26px; font-weight: 400; letter-spacing: -0.01em; margin: 0 0 4px; }
  h1 em { color: #1c5d3f; font-style: italic; }
  .label { font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #666; }
  .totals { display: flex; gap: 20px; margin: 28px 0; }
  .total-card { flex: 1; padding: 18px; border: 1px solid #ddd; border-radius: 8px; }
  .total-card .v { font-size: 26px; font-weight: 500; color: #1c5d3f; }
  table { width: 100%; border-collapse: collapse; margin: 18px 0 30px; font-size: 12px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #e5e5e5; text-align: left; }
  th { background: #fafaf6; font-weight: 600; font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }
  .footer { margin-top: 40px; padding-top: 18px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
  .stamp { display: inline-block; padding: 6px 14px; border: 2px solid #1c5d3f; color: #1c5d3f; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; transform: rotate(-2deg); margin-top: 12px; }
</style>
</head><body>
  <div class="label">Attestation fiscale · Article 199 sexdecies du CGI</div>
  <h1>Attestation <em>annuelle</em> ${year}</h1>
  <p style="margin-top:18px"><strong>${name}</strong><br/>${addr}</p>
  <p>La société Global Clean Home (SIREN 988 506 040) atteste que ${name} a réglé en ${year}
  des prestations de services à la personne au domicile, ouvrant droit au crédit d'impôt
  prévu à l'article 199 sexdecies du Code général des impôts.</p>

  <div class="totals">
    <div class="total-card">
      <div class="label">Total TTC réglé</div>
      <div class="v">${total} €</div>
    </div>
    <div class="total-card">
      <div class="label">Crédit d'impôt 50 %</div>
      <div class="v">${credit} €</div>
    </div>
    <div class="total-card">
      <div class="label">Interventions</div>
      <div class="v">${fiscal.completedIntvs}</div>
    </div>
  </div>

  <div class="label">Détail des règlements ${year}</div>
  <table>
    <thead><tr><th>Facture</th><th>Date</th><th>Prestation</th><th style="text-align:right">Montant TTC</th></tr></thead>
    <tbody>${tableRows || '<tr><td colspan="4" style="text-align:center;color:#999">Aucune facture réglée</td></tr>'}</tbody>
    <tfoot><tr><th colspan="3">Total</th><th style="text-align:right">${total} €</th></tr></tfoot>
  </table>

  <div class="footer">
    <p>Établi à Paris, le ${today}.</p>
    <p>Global Clean Home · 231 rue Saint-Honoré, 75001 Paris<br/>info@globalcleanhome.com · 06 22 66 53 08</p>
    <div class="stamp">Document à conserver</div>
  </div>
  <script>window.onload = () => setTimeout(() => window.print(), 350);</script>
</body></html>`);
    w.document.close();
  };

  // Liste tous documents de l'année (devis + factures)
  const allDocs = useMemo(() => {
    const docs = [];
    fiscal.yearQuotes.forEach(q => docs.push({
      type: 'quote', id: q.quote_id, number: q.quote_number || q.quote_id?.slice(-8).toUpperCase(),
      title: q.title || q.service_type, amount: q.amount, date: q.created_at, status: q.status,
      download: `${BACKEND_URL}/api/quotes/${q.quote_id}/pdf`,
    }));
    fiscal.yearInvoices.forEach(i => docs.push({
      type: 'invoice', id: i.invoice_id, number: i.invoice_number,
      title: i.project || i.service_type || 'Facture', amount: i.amount_ttc || i.amount, date: i.created_at, status: i.status,
      download: `${BACKEND_URL}/api/invoices/${i.invoice_id}/pdf`,
    }));
    return docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [fiscal]);

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-label">Espace pro · comptable</div>
      <h1 className="cpa-display" style={{ fontSize: 34, fontWeight: 300, margin: '8px 0 14px', lineHeight: 1 }}>
        La <em className="cpa-italic">bibliothèque</em>
      </h1>

      {/* Sélecteur d'année */}
      {allYears.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {allYears.map(y => (
            <button key={y} onClick={() => setYear(y)} className="cpa-chip-btn" style={{
              background: y === year ? 'var(--ink)' : 'var(--surface)',
              color: y === year ? 'oklch(0.95 0.01 80)' : 'var(--ink-2)',
              borderColor: y === year ? 'var(--ink)' : 'var(--line)',
            }}>
              {y}
            </button>
          ))}
        </div>
      )}

      {/* ═══════════ Récap fiscal annuel ═══════════ */}
      <div className="cpa-card" style={{
        marginBottom: 14, padding: '20px 22px',
        background: 'linear-gradient(165deg, oklch(0.96 0.018 75) 0%, oklch(0.95 0.04 85) 100%)',
        border: '1px solid var(--gold)',
      }}>
        <div className="cpa-label" style={{ color: 'oklch(0.45 0.13 78)' }}>Bilan fiscal {year}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
          <div>
            <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Total réglé TTC
            </div>
            <div className="cpa-display" style={{ fontSize: 28, fontWeight: 500, color: 'var(--ink)', lineHeight: 1, marginTop: 4 }}>
              {fmtEur(fiscal.paidAmount)} €
            </div>
          </div>
          <div>
            <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Crédit d'impôt 50 %
            </div>
            <div className="cpa-display" style={{ fontSize: 28, fontWeight: 500, color: 'oklch(0.45 0.13 78)', lineHeight: 1, marginTop: 4 }}>
              {fmtEur(fiscal.taxCredit)} €
            </div>
          </div>
          <div>
            <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Interventions
            </div>
            <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1, marginTop: 4 }}>
              {fiscal.completedIntvs}
            </div>
          </div>
          <div>
            <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Heures de ménage
            </div>
            <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1, marginTop: 4 }}>
              {fiscal.totalHours} h
            </div>
          </div>
        </div>

        <button onClick={printFiscalCert} disabled={fiscal.paidAmount === 0} style={{
          width: '100%', marginTop: 18, padding: '14px 18px', borderRadius: 12,
          background: fiscal.paidAmount > 0 ? 'oklch(0.18 0.03 60)' : 'var(--ink-4)',
          color: 'oklch(0.95 0.01 80)', border: 'none',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          cursor: fiscal.paidAmount > 0 ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Receipt style={{ width: 14, height: 14 }} /> Imprimer l'attestation fiscale
        </button>
      </div>

      {/* ═══════════ Exports CSV ═══════════ */}
      <div className="cpa-card" style={{ marginBottom: 14, padding: '16px 18px' }}>
        <div className="cpa-label" style={{ marginBottom: 12 }}>Exports comptables</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={exportInvoicesCsv} disabled={fiscal.yearInvoices.length === 0} style={{
            padding: '12px', borderRadius: 12,
            background: 'var(--paper)', border: '1px solid var(--line)',
            cursor: fiscal.yearInvoices.length > 0 ? 'pointer' : 'not-allowed',
            opacity: fiscal.yearInvoices.length > 0 ? 1 : 0.5,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
            font: 'inherit',
          }}>
            <Download style={{ width: 14, height: 14, color: 'var(--gold)' }} />
            <div className="cpa-display" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>Factures CSV</div>
            <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{fiscal.yearInvoices.length} ligne{fiscal.yearInvoices.length > 1 ? 's' : ''}</div>
          </button>
          <button onClick={exportInterventionsCsv} disabled={fiscal.yearIntvs.length === 0} style={{
            padding: '12px', borderRadius: 12,
            background: 'var(--paper)', border: '1px solid var(--line)',
            cursor: fiscal.yearIntvs.length > 0 ? 'pointer' : 'not-allowed',
            opacity: fiscal.yearIntvs.length > 0 ? 1 : 0.5,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
            font: 'inherit',
          }}>
            <Download style={{ width: 14, height: 14, color: 'var(--emerald)' }} />
            <div className="cpa-display" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>Interventions CSV</div>
            <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{fiscal.yearIntvs.length} ligne{fiscal.yearIntvs.length > 1 ? 's' : ''}</div>
          </button>
        </div>
        <a
          href={`mailto:?subject=${encodeURIComponent(`Documents Global Clean Home — ${year}`)}&body=${encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint mes documents Global Clean Home pour l'année ${year}.\n\nTotal réglé : ${fmtEur(fiscal.paidAmount)} €\nCrédit d'impôt 50 % : ${fmtEur(fiscal.taxCredit)} €\n\nPortail : https://crm.globalcleanhome.com/portail`)}`}
          style={{
            display: 'flex', marginTop: 8, padding: '10px 14px', borderRadius: 999,
            background: 'transparent', border: '1px solid var(--line)',
            color: 'var(--ink-2)', textDecoration: 'none',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          <Mail style={{ width: 12, height: 12 }} /> Envoyer à mon comptable
        </a>
      </div>

      {/* ═══════════ Bibliothèque PDF ═══════════ */}
      <div className="cpa-label" style={{ marginBottom: 8 }}>Documents PDF · {year}</div>
      {allDocs.length === 0 ? (
        <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
          Aucun document pour {year}.
        </div>
      ) : (
        <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
          {allDocs.map((d, i) => (
            <div key={d.type + d.id} style={{
              padding: '14px 18px',
              borderBottom: i < allDocs.length - 1 ? '1px solid var(--line-2)' : 0,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 34, height: 40, borderRadius: 6,
                background: d.type === 'invoice' ? 'var(--gold-soft)' : 'var(--emerald-soft)',
                color: d.type === 'invoice' ? 'oklch(0.45 0.13 78)' : 'var(--emerald-deep)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: `1px solid ${d.type === 'invoice' ? 'var(--gold)' : 'var(--emerald)'}`,
              }}>
                <FileText style={{ width: 15, height: 15 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cpa-display" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>
                  {d.type === 'invoice' ? 'Facture' : 'Devis'} {d.number}
                </div>
                <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  {d.title} · {fmtDateShort(d.date)} · {fmtEur(d.amount)} €
                </div>
              </div>
              <a href={d.download} target="_blank" rel="noopener noreferrer" className="cpa-icon-btn" style={{ width: 32, height: 32 }}>
                <Download style={{ width: 13, height: 13 }} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════ VUE FIDÉLITÉ & PARRAINAGE ═══════════ */
/* ═══════════ TIERS — Bronze / Argent / Or / Platinum ═══════════ */
const TIERS = [
  { name: 'Bronze',   min: 0,    max: 99,   color: 'oklch(0.55 0.10 60)',  glow: 'oklch(0.62 0.13 60)',  bg: 'linear-gradient(165deg, oklch(0.30 0.04 60) 0%, oklch(0.20 0.06 50) 100%)' },
  { name: 'Argent',   min: 100,  max: 499,  color: 'oklch(0.78 0.012 250)', glow: 'oklch(0.85 0.02 250)', bg: 'linear-gradient(165deg, oklch(0.28 0.012 250) 0%, oklch(0.18 0.014 240) 100%)' },
  { name: 'Or',       min: 500,  max: 999,  color: 'oklch(0.78 0.13 85)',   glow: 'oklch(0.86 0.15 85)',  bg: 'linear-gradient(165deg, oklch(0.28 0.04 70) 0%, oklch(0.18 0.06 60) 100%)' },
  { name: 'Platinum', min: 1000, max: Infinity, color: 'oklch(0.65 0.13 165)', glow: 'oklch(0.78 0.15 165)', bg: 'linear-gradient(165deg, oklch(0.18 0.04 165) 0%, oklch(0.14 0.06 175) 100%)' },
];

function ViewFidelite({ client, loyalty, interventions = [], invoices = [] }) {
  const [copied, setCopied] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState(null);

  const referralCode = useMemo(() => {
    const base = (client?.name || client?.email || 'AMI').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6) || 'AMI';
    const suffix = (client?.lead_id || '').slice(-4).toUpperCase();
    return `${base}${suffix}`;
  }, [client]);

  const referralLink = `https://www.globalcleanhome.com/?ref=${referralCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Lien copié');
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Global Clean Home',
        text: `J'utilise Global Clean Home pour mon ménage — essaie avec mon code et nous gagnons chacun 20 € !`,
        url: referralLink,
      }).catch(() => {});
    } else {
      copyLink();
    }
  };

  // ═══ Calcul activité (interventions terminées + dépenses + filleuls) ═══
  const stats = useMemo(() => {
    const completed = interventions.filter(i => ['terminée', 'terminee'].includes(i.status)).length;
    const totalSpent = invoices.filter(i => ['payée', 'payee'].includes(i.status))
      .reduce((s, i) => s + Number(i.amount_ttc || i.amount || 0), 0);
    const referrals = Number(loyalty?.referrals || client?.referrals_count || 0);
    const ratingAvg = Number(loyalty?.rating_avg || client?.average_rating || 0);
    const seniority = client?.created_at ? Math.max(0, Math.floor((Date.now() - new Date(client.created_at).getTime()) / (30 * 86400000))) : 0;
    return { completed, totalSpent, referrals, ratingAvg, seniority };
  }, [interventions, invoices, loyalty, client]);

  // Points calculés : priorité au loyalty.points serveur, sinon estimation côté client
  const points = loyalty?.points != null
    ? Number(loyalty.points)
    : stats.completed * 50 + Math.floor(stats.totalSpent / 10) + stats.referrals * 50;

  const currentTier = TIERS.findLast ? TIERS.findLast(t => points >= t.min) : [...TIERS].reverse().find(t => points >= t.min);
  const tierIdx = TIERS.indexOf(currentTier);
  const nextTier = TIERS[tierIdx + 1];
  const progressInTier = nextTier
    ? Math.min(100, ((points - currentTier.min) / (nextTier.min - currentTier.min)) * 100)
    : 100;
  const ptsToNext = nextTier ? Math.max(0, nextTier.min - points) : 0;

  // ═══ Badges débloqués ═══
  const allBadges = [
    { id: 'firststep',  icon: '✨', name: 'Premier pas',     desc: '1ʳᵉ intervention réalisée',  cond: stats.completed >= 1 },
    { id: 'regular',    icon: '🔄', name: 'Régulier',        desc: '5+ interventions',           cond: stats.completed >= 5 },
    { id: 'loyal',      icon: '💎', name: 'Fidèle',          desc: '10+ interventions',          cond: stats.completed >= 10 },
    { id: 'veteran',    icon: '🏆', name: 'Vétéran',         desc: '25+ interventions',          cond: stats.completed >= 25 },
    { id: 'premium',    icon: '👑', name: 'Premium',         desc: '1 000 € dépensés',           cond: stats.totalSpent >= 1000 },
    { id: 'whale',      icon: '🐋', name: 'Élite',           desc: '5 000 € dépensés',           cond: stats.totalSpent >= 5000 },
    { id: 'ambassador', icon: '🤝', name: 'Ambassadeur',     desc: '1 filleul recruté',          cond: stats.referrals >= 1 },
    { id: 'tribe',      icon: '🌟', name: 'Tribu',           desc: '5 filleuls recrutés',        cond: stats.referrals >= 5 },
    { id: 'perfect',    icon: '🎯', name: 'Note parfaite',   desc: 'Moyenne ≥ 4.8/5',            cond: stats.ratingAvg >= 4.8 },
    { id: 'anniversary',icon: '🎂', name: 'Anniversaire',    desc: '12 mois d\'ancienneté',      cond: stats.seniority >= 12 },
    { id: 'eco',        icon: '🌱', name: 'Éco-responsable', desc: 'Produits écologiques choisis', cond: !!loyalty?.eco_choice },
    { id: 'platinum',   icon: '🛡️', name: 'Platinum',         desc: 'Niveau Platinum atteint',    cond: points >= 1000 },
  ];
  const earnedBadges = allBadges.filter(b => b.cond);
  const lockedBadges = allBadges.filter(b => !b.cond);

  // ═══ Récompenses débloquées par palier ═══
  const allRewards = [
    { tierMin: 0,    icon: '🎁', name: '20 € parrainage',         desc: 'Pour vous et votre filleul' },
    { tierMin: 100,  icon: '🚿', name: 'Produits écologiques',    desc: 'Sans surcoût sur demande' },
    { tierMin: 200,  icon: '⏱️', name: '+30 min offertes',         desc: 'À votre prochaine prestation' },
    { tierMin: 500,  icon: '🌟', name: 'Intervention prioritaire',desc: 'Créneaux réservés sous 24 h' },
    { tierMin: 750,  icon: '✨', name: 'Grand ménage offert',     desc: '1 fois par an' },
    { tierMin: 1000, icon: '💎', name: 'Conseiller dédié',        desc: 'Numéro direct, 7j/7' },
    { tierMin: 1500, icon: '🎄', name: 'Cadeau de fin d\'année', desc: 'Coffret artisanal' },
  ];

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-label">Programme fidélité</div>
      <h1 className="cpa-display" style={{ fontSize: 34, fontWeight: 300, margin: '8px 0 18px', lineHeight: 1 }}>
        Vos <em className="cpa-italic">récompenses</em>
      </h1>

      {/* ═══════════ Carte fidélité XXL — gradient adapté au tier ═══════════ */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        marginBottom: 16, padding: '24px 22px', borderRadius: 22,
        background: currentTier.bg,
        boxShadow: `0 12px 40px ${currentTier.color.replace(')', ' / 0.20)')}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        border: `1px solid ${currentTier.color.replace(')', ' / 0.32)')}`,
        color: 'oklch(0.95 0.01 80)',
      }}>
        {/* Halo de tier */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 220, height: 220, borderRadius: 999,
          background: `radial-gradient(circle, ${currentTier.glow.replace(')', ' / 0.22)')}, transparent 70%)`,
          filter: 'blur(2px)', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.72 0.04 80)' }}>
              Statut · <span style={{ color: currentTier.glow, fontWeight: 600 }}>{currentTier.name}</span>
            </div>
            <div className="cpa-display" style={{
              fontSize: 64, fontWeight: 300, color: currentTier.glow, lineHeight: 1, marginTop: 10,
              textShadow: `0 0 30px ${currentTier.color.replace(')', ' / 0.45)')}`,
              animation: 'cpa-shimmer 3s ease-in-out infinite',
            }}>
              {points.toLocaleString('fr-FR')}
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'oklch(0.82 0.03 80)', marginTop: 4 }}>
              points accumulés
            </div>
          </div>
          <TierMedal tier={currentTier} />
        </div>

        {/* Tier ladder */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(0.72 0.04 80)', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {TIERS.map((t, i) => (
              <span key={t.name} style={{
                color: i <= tierIdx ? t.glow : 'oklch(0.45 0.02 80)',
                fontWeight: i === tierIdx ? 700 : 400,
              }}>
                {t.name}
              </span>
            ))}
          </div>

          {/* Barre de progression segmentée */}
          <div style={{ display: 'flex', gap: 4, height: 6, marginBottom: 10 }}>
            {TIERS.map((t, i) => {
              const filled = i < tierIdx ? 100 : i === tierIdx ? progressInTier : 0;
              return (
                <div key={t.name} style={{
                  flex: 1, height: '100%', borderRadius: 999,
                  background: 'oklch(0.22 0.02 60)', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    width: `${filled}%`,
                    background: `linear-gradient(90deg, ${t.color}, ${t.glow})`,
                    transition: 'width 1.2s cubic-bezier(.4,0,.2,1)',
                    boxShadow: i === tierIdx ? `0 0 12px ${t.glow.replace(')', ' / 0.7)')}` : 'none',
                  }} />
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(0.72 0.04 80)' }}>
            <span>{points.toLocaleString('fr-FR')} pts</span>
            {nextTier ? (
              <span><strong style={{ color: currentTier.glow }}>{ptsToNext}</strong> pts → {nextTier.name}</span>
            ) : (
              <span style={{ color: currentTier.glow }}>★ Niveau maximum atteint</span>
            )}
          </div>
        </div>

        <style>{`
          @keyframes cpa-shimmer { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.18); } }
          @keyframes cpa-badge-glow { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        `}</style>
      </div>

      {/* ═══════════ Stats activité ═══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <ActivityChip label="Interventions" value={stats.completed} />
        <ActivityChip label="Filleuls" value={stats.referrals} />
        <ActivityChip label="Badges" value={`${earnedBadges.length}/${allBadges.length}`} />
      </div>

      {/* ═══════════ Badges (débloqués + à débloquer) ═══════════ */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div className="cpa-label">Vos badges</div>
          <div className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
            {earnedBadges.length} sur {allBadges.length}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 8 }}>
          {earnedBadges.map((b) => (
            <BadgeTile key={b.id} badge={b} earned onClick={() => setUnlockedBadge(b)} />
          ))}
          {lockedBadges.map((b) => (
            <BadgeTile key={b.id} badge={b} earned={false} onClick={() => setUnlockedBadge(b)} />
          ))}
        </div>
      </div>

      {/* ═══════════ Récompenses ═══════════ */}
      <div className="cpa-card" style={{ marginBottom: 16, padding: '16px 18px' }}>
        <div className="cpa-label" style={{ marginBottom: 12 }}>Récompenses du palier</div>
        {allRewards.map((r, i) => {
          const unlocked = points >= r.tierMin;
          return (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'center',
              padding: '10px 0', borderBottom: i < allRewards.length - 1 ? '1px solid var(--line-2)' : 0,
              opacity: unlocked ? 1 : 0.4,
            }}>
              <div style={{
                fontSize: 22, flexShrink: 0, width: 36, height: 36, textAlign: 'center', lineHeight: '36px',
                borderRadius: 10,
                background: unlocked ? 'var(--emerald-soft)' : 'var(--surface-2)',
                border: `1px solid ${unlocked ? 'var(--emerald)' : 'var(--line)'}`,
                filter: unlocked ? 'none' : 'grayscale(0.8)',
              }}>{r.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{r.name}</div>
                  {unlocked
                    ? <Check style={{ width: 13, height: 13, color: 'var(--emerald)' }} />
                    : <span className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{r.tierMin} pts</span>}
                </div>
                <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{r.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════ Parrainage ═══════════ */}
      <div className="cpa-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Gift style={{ width: 20, height: 20, color: 'var(--emerald)' }} />
          <div>
            <div className="cpa-label">Parrainez un ami</div>
            <div className="cpa-display" style={{ fontSize: 18, fontWeight: 500, margin: '2px 0 0' }}>
              +50 pts · 20 € pour <em className="cpa-italic">vous deux</em>
            </div>
          </div>
        </div>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 14 }}>
          Partagez votre code. À sa première prestation, vous gagnez 20 € de crédit + 50 points de fidélité.
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface-2)', border: '1px dashed var(--emerald)',
          borderRadius: 10, padding: '10px 12px', marginBottom: 10,
        }}>
          <span className="cpa-mono" style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--emerald-deep)', letterSpacing: '0.12em' }}>
            {referralCode}
          </span>
          <button onClick={copyLink} className="cpa-chip-btn" style={{ background: 'var(--emerald)', color: 'white', borderColor: 'var(--emerald)' }}>
            {copied ? <Check style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
        <button onClick={shareLink} className="cpa-cta-dark">
          <Send style={{ width: 13, height: 13 }} /> Partager le lien
        </button>
      </div>

      {/* Avantages permanents */}
      <div className="cpa-card">
        <div className="cpa-label" style={{ marginBottom: 12 }}>Avantages permanents</div>
        {[
          { icon: '⭐', t: 'Crédit d\'impôt 50% automatique', s: 'Attestation fiscale générée chaque année' },
          { icon: '🛡️', t: 'Garantie satisfait ou remboursé', s: 'Intervention reprise gratuitement' },
          { icon: '📞', t: 'Hotline dédiée 7j/7', s: 'Réponse sous 5 min en journée' },
          { icon: '🎂', t: 'Cadeau anniversaire', s: '10% sur votre prochaine prestation' },
        ].map((a, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'center',
            padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--line-2)' : 0,
          }}>
            <div style={{ fontSize: 22, flexShrink: 0, width: 32, textAlign: 'center' }}>{a.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{a.t}</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{a.s}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal détail badge */}
      {unlockedBadge && (
        <BottomSheet onClose={() => setUnlockedBadge(null)} maxHeight="60vh">
          <div style={{ textAlign: 'center', padding: '12px 0 18px' }}>
            <div style={{
              fontSize: 64, marginBottom: 14,
              filter: unlockedBadge.cond ? 'none' : 'grayscale(0.7)',
              animation: unlockedBadge.cond ? 'cpa-badge-glow 1.6s ease-in-out infinite' : 'none',
            }}>{unlockedBadge.icon}</div>
            <div className="cpa-label" style={{ color: unlockedBadge.cond ? 'var(--emerald)' : 'var(--ink-3)' }}>
              {unlockedBadge.cond ? 'Badge débloqué' : 'À débloquer'}
            </div>
            <h3 className="cpa-display" style={{ fontSize: 26, fontWeight: 500, margin: '6px 0 4px' }}>
              {unlockedBadge.name}
            </h3>
            <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>
              {unlockedBadge.desc}
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function TierMedal({ tier }) {
  return (
    <div style={{
      width: 56, height: 56, borderRadius: 999,
      background: `radial-gradient(circle at 30% 30%, ${tier.glow.replace(')', ' / 0.55)')}, ${tier.color.replace(')', ' / 0.25)')} 70%)`,
      border: `2px solid ${tier.glow.replace(')', ' / 0.45)')}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 0 26px ${tier.glow.replace(')', ' / 0.45)')}, inset 0 2px 4px rgba(255,255,255,0.18)`,
    }}>
      <Award style={{ width: 28, height: 28, color: tier.glow }} />
    </div>
  );
}

function ActivityChip({ label, value }) {
  return (
    <div style={{
      padding: '12px 10px', borderRadius: 14,
      background: 'var(--paper)', border: '1px solid var(--line)',
      textAlign: 'center',
    }}>
      <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
      <div className="cpa-label" style={{ marginTop: 4, fontSize: 9 }}>{label}</div>
    </div>
  );
}

function BadgeTile({ badge, earned, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '12px 6px', borderRadius: 14,
      background: earned ? 'linear-gradient(165deg, oklch(0.94 0.05 165), oklch(0.96 0.03 85))' : 'var(--surface-2)',
      border: `1px solid ${earned ? 'var(--emerald)' : 'var(--line)'}`,
      cursor: 'pointer', textAlign: 'center',
      opacity: earned ? 1 : 0.55,
      filter: earned ? 'none' : 'grayscale(0.8)',
      transition: 'transform .15s, box-shadow .15s',
      font: 'inherit',
    }}>
      <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 4 }}>{badge.icon}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, letterSpacing: '0.06em', textTransform: 'uppercase', color: earned ? 'var(--emerald-deep)' : 'var(--ink-3)', fontWeight: 600 }}>
        {badge.name}
      </div>
    </button>
  );
}

/* ═══════════ VUE DEMANDE INTERVENTION ═══════════ */
function ViewDemande({ client, onSubmit }) {
  const [form, setForm] = useState({
    service_type: 'Ménage',
    date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit(form);
      toast.success('Demande envoyée au conseiller');
      setForm({ service_type: 'Ménage', date: '', notes: '' });
    } catch { toast.error('Envoi impossible'); }
    setSaving(false);
  };

  const services = ['Ménage', 'Nettoyage bureaux', 'Canapé', 'Matelas', 'Tapis', 'Vitres', 'Fin de chantier', 'Déménagement'];

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-label">Nouvelle demande</div>
      <h1 className="cpa-display" style={{ fontSize: 34, fontWeight: 300, margin: '8px 0 18px', lineHeight: 1 }}>
        Planifier une <em className="cpa-italic">prestation</em>
      </h1>

      <div className="cpa-card" style={{ marginBottom: 14 }}>
        <div className="cpa-label" style={{ marginBottom: 10 }}>Quel service ?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {services.map(s => (
            <button key={s} onClick={() => setForm(p => ({ ...p, service_type: s }))}
              className={`cpa-chip-btn ${form.service_type === s ? 'active' : ''}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="cpa-card" style={{ marginBottom: 14 }}>
        <div className="cpa-label" style={{ marginBottom: 10 }}>Date souhaitée</div>
        <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--line)', background: 'var(--surface)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--ink)',
            outline: 'none',
          }} />
        <div className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 6, fontStyle: 'italic' }}>
          Le conseiller vous proposera le créneau le plus proche.
        </div>
      </div>

      <div className="cpa-card" style={{ marginBottom: 16 }}>
        <div className="cpa-label" style={{ marginBottom: 10 }}>Informations complémentaires</div>
        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          placeholder="Surface, pièces, état, contraintes d'accès, instructions particulières…"
          rows={4}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--line)', background: 'var(--surface)',
            fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)',
            outline: 'none', resize: 'vertical',
          }} />
      </div>

      <button onClick={handleSubmit} disabled={saving || !form.service_type} className="cpa-cta">
        {saving ? 'Envoi…' : 'Envoyer ma demande'} <Send style={{ width: 13, height: 13 }} />
      </button>
      <div style={{
        marginTop: 10, fontFamily: 'Fraunces, serif', fontStyle: 'italic',
        fontSize: 12, color: 'var(--ink-3)', textAlign: 'center',
      }}>
        Le conseiller vous répond sous ~5 min en journée.
      </div>
    </div>
  );
}

/* ═══════════ VUE CONSEILLER (messages) ═══════════ */
function ViewConseiller({ messages, advisor, onSend }) {
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 100px)' }}>
      <div className="cpa-label">Votre conseiller</div>
      <h1 className="cpa-display" style={{ fontSize: 30, fontWeight: 300, margin: '8px 0 14px', lineHeight: 1 }}>
        Le <em className="cpa-italic">salon</em>
      </h1>

      {advisor && (
        <div className="cpa-card" style={{ marginBottom: 14, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 999,
              background: 'var(--emerald-soft)', color: 'var(--emerald-deep)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500,
              border: '2px solid var(--emerald)',
            }}>
              {(advisor.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                {advisor.name || 'Votre conseiller'}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--emerald)', letterSpacing: '0.06em' }}>
                {advisor.status || 'Répond en ~5 min'}
              </div>
            </div>
            <a href="tel:+33622665308" className="cpa-icon-btn">
              <Phone style={{ width: 14, height: 14 }} />
            </a>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {messages.length === 0 ? (
          <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
            Aucun échange.<br/>Écrivez au conseiller, il vous répond sous 5 min.
          </div>
        ) : messages.map((m, i) => {
          const mine = m.from === 'client' || m.sender === 'client' || m.author_type === 'client' || m.from_client;
          return (
            <div key={m.id || m.message_id || i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px',
                background: mine ? 'var(--ink)' : 'var(--paper)',
                color: mine ? 'var(--bg)' : 'var(--ink)',
                border: mine ? 'none' : '1px solid var(--line)',
                borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontFamily: 'Fraunces, serif', fontSize: 14,
              }}>
                {m.content || m.text}
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, marginTop: 4, letterSpacing: '0.04em', opacity: 0.7 }}>
                  {fmtTime(m.created_at || m.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '12px 0 0' }}>
        <input
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { onSend(draft); setDraft(''); } }}
          placeholder="Écrire un message…"
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 999,
            background: 'var(--paper)', border: '1px solid var(--line)',
            fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)', outline: 'none',
          }} />
        <button onClick={() => { if (draft.trim()) { onSend(draft); setDraft(''); } }} disabled={!draft.trim()}
          style={{
            width: 44, height: 44, borderRadius: 999,
            background: draft.trim() ? 'var(--emerald)' : 'var(--line)',
            color: 'white', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Send style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════ VUE PROFIL ═══════════ */
function ViewProfil({ client, onSave, onLogout, onReplayTour }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
  });
  const [prefs, setPrefs] = useState({
    email_reminders: client?.pref_email_reminders !== false,
    sms_reminders: client?.pref_sms_reminders !== false,
    newsletter: client?.pref_newsletter !== false,
  });

  const save = async () => {
    try {
      await onSave({ ...form, preferences: prefs });
      setEditing(false);
      toast.success('Profil mis à jour');
    } catch { toast.error('Sauvegarde impossible'); }
  };

  const initials = (client?.name || '?').split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-card" style={{ padding: 26, textAlign: 'center', marginBottom: 16 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 999, margin: '0 auto 12px',
          background: 'linear-gradient(135deg, var(--emerald-soft), oklch(0.88 0.08 165))',
          color: 'var(--emerald-deep)', border: '3px solid var(--emerald)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500,
        }}>{initials}</div>
        <h2 className="cpa-display" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px' }}>
          {client?.name || 'Vous'}
        </h2>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)' }}>
          Client Global Clean Home{client?.since ? ` · depuis ${fmtDate(client.since)}` : ''}
        </div>
      </div>

      <div className="cpa-card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="cpa-label">Coordonnées</div>
          <button onClick={() => setEditing(e => !e)} className="cpa-chip-btn">
            <Edit3 style={{ width: 11, height: 11 }} /> {editing ? 'Annuler' : 'Modifier'}
          </button>
        </div>
        {editing ? (
          <>
            {[
              { k: 'name', label: 'Nom complet', icon: User },
              { k: 'email', label: 'Email', icon: Mail, type: 'email' },
              { k: 'phone', label: 'Téléphone', icon: Phone, type: 'tel' },
              { k: 'address', label: 'Adresse', icon: MapPin },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <div className="cpa-label" style={{ marginBottom: 6 }}>{f.label}</div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px',
                }}>
                  <f.icon style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
                  <input type={f.type || 'text'} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                    style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)' }} />
                </div>
              </div>
            ))}
            <button onClick={save} className="cpa-cta" style={{ marginTop: 4 }}>
              <Check style={{ width: 13, height: 13 }} /> Enregistrer
            </button>
          </>
        ) : (
          <>
            {[
              { icon: Mail, v: client?.email },
              { icon: Phone, v: client?.phone },
              { icon: MapPin, v: client?.address },
            ].filter(x => x.v).map((x, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--line-2)' : 0,
              }}>
                <x.icon style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
                <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)' }}>{x.v}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Préférences */}
      <div className="cpa-card" style={{ marginBottom: 14 }}>
        <div className="cpa-label" style={{ marginBottom: 12 }}>Préférences</div>
        {[
          { k: 'email_reminders', label: 'Rappels par email', sub: 'Avant chaque intervention' },
          { k: 'sms_reminders', label: 'Rappels SMS', sub: '1h avant le passage' },
          { k: 'newsletter', label: 'Newsletter mensuelle', sub: 'Astuces & actualités' },
        ].map((p, i) => (
          <div key={p.k} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--line-2)' : 0,
          }}>
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{p.label}</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 11, fontStyle: 'italic', color: 'var(--ink-3)' }}>{p.sub}</div>
            </div>
            <button onClick={() => setPrefs(x => ({ ...x, [p.k]: !x[p.k] }))}
              style={{
                width: 44, height: 24, borderRadius: 999, border: 0,
                background: prefs[p.k] ? 'var(--emerald)' : 'var(--line)',
                cursor: 'pointer', padding: 2, transition: 'background .15s',
                position: 'relative',
              }}>
              <div style={{
                width: 20, height: 20, borderRadius: 999, background: 'white',
                transform: `translateX(${prefs[p.k] ? 20 : 0}px)`, transition: 'transform .2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }} />
            </button>
          </div>
        ))}
      </div>

      {/* Aide & contact */}
      <div className="cpa-card" style={{ marginBottom: 14 }}>
        <div className="cpa-label" style={{ marginBottom: 12 }}>Aide &amp; contact</div>
        {[
          { icon: Phone, label: 'Nous appeler', value: '06 22 66 53 08', href: 'tel:+33622665308' },
          { icon: Mail, label: 'Email support', value: 'info@globalcleanhome.com', href: 'mailto:info@globalcleanhome.com' },
          { icon: HelpCircle, label: 'Questions fréquentes', value: 'FAQ du portail', href: '#' },
        ].map((x, i) => (
          <a key={i} href={x.href} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
            borderBottom: i < 2 ? '1px solid var(--line-2)' : 0,
            textDecoration: 'none', color: 'inherit',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-2)', flexShrink: 0,
            }}><x.icon style={{ width: 15, height: 15 }} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{x.label}</div>
              <div className="cpa-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{x.value}</div>
            </div>
            <ChevronRight style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
          </a>
        ))}
      </div>

      {onReplayTour && (
        <button onClick={onReplayTour} style={{
          width: '100%', padding: 12, borderRadius: 999, marginBottom: 10,
          background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink-2)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em',
          textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <HelpCircle style={{ width: 12, height: 12 }} /> Revoir la visite
        </button>
      )}
      <button onClick={onLogout} style={{
        width: '100%', padding: 14, borderRadius: 999,
        background: 'transparent', border: '1px solid var(--rouge)', color: 'var(--rouge)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em',
        textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <LogOut style={{ width: 13, height: 13 }} /> Se déconnecter
      </button>
    </div>
  );
}

/* ═══════════ LIVE TRACKING PANEL — agent en route, vu côté client ═══════════ */
function LiveTrackingPanel({ interventionId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [destCoords, setDestCoords] = useState(null);

  // Polling toutes les 15s
  useEffect(() => {
    if (!interventionId) return;
    let cancelled = false;
    const fetchLoc = async () => {
      try {
        const r = await pAxios.get(`${API_URL}/interventions/${interventionId}/agent-location`);
        if (!cancelled) { setData(r.data); setError(false); }
      } catch {
        if (!cancelled) setError(true);
      }
    };
    fetchLoc();
    const t = setInterval(fetchLoc, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, [interventionId]);

  // Géocoder l'adresse client (Nominatim, mémoïsé localStorage)
  useEffect(() => {
    const addr = data?.destination?.address;
    if (!addr) return;
    if (data?.destination?.lat != null && data?.destination?.lng != null) {
      setDestCoords({ lat: data.destination.lat, lng: data.destination.lng });
      return;
    }
    const cacheKey = `geo:${addr}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { setDestCoords(JSON.parse(cached)); return; } catch {}
    }
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`)
      .then(r => r.json())
      .then(arr => {
        if (Array.isArray(arr) && arr[0]) {
          const c = { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
          setDestCoords(c);
          try { localStorage.setItem(cacheKey, JSON.stringify(c)); } catch {}
        }
      })
      .catch(() => {});
  }, [data?.destination?.address, data?.destination?.lat, data?.destination?.lng]);

  if (error || !data || !data.active) return null;
  const { agent } = data;
  if (!agent || agent.lat == null || agent.lng == null) return null;

  // Distance haversine si on a la destination
  let distanceKm = null, etaMin = null;
  if (destCoords) {
    const R = 6371;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(destCoords.lat - agent.lat);
    const dLng = toRad(destCoords.lng - agent.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(agent.lat)) * Math.cos(toRad(destCoords.lat)) * Math.sin(dLng / 2) ** 2;
    distanceKm = 2 * R * Math.asin(Math.sqrt(a));
    etaMin = Math.max(1, Math.round((distanceKm / 28) * 60));  // 28 km/h moyenne urbaine
  }

  // Durée depuis le départ
  let elapsedLabel = '';
  if (agent.started_at) {
    const min = Math.max(0, Math.round((Date.now() - new Date(agent.started_at).getTime()) / 60000));
    elapsedLabel = min < 1 ? 'à l\'instant' : `${min} min`;
  }

  // OSM iframe centré sur la position de l'agent
  const span = 0.012;
  const bbox = `${agent.lng - span},${agent.lat - span * 0.7},${agent.lng + span},${agent.lat + span * 0.7}`;
  const osmSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${agent.lat},${agent.lng}`;

  return (
    <div className="cpa-fade" style={{
      marginBottom: 18, borderRadius: 18, overflow: 'hidden',
      background: 'linear-gradient(165deg, oklch(0.95 0.04 220) 0%, oklch(0.97 0.02 200) 100%)',
      border: '1px solid oklch(0.55 0.08 220)',
      boxShadow: '0 8px 24px oklch(0.55 0.08 220 / 0.15)',
    }}>
      {/* Header live */}
      <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: 999,
            background: 'oklch(0.55 0.08 220)',
            animation: 'cpalive 1.6s ease-in-out infinite',
          }} />
          <div className="cpa-label" style={{ color: 'oklch(0.42 0.10 220)' }}>En route · live</div>
        </div>
        <div className="cpa-mono" style={{ fontSize: 10, color: 'oklch(0.42 0.10 220)' }}>
          MAJ il y a {agent.updated_at ? Math.max(0, Math.round((Date.now() - new Date(agent.updated_at).getTime()) / 1000)) : 0}s
        </div>
      </div>
      <style>{`@keyframes cpalive { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.6)} }`}</style>

      {/* Carte */}
      <div style={{ position: 'relative', height: 200, background: 'oklch(0.92 0.01 220)' }}>
        <iframe
          title="Position intervenant"
          src={osmSrc}
          style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          loading="lazy"
        />
      </div>

      {/* Infos agent + ETA */}
      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div>
            <div className="cpa-label">Intervenant en chemin</div>
            <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1, marginTop: 4 }}>
              {agent.name || 'Votre intervenant'}
            </div>
            {elapsedLabel && (
              <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                Parti il y a {elapsedLabel}
              </div>
            )}
          </div>
          {etaMin != null && (
            <div style={{ textAlign: 'right' }}>
              <div className="cpa-display" style={{ fontSize: 28, fontWeight: 500, color: 'oklch(0.42 0.10 220)', lineHeight: 1 }}>
                ~{etaMin}<span style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--ink-3)' }}> min</span>
              </div>
              <div className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {agent.phone && (
            <a href={`tel:${agent.phone}`} style={{
              flex: 1, padding: '12px 14px', borderRadius: 12,
              background: 'oklch(0.42 0.10 220)', color: 'white',
              border: 'none', textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Phone style={{ width: 13, height: 13 }} /> Appeler
            </a>
          )}
          <a
            href={`https://www.openstreetmap.org/?mlat=${agent.lat}&mlon=${agent.lng}#map=15/${agent.lat}/${agent.lng}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 12,
              background: 'transparent', color: 'oklch(0.42 0.10 220)',
              border: '1px solid oklch(0.55 0.08 220)', textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <Navigation style={{ width: 13, height: 13 }} /> Voir en grand
          </a>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ INTERVENTION DETAIL ═══════════ */
function InterventionDetail({ intervention, onClose }) {
  const isUpcoming = intervention.status !== 'terminée';
  const isOnRoute = intervention.status === 'en_route';
  return (
    <BottomSheet onClose={onClose}>
      <div className="cpa-label" style={{ marginBottom: 4 }}>
        {isOnRoute ? 'Intervenant en route' : isUpcoming ? 'Intervention planifiée' : 'Intervention terminée'}
      </div>
      <h2 className="cpa-display" style={{ fontSize: 26, fontWeight: 300, lineHeight: 1.1, margin: '0 0 18px' }}>
        Bienvenue chez <em className="cpa-italic">{intervention.lead_name || intervention.address?.split(',')[0] || 'vous'}</em>
      </h2>

      {isOnRoute && (
        <LiveTrackingPanel interventionId={intervention.intervention_id || intervention.id} />
      )}

      {isUpcoming && !isOnRoute && <MapTrail distance="à venir" />}

      <div className="cpa-card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="cpa-label">Mission</div>
          {intervention.is_recurring && <span className="cpa-pill" style={{ color: 'var(--emerald-deep)', background: 'var(--emerald-soft)', borderColor: 'var(--emerald)' }}>Récurrent</span>}
        </div>
        <div className="cpa-display" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
          {intervention.title || intervention.service_type}
          {intervention.duration_hours ? ` · ${intervention.duration_hours}h` : ''}
        </div>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginBottom: 12 }}>
          {fmtDate(intervention.scheduled_date)} · {intervention.scheduled_time || ''}
        </div>
        {intervention.address && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>
            <MapPin style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
            {intervention.address}
          </div>
        )}
        {intervention.agent_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-2)' }}>
            <User style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
            Intervenant · <strong>{intervention.agent_name}</strong>
          </div>
        )}
      </div>

      {isUpcoming && intervention.address && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(intervention.address)}`}
          target="_blank" rel="noopener noreferrer"
          className="cpa-cta-dark"
          style={{ marginTop: 14, background: 'var(--emerald-soft)', color: 'var(--emerald-deep)', textDecoration: 'none' }}
        >
          <Navigation style={{ width: 13, height: 13 }} /> Voir l'adresse sur la carte
        </a>
      )}
    </BottomSheet>
  );
}

/* ═══════════ REVIEW MODAL ═══════════ */
function ReviewModal({ intervention, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    await onSubmit({ intervention_id: intervention.intervention_id, rating, comment });
    setSaving(false);
  };

  return (
    <BottomSheet onClose={onClose}>
      <div className="cpa-label">Votre avis</div>
      <h2 className="cpa-display" style={{ fontSize: 24, fontWeight: 300, margin: '4px 0 18px' }}>
        Votre <em className="cpa-italic">retour</em> compte
      </h2>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setRating(n)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Star style={{ width: 38, height: 38, color: n <= rating ? 'var(--gold)' : 'var(--line)', fill: n <= rating ? 'var(--gold)' : 'transparent' }} />
          </button>
        ))}
      </div>

      <textarea value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Un mot pour l'intervenant (optionnel)…" rows={4}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 12,
          background: 'var(--surface)', border: '1px solid var(--line)',
          fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)',
          outline: 'none', resize: 'vertical', marginBottom: 16,
        }} />

      <button onClick={submit} disabled={saving} className="cpa-cta">
        {saving ? 'Envoi…' : 'Publier mon avis'} <Check style={{ width: 14, height: 14 }} />
      </button>
    </BottomSheet>
  );
}

/* ═══════════ NOTIFICATIONS DRAWER ═══════════ */
function NotificationsDrawer({ notifications, onClose, onMarkRead }) {
  return (
    <>
      <div className="cpa-drawer-back" onClick={onClose} />
      <div className="cpa-drawer">
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="cpa-label">Notifications</div>
              <h2 className="cpa-display" style={{ fontSize: 22, fontWeight: 300, margin: '4px 0 0' }}>
                Vos <em className="cpa-italic">alertes</em>
              </h2>
            </div>
            <button onClick={onClose} className="cpa-icon-btn">
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 20px' }}>
          {notifications.length === 0 ? (
            <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
              Aucune notification.
            </div>
          ) : notifications.map((n, i) => (
            <div key={n.id || i} style={{
              padding: '14px 16px', borderRadius: 12,
              background: n.read ? 'var(--surface)' : 'var(--emerald-soft)',
              border: '1px solid', borderColor: n.read ? 'var(--line)' : 'var(--emerald)',
              marginBottom: 8,
              cursor: 'pointer',
            }} onClick={() => onMarkRead(n.id)}>
              <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                {fmtDateShort(n.created_at)} · {fmtTime(n.created_at)}
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>
                {n.title}
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 12, fontStyle: 'italic', color: 'var(--ink-3)', lineHeight: 1.4 }}>
                {n.message}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ═══════════ COMPARATEUR DE DEVIS ═══════════ */
function QuoteComparator({ quotes, onClose, onSelect }) {
  // Collecte de toutes les caractéristiques pour comparaison ligne à ligne
  const rows = useMemo(() => {
    const collectInclusions = (q) => {
      if (Array.isArray(q.line_items) && q.line_items.length) {
        return q.line_items.slice(0, 8).map(li => li.label || li.description || '').filter(Boolean);
      }
      return [];
    };
    return quotes.map(q => ({
      id: q.quote_id,
      number: q.quote_number || q.quote_id?.slice(-8).toUpperCase(),
      title: q.title || q.service_type || 'Devis',
      service: q.service_type || '—',
      frequency: q.frequency || 'unique',
      interventions: q.interventions_count || 1,
      duration: q.duration_hours || (q.line_items?.[0]?.hours) || null,
      ttc: Number(q.amount || 0),
      ht: Number(q.amount_ht ?? (q.tva_rate ? q.amount / (1 + q.tva_rate / 100) : q.amount) ?? 0),
      created: q.created_at,
      inclusions: collectInclusions(q),
      raw: q,
    }));
  }, [quotes]);

  const cheapest = rows.reduce((min, r) => r.ttc < min.ttc ? r : min, rows[0] || { ttc: Infinity });
  const minPerHour = rows
    .filter(r => r.duration && r.ttc)
    .reduce((min, r) => {
      const ph = r.ttc / (r.duration * (r.interventions || 1));
      return ph < min.ph ? { id: r.id, ph } : min;
    }, { id: null, ph: Infinity });

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(6px)', zIndex: 95,
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} className="cpa-fade" style={{
        background: 'var(--paper)', width: '100%',
        borderRadius: '24px 24px 0 0', maxHeight: '94vh', overflowY: 'auto',
        padding: '22px 18px 28px',
      }}>
        <div style={{ width: 40, height: 4, background: 'var(--line)', borderRadius: 999, margin: '0 auto 14px' }} />

        <div className="cpa-label">Comparateur</div>
        <h2 className="cpa-display" style={{ fontSize: 26, fontWeight: 300, margin: '4px 0 6px' }}>
          {rows.length} devis <em className="cpa-italic">côte à côte</em>
        </h2>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>
          Comparez prix, fréquence et prestations avant de signer.
        </div>

        {/* Cartes en colonnes scrollables */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
          {rows.map(r => {
            const isCheapest = r.id === cheapest.id && rows.length > 1;
            const isBestRate = r.id === minPerHour.id && minPerHour.ph !== Infinity && rows.length > 1;
            return (
              <div key={r.id} style={{
                flex: '0 0 75%', maxWidth: 320,
                background: 'var(--surface)',
                border: `1.5px solid ${isCheapest ? 'var(--emerald)' : 'var(--line)'}`,
                borderRadius: 16, padding: '14px 16px',
                position: 'relative',
              }}>
                {(isCheapest || isBestRate) && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                    {isCheapest && <span style={{
                      padding: '3px 7px', borderRadius: 999,
                      background: 'var(--emerald-soft)', color: 'var(--emerald-deep)',
                      border: '1px solid var(--emerald)',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
                      letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
                    }}>★ Le moins cher</span>}
                    {isBestRate && <span style={{
                      padding: '3px 7px', borderRadius: 999,
                      background: 'var(--gold-soft)', color: 'oklch(0.45 0.13 78)',
                      border: '1px solid var(--gold)',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
                      letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
                    }}>Meilleur €/h</span>}
                  </div>
                )}

                <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                  {r.number}
                </div>
                <div className="cpa-display" style={{ fontSize: 15, fontWeight: 500, marginTop: 4, lineHeight: 1.2 }}>
                  {r.title}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 12 }}>
                  <div className="cpa-display" style={{ fontSize: 26, fontWeight: 500, color: isCheapest ? 'var(--emerald-deep)' : 'var(--ink)', lineHeight: 1 }}>
                    {fmtEur(r.ttc)}
                  </div>
                  <div className="cpa-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>€ TTC</div>
                </div>

                {r.duration && r.interventions > 1 && (
                  <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 3 }}>
                    {fmtEur(r.ttc / r.interventions)} € / passage
                  </div>
                )}

                <div style={{ height: 1, background: 'var(--line-2)', margin: '12px 0' }} />

                <ComparisonRow label="Service" value={r.service} />
                <ComparisonRow label="Fréquence" value={r.frequency === 'unique' ? 'Ponctuel' : r.frequency} />
                {r.interventions > 1 && <ComparisonRow label="Passages" value={r.interventions} />}
                {r.duration && <ComparisonRow label="Durée" value={`${r.duration} h`} />}
                <ComparisonRow label="Émis le" value={fmtDateShort(r.created)} />

                {r.inclusions.length > 0 && (
                  <>
                    <div style={{ height: 1, background: 'var(--line-2)', margin: '10px 0' }} />
                    <div className="cpa-label" style={{ marginBottom: 6 }}>Inclus</div>
                    {r.inclusions.slice(0, 5).map((inc, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontFamily: 'Fraunces, serif', fontSize: 11, color: 'var(--ink-2)', marginBottom: 3,
                      }}>
                        <Check style={{ width: 11, height: 11, color: 'var(--emerald)', flexShrink: 0 }} />
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc}</span>
                      </div>
                    ))}
                  </>
                )}

                <button onClick={() => onSelect(r.raw)} style={{
                  width: '100%', marginTop: 14, padding: '10px 12px', borderRadius: 999,
                  background: 'var(--ink)', color: 'oklch(0.95 0.01 80)', border: 'none',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  Voir et signer <ArrowRight style={{ width: 11, height: 11 }} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', textAlign: 'center', letterSpacing: '0.08em' }}>
          ← Faites glisser pour voir tous les devis →
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
      <span className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: 'Fraunces, serif', fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{value}</span>
    </div>
  );
}

/* ═══════════ ONBOARDING — Tour interactif au 1er login ═══════════ */
function OnboardingTour({ client, onClose }) {
  const [step, setStep] = useState(0);
  const firstName = (client?.name || client?.full_name || '').split(' ')[0] || 'vous';

  const slides = [
    {
      icon: '✨',
      eyebrow: 'Bienvenue',
      title: <>Bonjour <em className="cpa-italic">{firstName}</em>.</>,
      body: 'Votre portail Global Clean Home — un espace privé pour suivre vos prestations, vos paiements et votre programme fidélité.',
      cta: 'Commencer la visite',
    },
    {
      icon: '📊',
      eyebrow: 'Tableau de bord',
      title: <>Votre <em className="cpa-italic">activité</em> en un coup d'œil.</>,
      body: "Dépenses cumulées année courante, comparaison avec l'année passée, crédit d'impôt 50 % calculé automatiquement, répartition par service. Tout est mis à jour à chaque facture.",
      cta: 'Suivant',
    },
    {
      icon: '🚗',
      eyebrow: 'Suivi temps réel',
      title: <>Votre intervenant en <em className="cpa-italic">live</em>.</>,
      body: "Quand votre intervenant part pour votre prestation, vous voyez sa position GPS sur la carte avec une estimation d'arrivée actualisée toutes les 15 secondes.",
      cta: 'Suivant',
    },
    {
      icon: '🏆',
      eyebrow: 'Programme fidélité',
      title: <>4 paliers, 12 <em className="cpa-italic">badges</em> à débloquer.</>,
      body: 'Bronze, Argent, Or, Platinum : plus vous restez fidèle, plus vous accédez à des avantages premium. Parrainez vos amis pour gagner 50 pts + 20 € à chaque inscription.',
      cta: 'Suivant',
    },
    {
      icon: '📁',
      eyebrow: 'Espace pro',
      title: <>Tout pour votre <em className="cpa-italic">comptabilité</em>.</>,
      body: 'Bilan fiscal annuel, exports CSV, attestation fiscale imprimable, mailto comptable pré-rempli. Que vous soyez particulier ou indépendant, votre comptable adorera.',
      cta: 'Suivant',
    },
    {
      icon: '💬',
      eyebrow: 'Conseiller dédié',
      title: <>Une question ? <em className="cpa-italic">Écrivez-nous</em>.</>,
      body: 'Votre conseiller répond en moyenne en 5 minutes pendant les heures ouvrées. Hotline 7j/7 pour les urgences.',
      cta: "C'est parti !",
    },
  ];

  const cur = slides[step];
  const isLast = step === slides.length - 1;

  const finish = () => {
    try { localStorage.setItem('cpa_onboarded', '1'); } catch {}
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 110,
      background: 'oklch(0.10 0.01 60)',
      display: 'flex', flexDirection: 'column',
      animation: 'cpaFadeIn .3s',
    }}>
      <style>{`@keyframes cpaFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>

      {/* Progression */}
      <div style={{
        display: 'flex', gap: 4, padding: '14px 18px',
      }}>
        {slides.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 999,
            background: i < step ? 'oklch(0.72 0.13 85)' : i === step ? 'oklch(0.95 0.01 80)' : 'oklch(0.30 0.02 60)',
            transition: 'background .3s',
          }} />
        ))}
      </div>

      <button onClick={finish} style={{
        position: 'absolute', top: 16, right: 16, zIndex: 2,
        width: 36, height: 36, borderRadius: 999,
        background: 'oklch(0.18 0.02 60)', border: '1px solid oklch(0.28 0.02 60)',
        color: 'oklch(0.85 0.03 80)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}>
        <X style={{ width: 14, height: 14 }} />
      </button>

      {/* Contenu */}
      <div key={step} style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '20px 32px', color: 'oklch(0.95 0.01 80)',
        animation: 'cpaSlideIn .4s ease-out',
      }}>
        <style>{`@keyframes cpaSlideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 24 }}>{cur.icon}</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.72 0.13 85)', marginBottom: 10 }}>
          {cur.eyebrow} · {step + 1} / {slides.length}
        </div>
        <h2 className="cpa-display" style={{ fontSize: 38, fontWeight: 300, lineHeight: 1.05, margin: '0 0 18px', color: 'oklch(0.95 0.01 80)' }}>
          {cur.title}
        </h2>
        <p style={{
          fontFamily: 'Fraunces, serif', fontSize: 16, fontStyle: 'italic',
          color: 'oklch(0.85 0.03 80)', lineHeight: 1.6, margin: 0, maxWidth: 480,
        }}>
          {cur.body}
        </p>
      </div>

      {/* Actions */}
      <div style={{ padding: '20px 24px 32px', display: 'flex', gap: 10 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            padding: '14px 20px', borderRadius: 999,
            background: 'transparent', border: '1px solid oklch(0.30 0.02 60)',
            color: 'oklch(0.85 0.03 80)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>
            Retour
          </button>
        )}
        <button onClick={() => isLast ? finish() : setStep(s => s + 1)} style={{
          flex: 1, padding: '14px 24px', borderRadius: 999,
          background: 'oklch(0.72 0.13 85)', color: 'oklch(0.10 0.02 60)', border: 'none',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {cur.cta} <ArrowRight style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════ MEMBERSHIP CARD REVEAL — animation 3D au premier login ═══════════ */
function MembershipCardReveal({ client, loyalty, interventions = [], invoices = [], onClose }) {
  // Calculs des points (mêmes règles que ViewFidelite)
  const stats = useMemo(() => {
    const completed = interventions.filter(i => ['terminée', 'terminee'].includes(i.status)).length;
    const totalSpent = invoices.filter(i => ['payée', 'payee'].includes(i.status))
      .reduce((s, i) => s + Number(i.amount_ttc || i.amount || 0), 0);
    const referrals = Number(loyalty?.referrals || client?.referrals_count || 0);
    return { completed, totalSpent, referrals };
  }, [interventions, invoices, loyalty, client]);

  const points = loyalty?.points != null
    ? Number(loyalty.points)
    : stats.completed * 50 + Math.floor(stats.totalSpent / 10) + stats.referrals * 50;

  const tier = points >= 1000 ? 'Platinum' : points >= 500 ? 'Or' : points >= 100 ? 'Argent' : 'Bronze';
  const tierColor = points >= 1000 ? 'oklch(0.78 0.15 165)'
    : points >= 500 ? 'oklch(0.86 0.15 85)'
    : points >= 100 ? 'oklch(0.85 0.02 250)'
    : 'oklch(0.62 0.13 60)';

  const fullName = (client?.name || client?.full_name || '—').toUpperCase();
  const memberId = (client?.lead_id || '0000-0000-0000').slice(-12).toUpperCase().padStart(12, '0').match(/.{1,4}/g)?.join(' · ') || '0000 · 0000 · 0000';
  const since = client?.created_at ? new Date(client.created_at).toLocaleDateString('fr-FR', { month: '2-digit', year: '2-digit' }) : '—/—';

  return (
    <div className="cpa-mc-overlay">
      <button onClick={onClose} className="cpa-mc-skip">Entrer →</button>

      <div className="cpa-mc-card">
        {/* Tier badge top */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'oklch(0.72 0.04 80)',
            }}>
              Global Clean Home
            </div>
            <div style={{
              fontFamily: 'Fraunces, serif', fontSize: 14, fontStyle: 'italic',
              color: 'oklch(0.85 0.03 80)', marginTop: 2,
            }}>
              Membership
            </div>
          </div>
          <div style={{
            padding: '5px 11px', borderRadius: 999,
            background: `oklch(0.95 0.18 165 / 0.12)`,
            border: `1px solid ${tierColor}`,
            color: tierColor,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700,
            textShadow: `0 0 12px ${tierColor}`,
          }}>
            ★ {tier}
          </div>
        </div>

        {/* Numéro de membre */}
        <div style={{
          marginTop: 36, position: 'relative', zIndex: 1,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 14,
          letterSpacing: '0.08em', color: 'oklch(0.85 0.05 165)',
          fontWeight: 600,
        }}>
          {memberId}
        </div>

        {/* Bottom : nom + valid since */}
        <div style={{
          position: 'absolute', left: 24, right: 24, bottom: 22,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 1,
        }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'oklch(0.72 0.04 80)', marginBottom: 4,
            }}>
              Membre
            </div>
            <div style={{
              fontFamily: 'Inter Tight, sans-serif', fontSize: 18, fontWeight: 600,
              letterSpacing: '0.04em', color: 'oklch(0.97 0.005 80)',
              lineHeight: 1, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {fullName}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'oklch(0.72 0.04 80)', marginBottom: 4,
            }}>
              Depuis
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600,
              color: 'oklch(0.97 0.005 80)', lineHeight: 1,
            }}>
              {since}
            </div>
          </div>
        </div>
      </div>

      {/* Texte d'accueil sous la carte */}
      <div style={{
        position: 'absolute', bottom: 'calc(50% - min(360px, 90vw) * 0.6)',
        left: 0, right: 0, textAlign: 'center', zIndex: 1,
        animation: 'cpa-fade .8s ease 1.2s both',
      }}>
        <div style={{
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 16,
          color: 'oklch(0.78 0.012 80)', maxWidth: 320, margin: '0 auto', lineHeight: 1.5,
        }}>
          Votre carte de membre <em style={{ color: 'oklch(0.85 0.18 165)' }}>{tier}</em>.<br/>
          Bienvenue dans votre espace.
        </div>
      </div>
    </div>
  );
}

/* ═══════════ BURGER MENU — desktop only (drawer latéral gauche) ═══════════ */
function BurgerMenu({ open, onClose, tab, onSelectTab, client, onLogout, hasUnreadMessages }) {
  if (!open) return null;

  const sections = [
    { k: 'accueil',       icon: Home,          label: 'Accueil',                  hint: 'Tableau de bord' },
    { k: 'quotes',        icon: FileText,      label: 'Devis',                    hint: 'Propositions' },
    { k: 'invoices',      icon: CreditCard,    label: 'Factures',                 hint: 'Paiements' },
    { k: 'interventions', icon: Calendar,      label: 'Interventions',            hint: 'Passages planifiés' },
    { k: 'documents',     icon: Folder,        label: 'Documents',                hint: 'Bibliothèque PDF' },
    { k: 'fidelite',      icon: Award,         label: 'Programme fidélité',       hint: 'Points & récompenses' },
    { k: 'demande',       icon: Plus,          label: 'Demander une intervention', hint: 'Nouvelle prestation' },
    { k: 'conseiller',    icon: MessageSquare, label: 'Conseiller',               hint: 'Messagerie',      unread: hasUnreadMessages },
    { k: 'profil',        icon: User,          label: 'Mon profil',               hint: 'Coordonnées & sécurité' },
  ];

  const select = (k) => {
    onSelectTab(k);
    onClose();
  };

  const firstName = (client?.name || client?.full_name || client?.lead_name || '').split(' ')[0] || 'Bonjour';
  const fullName = client?.name || client?.full_name || client?.lead_name || '—';
  const email = client?.email || '';

  // Couleurs explicites pour éviter toute cascade qui assombrirait le drawer
  const C = {
    ink: 'oklch(0.20 0.04 250)',     // bleu marine
    ink2: 'oklch(0.36 0.03 250)',    // gris bleu medium
    ink3: 'oklch(0.55 0.02 240)',    // gris bleu light
    paper: '#fffaf3',                // crème chaud
    surface: 'oklch(0.96 0.014 80)', // crème un peu plus marqué
    line: 'oklch(0.88 0.012 240)',   // border doux
    line2: 'oklch(0.93 0.008 240)',  // border encore plus doux
    sage: 'oklch(0.92 0.05 165)',    // sage pastel bg
    sageFg: 'oklch(0.32 0.12 165)',  // sage pastel texte
    rouge: 'oklch(0.50 0.16 25)',    // rouge accent
    rougeBg: 'oklch(0.93 0.04 25)',  // rouge bg pastel
  };

  return (
    <>
      <div className="cpa-burger-back" onClick={onClose} />
      <aside className="cpa-burger" role="dialog" aria-label="Menu de navigation"
        style={{ background: C.paper, color: C.ink }}>
        {/* Header */}
        <div style={{
          padding: '20px 22px 18px',
          borderBottom: `1px solid ${C.line2}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12,
          background: C.paper,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: C.ink3, fontWeight: 700, marginBottom: 6,
            }}>Espace Client</div>
            <div style={{
              fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500,
              lineHeight: 1, color: C.ink, letterSpacing: '-0.02em',
            }}>
              Bonjour <em style={{ fontStyle: 'italic', color: 'oklch(0.45 0.13 165)', fontWeight: 500 }}>{firstName}</em>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{
            width: 36, height: 36, borderRadius: 999,
            background: C.surface, border: `1px solid ${C.line}`,
            color: C.ink2, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Mini profil */}
        {(fullName !== '—' || email) && (
          <div style={{
            padding: '12px 22px',
            borderBottom: `1px solid ${C.line2}`,
            display: 'flex', alignItems: 'center', gap: 12,
            background: C.paper,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 999,
              background: C.sage, color: C.sageFg,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600,
              flexShrink: 0,
              border: `1px solid ${C.sageFg}`,
            }}>
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: C.ink,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{fullName}</div>
              {email && (
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.ink3,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  marginTop: 2,
                }}>{email}</div>
              )}
            </div>
          </div>
        )}

        {/* Liste des sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', background: C.paper }}>
          {sections.map(s => {
            const Icon = s.icon;
            const active = tab === s.k;
            return (
              <button
                key={s.k}
                className={`cpa-burger-item ${active ? 'active' : ''}`}
                onClick={() => select(s.k)}
                style={{ marginBottom: 4 }}
              >
                <Icon style={{
                  width: 18, height: 18,
                  color: active ? C.paper : C.ink3,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{
                    fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600,
                    color: active ? C.paper : C.ink,
                    lineHeight: 1.2,
                  }}>{s.label}</div>
                  <div style={{
                    fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500,
                    color: active ? 'oklch(0.78 0.012 80)' : C.ink3,
                    marginTop: 3,
                  }}>{s.hint}</div>
                </div>
                {s.unread && <span className="cpa-burger-dot" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 18px',
          borderTop: `1px solid ${C.line2}`,
          background: C.paper,
        }}>
          <button onClick={() => { onClose(); onLogout(); }} style={{
            width: '100%', padding: 12, borderRadius: 12,
            background: 'transparent', border: `1px solid oklch(0.85 0.06 25)`,
            color: C.rouge, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.rougeBg; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <LogOut style={{ width: 13, height: 13 }} /> Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}

/* ═══════════ DASHBOARD PRINCIPAL ═══════════ */
function Dashboard({ client, onLogout, onRefreshClient }) {
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('accueil');
  const [openQuote, setOpenQuote] = useState(null);
  const [signQuote, setSignQuote] = useState(null);
  const [openIntv, setOpenIntv] = useState(null);
  const [reviewIntv, setReviewIntv] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return localStorage.getItem('cpa_onboarded') !== '1'; } catch { return false; }
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [q, i, iv] = await Promise.allSettled([
        pAxios.get(`${API_URL}/quotes`),
        pAxios.get(`${API_URL}/invoices`),
        pAxios.get(`${API_URL}/interventions`),
      ]);
      setQuotes(q.status === 'fulfilled' ? (q.value.data?.quotes || q.value.data || []) : []);
      setInvoices(i.status === 'fulfilled' ? (i.value.data?.invoices || i.value.data || []) : []);
      setInterventions(iv.status === 'fulfilled' ? (iv.value.data?.interventions || iv.value.data || []) : []);
    } catch { toast.error('Chargement impossible'); }
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const r = await pAxios.get(CHAT_API + '/portal/conversation');
      setMessages(r.data?.messages || r.data || []);
    } catch {}
  }, []);

  const loadNotifs = useCallback(async () => {
    try {
      const r = await pAxios.get(`${API_URL}/notifications`);
      setNotifications(r.data?.notifications || r.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchData(); loadNotifs(); }, [fetchData, loadNotifs]);
  useEffect(() => {
    if (tab === 'conseiller') {
      loadMessages();
      const t = setInterval(loadMessages, 10000);
      return () => clearInterval(t);
    }
  }, [tab, loadMessages]);

  const handleSign = async (fullName) => {
    const quoteId = signQuote?.quote_id || signQuote?.id;
    if (!quoteId) {
      toast.error('Identifiant du devis introuvable');
      return;
    }
    try {
      const r = await pAxios.post(`${API_URL}/quotes/${quoteId}/sign`, { signature: fullName });
      if (r.data?.success) {
        toast.success('✓ Devis signé — merci !');
        // Ferme la feuille de signature mais GARDE le devis ouvert avec le bandeau "Accepté"
        setSignQuote(null);
        // Refresh + remplace openQuote par la version mise à jour (statut accepté)
        await fetchData();
        // Le useEffect ci-dessous synchronise openQuote avec la liste rafraîchie
      } else {
        toast.error(r.data?.message || 'Réponse inattendue du serveur');
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Erreur réseau';
      toast.error(`Signature impossible · ${typeof msg === 'string' ? msg : 'erreur'}`);
      console.error('Sign error', err);
    }
  };

  // Synchronise openQuote avec la liste rafraîchie après signature/refus
  useEffect(() => {
    if (!openQuote) return;
    const currentId = openQuote.quote_id || openQuote.id;
    const fresh = quotes.find(q => (q.quote_id || q.id) === currentId);
    if (fresh && fresh.status !== openQuote.status) {
      setOpenQuote(fresh);
    }
  }, [quotes, openQuote]);
  const handleRefuse = async (quote) => {
    const quoteId = quote?.quote_id || quote?.id;
    if (!quoteId) return toast.error('Identifiant du devis introuvable');
    if (!window.confirm('Refuser ce devis ?')) return;
    try {
      await pAxios.post(`${API_URL}/quotes/${quoteId}/respond`, { action: 'refuse' });
      setOpenQuote(null); fetchData();
      toast.success('Devis refusé');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Erreur';
      toast.error(typeof msg === 'string' ? msg : 'Erreur');
    }
  };
  const handleDownloadQuote = async (quote) => {
    const quoteId = quote?.quote_id || quote?.id;
    if (!quoteId) return toast.error('Identifiant du devis introuvable');
    const portalToken = localStorage.getItem('portal_token');
    if (!portalToken) return toast.error('Session expirée — reconnectez-vous');

    try {
      const r = await pAxios.get(`${API_URL}/quotes/${quoteId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([r.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      // Ouvre dans un nouvel onglet (preview navigateur) + lien direct si bloqué
      const win = window.open(url, '_blank');
      if (!win) {
        // Pop-up bloquée → forcer un téléchargement
        const a = document.createElement('a');
        a.href = url;
        a.download = `devis_${quote.quote_number || quoteId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Téléchargement impossible';
      toast.error(typeof msg === 'string' ? msg : 'Téléchargement impossible');
      console.error('Download PDF error', err);
    }
  };
  const handlePay = async (invoice) => {
    try {
      const r = await pAxios.post(`${API_URL}/invoices/${invoice.invoice_id}/checkout`);
      if (r.data?.checkout_url) {
        window.location.href = r.data.checkout_url;
      } else {
        toast.error('Paiement en ligne indisponible pour cette facture');
      }
    } catch {
      toast.error('Lien de paiement indisponible — contactez le conseiller');
    }
  };
  const handleSendMsg = async (content) => {
    try {
      await pAxios.post(CHAT_API + '/portal/message', { content });
      loadMessages();
    } catch { toast.error('Envoi impossible'); }
  };
  const handleReview = async ({ intervention_id, rating, comment }) => {
    try {
      await pAxios.post(`${API_URL}/reviews`, { intervention_id, rating, comment });
      setReviewIntv(null); fetchData();
      toast.success('Merci pour votre avis');
    } catch { toast.error('Envoi impossible'); }
  };
  const handleDemande = async (form) => {
    await pAxios.post(CHAT_API + '/portal/message', {
      content: `📋 Demande d'intervention : ${form.service_type}${form.date ? ' · souhaité le ' + form.date : ''}${form.notes ? '\n\n' + form.notes : ''}`,
    });
  };
  const handleSaveProfile = async (data) => {
    const r = await pAxios.patch(`${API_URL}/me`, data);
    onRefreshClient?.(r.data);
  };
  const handleMarkNotif = async (id) => {
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    try { await pAxios.post(`${API_URL}/notifications/${id}/read`); } catch {}
  };

  const advisor = useMemo(() => {
    const firstQuote = quotes[0];
    if (firstQuote?.created_by_name) return { name: firstQuote.created_by_name, status: 'Répond en ~5 min' };
    return { name: 'Votre conseiller', status: 'Répond en ~5 min' };
  }, [quotes]);

  // Fidélité : 10 pts par euro facturé
  const loyalty = useMemo(() => {
    const totalPaid = invoices.filter(i => ['payée', 'payee'].includes(i.status)).reduce((s, i) => s + Number(i.amount_ttc || i.amount || 0), 0);
    const points = Math.floor(totalPaid / 10);
    return { points, next_reward: points >= 500 ? 1000 : points >= 200 ? 500 : 200 };
  }, [invoices]);

  const unreadNotifs = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="cpa-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{tokenStyle}</style>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw style={{ width: 26, height: 26, color: 'var(--emerald)', animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: 14, fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 14 }}>
            Chargement de votre espace…
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="cpa-root">
      <style>{tokenStyle}</style>
      <div className="cpa-shell">
        {/* Top bar */}
        <div className="cpa-topbar">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => setBurgerOpen(true)}
              className="cpa-burger-btn"
              aria-label="Ouvrir le menu"
              title="Menu"
            >
              <Menu style={{ width: 18, height: 18 }} />
            </button>
            <div className="cpa-topbar-logo">Global <em>Clean</em> Home</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setNotifOpen(true)} className="cpa-icon-btn">
              <Bell style={{ width: 16, height: 16 }} />
              {unreadNotifs > 0 && <span className="badge">{unreadNotifs}</span>}
            </button>
            <button onClick={fetchData} className="cpa-icon-btn" title="Rafraîchir">
              <RefreshCw style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* Vues */}
        {tab === 'accueil' && (
          <ViewAccueil client={client} quotes={quotes} invoices={invoices} interventions={interventions}
            loyalty={loyalty} onOpenQuote={setOpenQuote} onOpenInvoice={() => setTab('invoices')}
            onOpenIntv={setOpenIntv} onSelectTab={setTab} />
        )}
        {tab === 'quotes' && <ViewQuotes quotes={quotes} onOpen={setOpenQuote} />}
        {tab === 'invoices' && <ViewInvoices invoices={invoices} onOpen={() => {}} onPay={handlePay} />}
        {tab === 'interventions' && <ViewInterventions interventions={interventions} onOpen={setOpenIntv} onReview={setReviewIntv} onSelectTab={setTab} />}
        {tab === 'documents' && <ViewDocuments quotes={quotes} invoices={invoices} interventions={interventions} client={client} />}
        {tab === 'fidelite' && <ViewFidelite client={client} loyalty={loyalty} interventions={interventions} invoices={invoices} />}
        {tab === 'demande' && <ViewDemande client={client} onSubmit={handleDemande} />}
        {tab === 'conseiller' && <ViewConseiller messages={messages} advisor={advisor} onSend={handleSendMsg} />}
        {tab === 'profil' && <ViewProfil client={client} onSave={handleSaveProfile} onLogout={onLogout} onReplayTour={() => { try { localStorage.removeItem('cpa_onboarded'); } catch {} setShowOnboarding(true); }} />}
      </div>

      {/* Bottom nav */}
      <div className="cpa-nav">
        {[
          { k: 'accueil',       icon: Home,          label: 'Accueil' },
          { k: 'quotes',        icon: FileText,      label: 'Devis' },
          { k: 'invoices',      icon: CreditCard,    label: 'Factures' },
          { k: 'interventions', icon: Calendar,      label: 'Passages' },
          { k: 'conseiller',    icon: MessageSquare, label: 'Conseiller' },
          { k: 'profil',        icon: User,          label: 'Profil' },
        ].map(b => {
          const Icon = b.icon;
          const showUnread = b.k === 'conseiller' && messages.some(m => !m.read && m.from !== 'client');
          return (
            <button key={b.k} onClick={() => setTab(b.k)} className={`cpa-nav-btn ${tab === b.k ? 'active' : ''}`}>
              <Icon style={{ width: 18, height: 18 }} />
              <span>{b.label}</span>
              {showUnread && <div className="cpa-nav-dot" />}
            </button>
          );
        })}
      </div>

      {/* Quote modal plein écran */}
      {openQuote && (
        <BottomSheet onClose={() => setOpenQuote(null)}>
          <QuoteHeroFull
            quote={openQuote} advisor={advisor}
            onSign={() => setSignQuote(openQuote)}
            onRefuse={() => handleRefuse(openQuote)}
            onChat={() => { setOpenQuote(null); setTab('conseiller'); }}
            onDownload={() => handleDownloadQuote(openQuote)}
          />
        </BottomSheet>
      )}

      {signQuote && <SignatureSheet quote={signQuote} onClose={() => setSignQuote(null)} onConfirm={handleSign} />}
      {openIntv && <InterventionDetail intervention={openIntv} onClose={() => setOpenIntv(null)} />}
      {reviewIntv && <ReviewModal intervention={reviewIntv} onClose={() => setReviewIntv(null)} onSubmit={handleReview} />}
      {notifOpen && <NotificationsDrawer notifications={notifications} onClose={() => setNotifOpen(false)} onMarkRead={handleMarkNotif} />}
      <BurgerMenu
        open={burgerOpen}
        onClose={() => setBurgerOpen(false)}
        tab={tab}
        onSelectTab={setTab}
        client={client}
        onLogout={onLogout}
        hasUnreadMessages={messages.some(m => !m.read && m.from !== 'client')}
      />
    </div>
  );
}

/* ═══════════ EXPORT ═══════════ */
export default function ClientPortalAtelier() {
  const [client, setClient] = useState(null);
  const [checking, setChecking] = useState(true);
  const [magicError, setMagicError] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [initialMode, setInitialMode] = useState('login');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magic = params.get('token') || params.get('magic');
    const reset = params.get('reset');
    const action = params.get('action'); // ex: ?action=register pour ouvrir directement la création

    if (reset) {
      // Mode reset password — on saute la création de session
      setResetToken(reset);
      setChecking(false);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (action === 'register' || action === 'signup') {
      setInitialMode('register');
    } else if (action === 'forgot') {
      setInitialMode('forgot');
    }

    if (magic) {
      axios.post(`${API_URL}/auth/${magic}`, {}, { withCredentials: true })
        .then(r => {
          localStorage.setItem('portal_token', magic);
          pAxios.defaults.headers.common['X-Portal-Token'] = magic;
          setClient(r.data);
          setChecking(false);
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch(() => { setMagicError('Lien invalide ou expiré'); setChecking(false); });
      return;
    }

    const token = localStorage.getItem('portal_token');
    if (!token) { setChecking(false); return; }
    pAxios.get(`${API_URL}/me`)
      .then(r => { setClient(r.data); setChecking(false); })
      .catch(() => { localStorage.removeItem('portal_token'); setChecking(false); });
  }, []);

  const logout = () => {
    localStorage.removeItem('portal_token');
    setClient(null);
    setResetToken(null);
    setInitialMode('login');
  };

  if (checking) return (
    <div className="cpa-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{tokenStyle}</style>
    </div>
  );

  if (!client) return (
    <PortalLogin
      onAuth={setClient}
      magicError={magicError}
      initialMode={initialMode}
      initialResetToken={resetToken}
    />
  );
  return <Dashboard client={client} onLogout={logout} onRefreshClient={setClient} />;
}
