import React from 'react';

const LeadScoreBadge = ({ score }) => {
  const s = score || 0;

  const getConfig = (score) => {
    if (score >= 80) return {
      color: '#f43f5e',
      bg: 'rgba(244,63,94,0.12)',
      border: 'rgba(244,63,94,0.25)',
      label: 'Très chaud',
      emoji: '🔥',
      glow: '0 0 8px rgba(244,63,94,0.3)',
    };
    if (score >= 65) return {
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.25)',
      label: 'Chaud',
      emoji: '♨️',
      glow: '0 0 8px rgba(245,158,11,0.3)',
    };
    if (score >= 50) return {
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.12)',
      border: 'rgba(167,139,250,0.25)',
      label: 'Tiède',
      emoji: '🌡️',
      glow: 'none',
    };
    if (score >= 35) return {
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.12)',
      border: 'rgba(96,165,250,0.25)',
      label: 'Froid',
      emoji: '❄️',
      glow: 'none',
    };
    return {
      color: '#94a3b8',
      bg: 'rgba(148,163,184,0.12)',
      border: 'rgba(148,163,184,0.2)',
      label: 'Très froid',
      emoji: '🧊',
      glow: 'none',
    };
  };

  const cfg = getConfig(s);

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: cfg.glow,
      }}
      title={`Score: ${s}/100 - ${cfg.label}`}>
      <span className="text-[10px]">{cfg.emoji}</span>
      <span>{s}</span>
      <span className="text-[9px] opacity-70 hidden sm:inline">/ 100</span>
    </div>
  );
};

export default LeadScoreBadge;
