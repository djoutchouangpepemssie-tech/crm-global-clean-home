// SatisfactionEcho.jsx — « L'écho ».
// Identité : ondes concentriques + bulles de commentaires flottantes. Le score
// NPS central vibre comme l'écho d'une voix. Palette émeraude + rose pastel
// pour la chaleur humaine.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Star, Send, RefreshCw, TrendingUp, Users, ThumbsUp, ThumbsDown,
  Minus, MessageCircle, Award,
} from 'lucide-react';
import api from '../../lib/api';

/* ─────────────────── TOKENS ─────────────────── */
const tokenStyle = `
  .ech-root {
    --bg: oklch(0.965 0.012 80);
    --surface: oklch(0.985 0.008 85);
    --surface-2: oklch(0.945 0.014 78);
    --ink: oklch(0.165 0.012 60);
    --ink-2: oklch(0.32 0.012 60);
    --ink-3: oklch(0.52 0.010 60);
    --ink-4: oklch(0.72 0.008 70);
    --line: oklch(0.85 0.012 75);
    --line-2: oklch(0.92 0.010 78);
    --emerald: oklch(0.52 0.13 165);
    --emerald-deep: oklch(0.38 0.14 160);
    --emerald-soft: oklch(0.93 0.05 165);
    --warm: oklch(0.62 0.14 45);
    --warm-soft: oklch(0.94 0.05 45);
    --gold: oklch(0.72 0.13 85);
    --gold-soft: oklch(0.94 0.06 85);
    --rose-soft: oklch(0.94 0.04 30);
    --danger: oklch(0.55 0.18 25);
  }
  .ech-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .ech-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .ech-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .ech-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .ech-italic  { font-style: italic; color: var(--emerald); font-weight: 400; }

  /* Onde concentrique animée */
  @keyframes pulse-echo {
    0%   { transform: scale(0.8); opacity: 0.6; }
    100% { transform: scale(1.8); opacity: 0; }
  }
  .ech-wave {
    position: absolute; inset: 0; border-radius: 999px;
    border: 1.5px solid var(--emerald);
    animation: pulse-echo 3.2s ease-out infinite;
    pointer-events: none;
  }
  .ech-wave.delay1 { animation-delay: 1s; }
  .ech-wave.delay2 { animation-delay: 2s; }

  /* Bulle commentaire */
  .ech-bubble {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 18px 18px 18px 4px;
    padding: 16px 18px;
    position: relative; transition: transform .2s;
  }
  .ech-bubble:hover { transform: translateY(-2px); }
  .ech-bubble.promoter { border-color: var(--emerald); background: var(--emerald-soft); }
  .ech-bubble.detractor { border-color: var(--danger); background: oklch(0.96 0.03 25); }
  .ech-bubble.passive { border-color: var(--gold); background: var(--gold-soft); }

  /* Carte répartition */
  .ech-distrib-bar {
    height: 14px; border-radius: 7px; overflow: hidden;
    display: flex; background: var(--surface-2);
    border: 1px solid var(--line);
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .ech-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .ech-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .ech-header-title { font-size: 36px !important; }
    .ech-body { padding: 0 20px 40px !important; }
    .ech-main-grid { grid-template-columns: 1fr !important; }
    .ech-bubbles { grid-template-columns: 1fr !important; }
  }
`;

const npsTone = (n) => n < 0 ? 'var(--danger)' : n < 50 ? 'var(--gold)' : 'var(--emerald)';
const npsLabel = (n) => n < 0 ? 'À travailler' : n < 50 ? 'Correct' : n < 70 ? 'Bon' : 'Excellent';

function classifySurvey(s) {
  const score = s.nps_score ?? s.score ?? s.rating ?? 0;
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
}

/* Stars */
function Stars({ n }) {
  const stars = Math.round(n || 0);
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} style={{
          width: 12, height: 12,
          color: i <= stars ? 'var(--gold)' : 'var(--line)',
          fill: i <= stars ? 'var(--gold)' : 'transparent',
        }} />
      ))}
    </div>
  );
}

/* ═════════════════════ MAIN ═════════════════════ */
export default function SatisfactionEcho() {
  const [stats, setStats] = useState({});
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, sv] = await Promise.allSettled([
        api.get('/satisfaction/stats'),
        api.get('/satisfaction/surveys'),
      ]);
      if (s.status === 'fulfilled') setStats(s.value.data || {});
      if (sv.status === 'fulfilled') {
        const d = sv.value.data;
        setSurveys(Array.isArray(d) ? d : (d?.surveys || []));
      }
    } catch {
      showToast('Erreur chargement');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const sendAuto = async () => {
    setSending(true);
    try {
      const r = await api.post('/satisfaction/auto-send', {});
      const n = r.data?.sent || r.data?.count || 0;
      showToast(`✓ ${n} enquête${n > 1 ? 's' : ''} envoyée${n > 1 ? 's' : ''}`);
    } catch { showToast('Échec envoi'); }
    setSending(false);
  };

  const nps = stats?.nps_score ?? 0;
  const promoters = stats?.promoters_pct ?? 0;
  const passives = stats?.passives_pct ?? 0;
  const detractors = stats?.detractors_pct ?? 0;
  const totalSurveys = stats?.total_surveys ?? 0;
  const responseRate = stats?.response_rate ?? 0;
  const intervenants = stats?.by_intervenant ?? [];

  /* Bulles : 6 derniers commentaires (avec texte) */
  const bubbles = useMemo(() => {
    return surveys
      .filter(s => (s.comment || '').trim().length > 0)
      .slice(0, 6);
  }, [surveys]);

  return (
    <div className="ech-root">
      <style>{tokenStyle}</style>

      {/* ═══════════ HEADER ═══════════ */}
      <div className="ech-header ech-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="ech-label" style={{ marginBottom: 12 }}>Satisfaction · Résonance</div>
          <h1 className="ech-display ech-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            L'<em className="ech-italic">écho</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {totalSurveys} voix entendues · {responseRate}% de réponses · score NPS de {nps > 0 ? '+' : ''}{nps}
          </div>
        </div>

        <button
          onClick={sendAuto}
          disabled={sending}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999,
            border: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            letterSpacing: '0.06em', textTransform: 'uppercase', cursor: sending ? 'wait' : 'pointer',
            opacity: sending ? 0.6 : 1,
          }}
        >
          {sending ? <RefreshCw style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Send style={{ width: 12, height: 12 }} />}
          Envoyer les enquêtes
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </button>
      </div>

      {/* ═══════════ NPS CENTRAL + RÉPARTITION ═══════════ */}
      <div className="ech-body ech-fade" style={{ padding: '0 48px 24px' }}>
        <div className="ech-main-grid" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18 }}>

          {/* Score NPS résonnant */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18,
            padding: 32, position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 300,
          }}>
            <div className="ech-label" style={{ alignSelf: 'flex-start', marginBottom: 18 }}>Score NPS</div>

            {/* Ondes concentriques */}
            <div style={{ position: 'relative', width: 180, height: 180, marginBottom: 10 }}>
              <div className="ech-wave" />
              <div className="ech-wave delay1" />
              <div className="ech-wave delay2" />
              <div style={{
                position: 'absolute', inset: 15, borderRadius: 999,
                background: `color-mix(in oklch, ${npsTone(nps)} 10%, var(--surface))`,
                border: `2px solid ${npsTone(nps)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column',
              }}>
                <div className="ech-display" style={{ fontSize: 64, fontWeight: 500, lineHeight: 1, color: npsTone(nps) }}>
                  {nps > 0 ? '+' : ''}{nps}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 14, fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 18,
              color: npsTone(nps),
            }}>
              {npsLabel(nps)}
            </div>
            <div className="ech-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', marginTop: 4 }}>
              {totalSurveys} enquêtes analysées
            </div>
          </div>

          {/* Répartition + 4 KPIs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
              <div className="ech-label" style={{ marginBottom: 4 }}>Répartition des voix</div>
              <h3 className="ech-display" style={{ fontSize: 20, fontWeight: 400, margin: '0 0 16px' }}>
                Promoteurs vs <em style={{ color: 'var(--emerald)' }}>détracteurs</em>
              </h3>
              <div className="ech-distrib-bar">
                <div style={{ width: `${promoters}%`, background: 'var(--emerald)' }} />
                <div style={{ width: `${passives}%`, background: 'var(--gold)' }} />
                <div style={{ width: `${detractors}%`, background: 'var(--danger)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 14, flexWrap: 'wrap' }}>
                <LegendItem color="var(--emerald)" label="Promoteurs" pct={promoters} />
                <LegendItem color="var(--gold)" label="Passifs" pct={passives} />
                <LegendItem color="var(--danger)" label="Détracteurs" pct={detractors} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <MiniCard label="Total enquêtes" value={totalSurveys} icon={Users} tone="var(--ink)" />
              <MiniCard label="Taux de réponse" value={`${responseRate}%`} icon={TrendingUp} tone="var(--emerald)" />
              <MiniCard label="Commentaires" value={bubbles.length} icon={MessageCircle} tone="var(--gold)" />
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════ BULLES DE COMMENTAIRES ═══════════ */}
      <div className="ech-body ech-fade" style={{ padding: '0 48px 24px' }}>
        <div className="ech-label" style={{ marginBottom: 8 }}>Voix du terrain</div>
        <h3 className="ech-display" style={{ fontSize: 26, fontWeight: 400, margin: '0 0 18px', color: 'var(--ink)' }}>
          Ce qu'ils <em style={{ color: 'var(--emerald)' }}>disent</em>
        </h3>

        {bubbles.length === 0 ? (
          <div style={{
            padding: 60, textAlign: 'center', fontStyle: 'italic',
            background: 'var(--surface)', border: '1px dashed var(--line)',
            borderRadius: 14, color: 'var(--ink-3)', fontFamily: 'Fraunces, serif',
          }}>
            Pas encore de commentaire reçu. L'écho se fait attendre…
          </div>
        ) : (
          <div className="ech-bubbles" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {bubbles.map((s, i) => {
              const type = classifySurvey(s);
              const score = s.nps_score ?? s.score ?? s.rating ?? 0;
              return (
                <div key={i} className={`ech-bubble ${type}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Stars n={Math.round(score / 2)} />
                    <span className="ech-mono" style={{
                      fontSize: 10, letterSpacing: '0.08em',
                      color: type === 'promoter' ? 'var(--emerald-deep)' : type === 'detractor' ? 'var(--danger)' : 'var(--ink-3)',
                      textTransform: 'uppercase', fontWeight: 600,
                    }}>
                      {type === 'promoter' ? 'Promoteur' : type === 'detractor' ? 'Détracteur' : 'Passif'}
                    </span>
                  </div>
                  <p style={{
                    fontFamily: 'Fraunces, serif', fontSize: 15, fontStyle: 'italic',
                    lineHeight: 1.5, color: 'var(--ink-2)', margin: 0,
                  }}>
                    « {(s.comment || '').slice(0, 180)}{(s.comment || '').length > 180 ? '…' : ''} »
                  </p>
                  <div className="ech-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 10, letterSpacing: '0.06em' }}>
                    — {s.client_name || s.lead_name || 'Anonyme'}
                    {s.created_at && <> · {new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════ ÉCHO PAR INTERVENANT ═══════════ */}
      {intervenants.length > 0 && (
        <div className="ech-body ech-fade" style={{ padding: '0 48px 40px' }}>
          <div className="ech-label" style={{ marginBottom: 8 }}>Par intervenant</div>
          <h3 className="ech-display" style={{ fontSize: 22, fontWeight: 400, margin: '0 0 16px', color: 'var(--ink)' }}>
            L'<em style={{ color: 'var(--emerald)' }}>écho</em> de chaque voix
          </h3>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {intervenants.slice(0, 10).map((inter, i) => {
              const score = inter.nps_score || inter.avg_score || 0;
              const pct = ((score + 100) / 200) * 100;
              const tone = npsTone(score);
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr 180px 80px',
                  gap: 14, alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: i < intervenants.length - 1 ? '1px solid var(--line-2)' : 0,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: `color-mix(in oklch, ${tone} 15%, var(--surface))`,
                    border: `1px solid ${tone}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Fraunces, serif', fontSize: 14, color: tone, fontWeight: 500,
                  }}>
                    {(inter.name || inter.intervenant_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
                      {inter.name || inter.intervenant_name || 'Intervenant'}
                    </div>
                    <div className="ech-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2, letterSpacing: '0.06em' }}>
                      {inter.total || inter.count || 0} enquête{(inter.total || inter.count || 0) > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: tone, transition: 'width .4s' }} />
                  </div>
                  <div className="ech-display" style={{ fontSize: 18, fontWeight: 500, color: tone, textAlign: 'right' }}>
                    {score > 0 ? '+' : ''}{score}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <div style={{
          position: 'fixed', top: 16, right: 16,
          padding: '8px 14px', borderRadius: 999,
          background: 'var(--surface)', border: '1px solid var(--line)',
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)',
        }}>
          Capture de l'écho…
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          padding: '12px 18px', borderRadius: 10,
          background: 'var(--ink)', color: 'var(--bg)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.2)', zIndex: 51,
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label, pct }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
      <span className="ech-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
        {pct}%
      </span>
    </div>
  );
}

function MiniCard({ label, value, icon: Icon, tone }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: `color-mix(in oklch, ${tone} 12%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: 12, height: 12, color: tone }} />
        </div>
        <span className="ech-label">{label}</span>
      </div>
      <div className="ech-display" style={{ fontSize: 26, fontWeight: 500, color: 'var(--ink)', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
