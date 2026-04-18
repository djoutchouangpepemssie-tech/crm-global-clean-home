import React, { useEffect, useState } from 'react';
import { PageHeader } from '../shared';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { Star, Send, RefreshCw, TrendingUp, Users, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const StarRating = ({ score }) => {
  const stars = Math.round(score || 0);
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} style={{ width: 13, height: 13, color: i <= stars ? '#f59e0b' : 'var(--border-strong)', fill: i <= stars ? '#f59e0b' : 'transparent' }} />
      ))}
    </div>
  );
};

const NPSGauge = ({ score }) => {
  const pct = (score + 100) / 200; // -100..100 → 0..1
  const angle = -90 + pct * 180; // -90..90 degrees on semicircle
  const r = 80;
  const cx = 100;
  const cy = 100;
  const rad = (angle * Math.PI) / 180;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);

  const npsColor = score < 0 ? '#c2410c' : score < 50 ? '#f59e0b' : '#047857';

  return (
    <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 260 }}>
      {/* Background arc */}
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--border-default)" strokeWidth="16" strokeLinecap="round" />
      {/* Red zone (-100 to 0) */}
      <path d="M 20 100 A 80 80 0 0 1 100 20" fill="none" stroke="rgba(194,65,12,0.3)" strokeWidth="16" strokeLinecap="round" />
      {/* Yellow zone (0 to 50) */}
      <path d="M 100 20 A 80 80 0 0 1 155 35" fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth="16" strokeLinecap="round" />
      {/* Green zone (50 to 100) */}
      <path d="M 155 35 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(4,120,87,0.3)" strokeWidth="16" strokeLinecap="round" />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={npsColor} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill={npsColor} />
      {/* Score labels */}
      <text x="16" y="115" fontSize="9" fill="#78716c">-100</text>
      <text x="90" y="17" fontSize="9" fill="#78716c">0</text>
      <text x="174" y="115" fontSize="9" fill="#78716c">100</text>
    </svg>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ color: '#78716c', fontSize: 11, marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#d97706', fontWeight: 700, fontSize: 15 }}>NPS: {payload[0].value}</p>
    </div>
  );
};

const SatisfactionDashboard = () => {
  const [stats, setStats] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [googleStats, setGoogleStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, surveysRes, googleRes] = await Promise.allSettled([
        axios.get(`${API_URL}/satisfaction/stats`, { withCredentials: true }),
        axios.get(`${API_URL}/satisfaction/surveys`, { withCredentials: true }),
        axios.get(`${API_URL}/satisfaction/google-review-stats`, { withCredentials: true }),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (surveysRes.status === 'fulfilled') setSurveys(Array.isArray(surveysRes.value.data) ? surveysRes.value.data : surveysRes.value.data?.surveys || []);
      if (googleRes.status === 'fulfilled') setGoogleStats(googleRes.value.data);
    } catch {
      toast.error('Erreur chargement satisfaction');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSend = async () => {
    setSending(true);
    try {
      const res = await axios.post(`${API_URL}/satisfaction/auto-send`, {}, { withCredentials: true });
      const count = res.data?.sent || res.data?.count || 0;
      toast.success(`✅ ${count} enquêtes envoyées automatiquement`);
    } catch {
      toast.error('Erreur envoi automatique');
    } finally {
      setSending(false);
    }
  };

  const nps = stats?.nps_score ?? 0;
  const npsColor = nps < 0 ? '#c2410c' : nps < 50 ? '#f59e0b' : '#047857';
  const promoters = stats?.promoters_pct ?? 0;
  const passives = stats?.passives_pct ?? 0;
  const detractors = stats?.detractors_pct ?? 0;
  const totalSurveys = stats?.total_surveys ?? 0;
  const responseRate = stats?.response_rate ?? 0;
  const trendData = stats?.monthly_trend || [];
  const intervenants = stats?.by_intervenant || [];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <RefreshCw style={{ width: 30, height: 30, color: '#047857', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="crm-p-mobile" style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div className="crm-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
            Satisfaction Client
          </h1>
          <p style={{ color: '#78716c', fontSize: 13, marginTop: 4 }}>NPS, CSAT et avis Google</p>
        </div>
        <button
          onClick={handleAutoSend}
          disabled={sending}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg,#047857,#047857)',
            border: 'none', color: '#fff', borderRadius: 10,
            padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
          }}
        >
          <Send style={{ width: 15, height: 15, animation: sending ? 'spin 1s linear infinite' : 'none' }} />
          Envoyer enquêtes auto
        </button>
      </div>

      {/* NPS + Stats row */}
      <div className="crm-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, marginBottom: 24 }}>
        {/* Big NPS */}
        <div className="bg-white border border-neutral-200 rounded-xl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Score NPS</p>
          <NPSGauge score={nps} />
          <p style={{ fontSize: 52, fontWeight: 900, color: npsColor, lineHeight: 1, marginTop: -10 }}>
            {nps > 0 ? '+' : ''}{nps}
          </p>
          <p style={{ fontSize: 12, color: '#78716c', marginTop: 6 }}>
            {nps < 0 ? '🔴 À améliorer' : nps < 50 ? '🟡 Correct' : '🟢 Excellent'}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
          {[
            { label: 'Promoteurs', value: `${promoters}%`, icon: ThumbsUp, color: '#047857', bg: 'rgba(4,120,87,0.1)' },
            { label: 'Passifs', value: `${passives}%`, icon: Minus, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { label: 'Détracteurs', value: `${detractors}%`, icon: ThumbsDown, color: '#c2410c', bg: 'rgba(194,65,12,0.1)' },
            { label: 'Total enquêtes', value: totalSurveys, icon: Users, color: '#047857', bg: 'rgba(4,120,87,0.1)' },
            { label: 'Taux réponse', value: `${responseRate}%`, icon: TrendingUp, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-neutral-200 rounded-xl p-5">
              <div style={{ width: 32, height: 32, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <s.icon style={{ width: 16, height: 16, color: s.color }} />
              </div>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="crm-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* NPS Trend */}
        <div className="bg-white border border-neutral-200 rounded-xl">
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 16 }}>Évolution NPS mensuel</h3>
          {trendData.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#78716c', fontSize: 13 }}>Pas de données disponibles</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid stroke="var(--border-default, rgba(0,0,0,0.06))" />
                <XAxis dataKey="month" tick={{ fill: '#78716c', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#78716c', fontSize: 11 }} axisLine={false} tickLine={false} domain={[-100, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="nps" stroke="#047857" strokeWidth={2.5} dot={{ fill: '#047857', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Per-intervenant */}
        <div className="bg-white border border-neutral-200 rounded-xl">
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 16 }}>NPS par Intervenant</h3>
          {intervenants.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#78716c', fontSize: 13 }}>Pas de données disponibles</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {intervenants.slice(0, 6).map((inter, i) => {
                const score = inter.nps_score || inter.avg_score || 0;
                const color = score < 0 ? '#c2410c' : score < 50 ? '#f59e0b' : '#047857';
                const pct = ((score + 100) / 200) * 100;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(4,120,87,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#d97706', flexShrink: 0 }}>
                      {(inter.name || inter.intervenant_name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{inter.name || inter.intervenant_name}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color }}>{score > 0 ? '+' : ''}{score}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border-default)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max(0, pct)}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
                      </div>
                      <span style={{ fontSize: 10, color: '#78716c' }}>{inter.survey_count || 0} enquêtes · ⭐ {(inter.avg_rating || 0).toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="crm-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        {/* Recent surveys */}
        <div className="bg-white border border-neutral-200 rounded-xl">
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 16 }}>Dernières enquêtes</h3>
          {surveys.length === 0 ? (
            <p style={{ color: '#78716c', fontSize: 13, textAlign: 'center', padding: 30 }}>Aucune enquête disponible</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {surveys.slice(0, 8).map((s, i) => (
                <div key={s.id || i} style={{ padding: '12px 14px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{s.client_name || 'Client anonyme'}</span>
                      {s.intervenant_name && <span style={{ fontSize: 11, color: '#78716c', marginLeft: 8 }}>• {s.intervenant_name}</span>}
                    </div>
                    <span style={{ fontSize: 11, color: '#78716c' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : ''}</span>
                  </div>
                  <StarRating score={s.rating || s.score} />
                  {s.comment && <p style={{ fontSize: 12, color: '#78716c', marginTop: 6, lineHeight: 1.5, fontStyle: 'italic' }}>"{s.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Google Review stats */}
        <div className="bg-white border border-neutral-200 rounded-xl">
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 16 }}>
            Avis Google
          </h3>
          {googleStats ? (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, padding: 14, background: 'rgba(4,120,87,0.08)', border: '1px solid rgba(4,120,87,0.15)', borderRadius: 10, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 800, color: '#047857' }}>{googleStats.reviews_left || 0}</p>
                  <p style={{ fontSize: 11, color: '#78716c' }}>Laissés</p>
                </div>
                <div style={{ flex: 1, padding: 14, background: 'rgba(4,120,87,0.08)', border: '1px solid rgba(4,120,87,0.15)', borderRadius: 10, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 800, color: '#d97706' }}>{googleStats.reviews_requested || 0}</p>
                  <p style={{ fontSize: 11, color: '#78716c' }}>Demandés</p>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#78716c' }}>Taux de conversion</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>
                    {googleStats.reviews_requested > 0
                      ? `${Math.round((googleStats.reviews_left / googleStats.reviews_requested) * 100)}%`
                      : '—'}
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--border-default)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 6,
                    background: 'linear-gradient(90deg,#047857,#059669)',
                    width: googleStats.reviews_requested > 0
                      ? `${(googleStats.reviews_left / googleStats.reviews_requested) * 100}%`
                      : '0%',
                    transition: 'width 0.5s'
                  }} />
                </div>
              </div>

              {googleStats.avg_rating && (
                <div style={{ padding: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Star style={{ width: 22, height: 22, color: '#f59e0b', fill: '#f59e0b' }} />
                    <div>
                      <p style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', margin: 0 }}>{googleStats.avg_rating.toFixed(1)}</p>
                      <p style={{ fontSize: 11, color: '#78716c', margin: 0 }}>Note moyenne Google</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: '#78716c', fontSize: 13, textAlign: 'center', padding: 30 }}>Données non disponibles</p>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SatisfactionDashboard;
