import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { PageHeader } from '../shared';
import axios from 'axios';
import { useDocumentsList, useDeleteDocument } from '../../hooks/api';
import api from '../../lib/api';
import {
  Upload, Image, FileText, X, Download, Eye, Grid, RefreshCw,
  Filter, ChevronLeft, ChevronRight, ArrowLeftRight, File, FileImage,
  FileSpreadsheet, FileArchive, Trash2, Check, AlertTriangle,
  Search, SlidersHorizontal, CloudUpload, Sparkles, FolderOpen,
  ZoomIn, MoreVertical, Copy, Share2, Info, Clock, HardDrive,
  CheckCircle2, XCircle, FilePlus2
} from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

/* ─── Constants ─── */
const TABS = [
  { id: 'all', label: 'Tous', icon: Grid, color: '#d97706' },
  { id: 'photo', label: 'Photos', icon: FileImage, color: '#f472b6' },
  { id: 'document', label: 'Documents', icon: FileText, color: '#38bdf8' },
  { id: 'before_after', label: 'Avant/Après', icon: ArrowLeftRight, color: '#047857' },
];

const ENTITY_TYPES = [
  { value: '', label: 'Toutes les entités', icon: '🏢' },
  { value: 'lead', label: 'Lead', icon: '🎯' },
  { value: 'intervention', label: 'Intervention', icon: '🔧' },
  { value: 'quote', label: 'Devis', icon: '📋' },
  { value: 'invoice', label: 'Facture', icon: '💰' },
];

const FILE_TYPE_CONFIG = {
  pdf: { icon: FileText, color: '#c2410c', bg: 'rgba(194,65,12,0.12)', label: 'PDF' },
  doc: { icon: FileText, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'DOC' },
  docx: { icon: FileText, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'DOCX' },
  xls: { icon: FileSpreadsheet, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'XLS' },
  xlsx: { icon: FileSpreadsheet, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'XLSX' },
  zip: { icon: FileArchive, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'ZIP' },
  rar: { icon: FileArchive, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'RAR' },
  default: { icon: File, color: '#78716c', bg: 'rgba(100,116,139,0.12)', label: 'FILE' },
};

const isImage = (file) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.filename || file.name || '');
const isBeforeAfter = (file) => file.type === 'before_after' || file.doc_type === 'before_after';
const getFileExt = (name) => (name || '').split('.').pop()?.toLowerCase() || '';
const getFileTypeConfig = (name) => FILE_TYPE_CONFIG[getFileExt(name)] || FILE_TYPE_CONFIG.default;
const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

/* ─── Keyframes / Styles ─── */
const STYLES = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(30px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes slideInDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes modalSlideUp {
    from { opacity: 0; transform: translateY(40px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(4,120,87,0.15); }
    50% { box-shadow: 0 0 40px rgba(4,120,87,0.35), 0 0 80px rgba(4,120,87,0.15); }
  }
  @keyframes dropzone-glow {
    0%, 100% { border-color: rgba(4,120,87,0.5); box-shadow: inset 0 0 30px rgba(4,120,87,0.08); }
    50% { border-color: rgba(4,120,87,0.9); box-shadow: inset 0 0 60px rgba(4,120,87,0.15), 0 0 30px rgba(4,120,87,0.2); }
  }
  @keyframes progress-stripe {
    0% { background-position: 0 0; }
    100% { background-position: 40px 0; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes blob {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(10px, -15px) scale(1.05); }
    66% { transform: translate(-10px, 10px) scale(0.95); }
  }
  @keyframes checkmark {
    0% { transform: scale(0) rotate(-45deg); opacity: 0; }
    50% { transform: scale(1.2) rotate(-45deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes tab-indicator {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }
  
  .doc-card:hover .doc-card-overlay { opacity: 1 !important; }
  .doc-card:hover .doc-card-thumb img { transform: scale(1.08); }
  .doc-card:hover { transform: translateY(-4px) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(4,120,87,0.2) !important; }
  
  .filter-tab:hover { background: rgba(255,255,255,0.06) !important; }
  .filter-tab.active { background: rgba(4,120,87,0.15) !important; }
  
  .action-btn { transition: all 0.2s cubic-bezier(0.4,0,0.2,1) !important; }
  .action-btn:hover { transform: translateY(-1px) scale(1.05) !important; }
  .action-btn:active { transform: translateY(0) scale(0.97) !important; }
  
  .premium-input:focus { border-color: rgba(4,120,87,0.5) !important; box-shadow: 0 0 0 3px rgba(4,120,87,0.1) !important; }
  
  .upload-zone:hover { border-color: rgba(4,120,87,0.3) !important; background: rgba(4,120,87,0.03) !important; }
  
  @media (max-width: 640px) {
    .docs-header { flex-direction: column !important; align-items: flex-start !important; }
    .docs-header-actions { width: 100% !important; }
    .docs-filters { flex-direction: column !important; }
    .docs-tabs { width: 100% !important; overflow-x: auto !important; }
    .docs-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important; }
    .ba-modal-grid { grid-template-columns: 1fr !important; }
  }
`;

/* ─── Skeleton Component ─── */
const Skeleton = ({ width, height, borderRadius = 8, style = {} }) => (
  <div style={{
    width, height, borderRadius,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.8s ease-in-out infinite',
    ...style
  }} />
);

const CardSkeleton = ({ index }) => (
  <div style={{
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    animation: `slideInUp 0.5s ease-out ${index * 0.08}s both`,
  }}>
    <Skeleton width="100%" height={160} borderRadius={0} />
    <div style={{ padding: '14px 16px' }}>
      <Skeleton width="75%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="50%" height={10} style={{ marginBottom: 14 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width="100%" height={32} borderRadius={8} />
        <Skeleton width="100%" height={32} borderRadius={8} />
        <Skeleton width={40} height={32} borderRadius={8} />
      </div>
    </div>
  </div>
);

/* ─── Upload Progress Bar ─── */
const UploadProgressBar = ({ progress, fileName }) => (
  <div style={{
    background: 'rgba(4,120,87,0.06)',
    border: '1px solid rgba(4,120,87,0.15)',
    borderRadius: 12,
    padding: '12px 16px',
    animation: 'slideInUp 0.3s ease-out',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CloudUpload style={{ width: 14, height: 14, color: '#d97706' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName}
        </span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>{Math.round(progress)}%</span>
    </div>
    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        borderRadius: 4,
        background: 'linear-gradient(90deg, #047857, #d97706, #047857)',
        backgroundSize: '40px 100%',
        animation: progress < 100 ? 'progress-stripe 0.8s linear infinite' : 'none',
        transition: 'width 0.3s ease-out',
      }} />
    </div>
  </div>
);

/* ─── Empty State ─── */
const EmptyState = ({ activeTab, onUpload }) => {
  const configs = {
    all: { title: 'Aucun document', subtitle: 'Commencez par uploader votre premier fichier', emoji: '📁' },
    photo: { title: 'Aucune photo', subtitle: 'Uploadez des images pour les visualiser ici', emoji: '📸' },
    document: { title: 'Aucun document', subtitle: 'Ajoutez des PDF, DOC ou autres fichiers', emoji: '📄' },
    before_after: { title: 'Aucun avant/après', subtitle: 'Créez votre première comparaison', emoji: '🔄' },
  };
  const config = configs[activeTab] || configs.all;

  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px 80px',
      animation: 'fadeInScale 0.5s ease-out',
    }}>
      {/* Floating illustration */}
      <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 28px' }}>
        {/* Blobs background */}
        <div style={{
          position: 'absolute', inset: -20,
          background: 'radial-gradient(circle at 30% 40%, rgba(4,120,87,0.12) 0%, transparent 60%), radial-gradient(circle at 70% 60%, rgba(244,114,182,0.08) 0%, transparent 60%)',
          borderRadius: '50%',
          animation: 'blob 8s ease-in-out infinite',
        }} />
        {/* Main icon */}
        <div style={{
          width: 100, height: 100,
          margin: '20px auto 0',
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(4,120,87,0.15), rgba(4,120,87,0.05))',
          border: '1px solid rgba(4,120,87,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'float 4s ease-in-out infinite',
          backdropFilter: 'blur(10px)',
        }}>
          <span style={{ fontSize: 42 }}>{config.emoji}</span>
        </div>
        {/* Sparkle decorations */}
        <Sparkles style={{
          position: 'absolute', top: 10, right: 15,
          width: 18, height: 18, color: '#d97706', opacity: 0.6,
          animation: 'float 3s ease-in-out infinite 0.5s',
        }} />
        <Sparkles style={{
          position: 'absolute', bottom: 25, left: 10,
          width: 12, height: 12, color: '#f472b6', opacity: 0.4,
          animation: 'float 3.5s ease-in-out infinite 1s',
        }} />
      </div>

      <h3 style={{, fontSize: 20, fontWeight: 800,
        color: '#e2e8f0', margin: '0 0 8px',
        background: 'linear-gradient(135deg, #e2e8f0, #78716c)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {config.title}
      </h3>
      <p style={{ color: '#78716c', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
        {config.subtitle}
      </p>
      <button
        onClick={onUpload}
        className="action-btn"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg, #047857, #047857)',
          border: 'none', color: '#fff', borderRadius: 12,
          padding: '12px 28px', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
        }}
      >
        <Upload style={{ width: 16, height: 16 }} />
        Uploader un fichier
      </button>
    </div>
  );
};

/* ─── Delete Confirmation ─── */
const DeleteConfirmation = ({ docName, onConfirm, onCancel }) => (
  <div
    onClick={onCancel}
    style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 3000, padding: 20,
      animation: 'fadeIn 0.2s ease-out',
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        width: '100%', maxWidth: 380,
        background: 'linear-gradient(180deg, var(--bg-card), var(--bg-app))',
        borderRadius: 20, padding: 28,
        border: '1px solid rgba(194,65,12,0.2)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        animation: 'modalSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'rgba(194,65,12,0.1)',
        border: '1px solid rgba(194,65,12,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <AlertTriangle style={{ width: 26, height: 26, color: '#c2410c' }} />
      </div>
      <h3 style={{, fontSize: 17, fontWeight: 800,
        color: '#f1f5f9', margin: '0 0 8px', textAlign: 'center',
      }}>
        Supprimer ce document ?
      </h3>
      <p style={{
        fontSize: 13, color: '#78716c', textAlign: 'center', margin: '0 0 24px',
        lineHeight: 1.5,
      }}>
        <strong style={{ color: '#78716c' }}>{docName}</strong> sera supprimé définitivement. Cette action est irréversible.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onCancel}
          className="action-btn"
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#78716c', borderRadius: 12,
            padding: '11px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className="action-btn"
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #c2410c, #c2410c)',
            border: 'none', color: '#fff', borderRadius: 12,
            padding: '11px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(194,65,12,0.3)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Trash2 style={{ width: 14, height: 14 }} /> Supprimer
          </span>
        </button>
      </div>
    </div>
  </div>
);

/* ─── Premium File Card ─── */
const PremiumFileCard = ({ doc, index, onPreview, onBeforeAfter, onDownload, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const img = isImage(doc);
  const ba = isBeforeAfter(doc);
  const url = doc.url || doc.file_url || doc.thumbnail_url;
  const name = doc.filename || doc.name || 'Document';
  const fileConfig = !img && !ba ? getFileTypeConfig(name) : null;
  const FileIcon = fileConfig?.icon || File;

  return (
    <div
      className="doc-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        overflow: 'hidden',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        animation: `slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.06}s both`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* Thumbnail area */}
      <div
        className="doc-card-thumb"
        style={{
          height: 160, position: 'relative', overflow: 'hidden',
          background: img ? '#0a0a0f' : 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.04))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={() => img ? onPreview({ url, name }) : ba ? onBeforeAfter(doc) : onDownload(doc)}
      >
        {img && url ? (
          <img
            src={url} alt={name}
            loading="lazy"
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        ) : ba ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(4,120,87,0.15), rgba(4,120,87,0.05))',
              border: '1px solid rgba(4,120,87,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ArrowLeftRight style={{ width: 26, height: 26, color: '#047857' }} />
            </div>
            <span style={{ fontSize: 11, color: '#78716c', fontWeight: 600 }}>Avant / Après</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: fileConfig?.bg || 'rgba(100,116,139,0.12)',
              border: `1px solid ${fileConfig?.color || '#78716c'}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileIcon style={{ width: 26, height: 26, color: fileConfig?.color || '#78716c' }} />
            </div>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              color: fileConfig?.color || '#78716c', textTransform: 'uppercase',
            }}>
              {fileConfig?.label || getFileExt(name).toUpperCase()}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="doc-card-overlay"
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.7))',
            opacity: 0, transition: 'opacity 0.3s ease',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {img && (
              <button
                className="action-btn"
                onClick={(e) => { e.stopPropagation(); onPreview({ url, name }); }}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ZoomIn style={{ width: 16, height: 16 }} />
              </button>
            )}
            <button
              className="action-btn"
              onClick={(e) => { e.stopPropagation(); onDownload(doc); }}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Download style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* Type badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          display: 'flex', gap: 6, animation: 'slideInLeft 0.4s ease-out',
        }}>
          <span style={{
            background: ba ? 'rgba(4,120,87,0.85)' : img ? 'rgba(244,114,182,0.85)' : 'rgba(56,189,248,0.85)',
            backdropFilter: 'blur(8px)',
            color: '#fff', borderRadius: 8, padding: '3px 10px',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.03em',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            {ba ? '↔ Avant/Après' : img ? '🖼 Photo' : `📄 ${fileConfig?.label || 'Doc'}`}
          </span>
        </div>

        {/* File size badge */}
        {doc.size && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            color: '#78716c', borderRadius: 6, padding: '2px 8px',
            fontSize: 9, fontWeight: 700,
          }}>
            {formatFileSize(doc.size)}
          </span>
        )}
      </div>

      {/* Info section */}
      <div style={{ padding: '14px 16px 16px' }}>
        <p style={{
          fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={name}>
          {name}
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
        }}>
          {doc.entity_type && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#047857',
              background: 'rgba(4,120,87,0.1)', borderRadius: 5,
              padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {doc.entity_type}
            </span>
          )}
          {doc.created_at && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#78716c' }}>
              <Clock style={{ width: 10, height: 10 }} />
              {new Date(doc.created_at).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {img && (
            <button
              className="action-btn"
              onClick={() => onPreview({ url, name })}
              style={{
                flex: 1, height: 34, borderRadius: 9,
                background: 'rgba(4,120,87,0.08)', border: '1px solid rgba(4,120,87,0.15)',
                color: '#d97706', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                fontSize: 11, fontWeight: 600,
              }}
            >
              <Eye style={{ width: 13, height: 13 }} />
              <span>Voir</span>
            </button>
          )}
          {ba && (
            <button
              className="action-btn"
              onClick={() => onBeforeAfter(doc)}
              style={{
                flex: 1, height: 34, borderRadius: 9,
                background: 'rgba(4,120,87,0.08)', border: '1px solid rgba(4,120,87,0.15)',
                color: '#047857', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                fontSize: 11, fontWeight: 600,
              }}
            >
              <ArrowLeftRight style={{ width: 13, height: 13 }} />
              <span>Comparer</span>
            </button>
          )}
          <button
            className="action-btn"
            onClick={() => onDownload(doc)}
            style={{
              flex: 1, height: 34, borderRadius: 9,
              background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)',
              color: '#38bdf8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              fontSize: 11, fontWeight: 600,
            }}
          >
            <Download style={{ width: 13, height: 13 }} />
          </button>
          <button
            className="action-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(doc.id, name); }}
            style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(194,65,12,0.06)', border: '1px solid rgba(194,65,12,0.12)',
              color: '#c2410c', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Preview Modal ─── */
const PreviewModal = ({ preview, onClose }) => {
  if (!preview) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 20,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', maxWidth: '92vw', maxHeight: '92vh',
          animation: 'fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="action-btn"
          style={{
            position: 'absolute', top: -48, right: 0,
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X style={{ width: 18, height: 18 }} />
        </button>
        <img
          src={preview.url} alt={preview.name}
          style={{
            maxWidth: '88vw', maxHeight: '82vh',
            objectFit: 'contain', borderRadius: 16,
            boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          }}
        />
        <div style={{
          textAlign: 'center', marginTop: 16,
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(10px)',
          borderRadius: 10, padding: '8px 20px',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          margin: '16px auto 0', width: 'fit-content',
        }}>
          <FileImage style={{ width: 14, height: 14, color: '#d97706' }} />
          <span style={{ color: '#78716c', fontSize: 13, fontWeight: 600 }}>{preview.name}</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Before/After Modal ─── */
const BeforeAfterModal = ({ data, onClose }) => {
  if (!data) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 20,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="ba-modal-grid"
        style={{
          width: '92vw', maxWidth: 950,
          background: 'var(--bg-app)',
          borderRadius: 24, padding: 32,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(4,120,87,0.15), rgba(4,120,87,0.05))',
              border: '1px solid rgba(4,120,87,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ArrowLeftRight style={{ width: 20, height: 20, color: '#047857' }} />
            </div>
            <div>
              <h3 style={{, color: '#f1f5f9', fontSize: 18, fontWeight: 800, margin: 0 }}>
                Comparaison Avant / Après
              </h3>
              <p style={{ fontSize: 12, color: '#78716c', margin: '2px 0 0' }}>
                {data.created_at ? new Date(data.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="action-btn"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#78716c', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="ba-modal-grid">
          {[
            { key: 'before_url', label: 'Avant', color: '#f59e0b', icon: '⬅' },
            { key: 'after_url', label: 'Après', color: '#047857', icon: '➡' },
          ].map(({ key, label, color, icon }, i) => {
            const imgUrl = data[key];
            return (
              <div key={key} style={{ animation: `slideInUp 0.4s ease-out ${i * 0.15}s both` }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                }}>
                  <span style={{
                    background: `${color}18`, color, borderRadius: 8,
                    padding: '4px 12px', fontSize: 11, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    border: `1px solid ${color}30`,
                  }}>
                    {icon} {label}
                  </span>
                </div>
                {imgUrl ? (
                  <img
                    src={imgUrl} alt={label}
                    style={{
                      width: '100%', borderRadius: 14, objectFit: 'cover',
                      maxHeight: 350,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  />
                ) : (
                  <div style={{
                    height: 220,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 8, color: '#78716c',
                  }}>
                    <Image style={{ width: 32, height: 32, opacity: 0.4 }} />
                    <span style={{ fontSize: 12 }}>Image non disponible</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─── Upload Before/After Modal ─── */
const UploadBeforeAfterModal = ({ onClose, onUpload, uploading }) => {
  const beforeRef = useRef();
  const afterRef = useRef();
  const [beforePreview, setBeforePreview] = useState(null);
  const [afterPreview, setAfterPreview] = useState(null);

  const handleFilePreview = (file, setter) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setter(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    const before = beforeRef.current?.files?.[0];
    const after = afterRef.current?.files?.[0];
    if (!before || !after) { toast.error('Sélectionnez les deux photos'); return; }
    onUpload(before, after);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 20,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 500,
          background: 'var(--bg-app)',
          borderRadius: 24, padding: 32,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(4,120,87,0.15), rgba(4,120,87,0.05))',
              border: '1px solid rgba(4,120,87,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ArrowLeftRight style={{ width: 20, height: 20, color: '#d97706' }} />
            </div>
            <h3 style={{, color: '#f1f5f9', fontSize: 17, fontWeight: 800, margin: 0 }}>
              Upload Avant / Après
            </h3>
          </div>
          <button onClick={onClose} className="action-btn" style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#78716c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* File inputs with previews */}
        {[
          { label: 'Photo Avant', ref: beforeRef, preview: beforePreview, setter: setBeforePreview, color: '#f59e0b', icon: '⬅' },
          { label: 'Photo Après', ref: afterRef, preview: afterPreview, setter: setAfterPreview, color: '#047857', icon: '➡' },
        ].map(({ label, ref, preview, setter, color, icon }, i) => (
          <div key={i} style={{ marginBottom: 18, animation: `slideInUp 0.4s ease-out ${i * 0.1}s both` }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 800, color: '#78716c',
              marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              <span style={{ color }}>{icon}</span> {label}
            </label>
            <div
              onClick={() => ref.current?.click()}
              style={{
                border: '2px dashed rgba(255,255,255,0.08)',
                borderRadius: 14, padding: preview ? 0 : 24,
                textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.2s',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.02)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}50`; e.currentTarget.style.background = `${color}08`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            >
              {preview ? (
                <img src={preview} alt={label} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
              ) : (
                <>
                  <CloudUpload style={{ width: 22, height: 22, color: '#78716c', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 12, color: '#78716c', margin: 0, fontWeight: 600 }}>Cliquez pour sélectionner</p>
                </>
              )}
            </div>
            <input
              ref={ref}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFilePreview(e.target.files?.[0], setter)}
            />
          </div>
        ))}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={onClose}
            className="action-btn"
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#78716c', borderRadius: 12,
              padding: '12px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="action-btn"
            style={{
              flex: 1,
              background: uploading ? 'rgba(4,120,87,0.3)' : 'linear-gradient(135deg, #047857, #047857)',
              border: 'none', color: '#fff', borderRadius: 12,
              padding: '12px 24px', fontSize: 13, fontWeight: 700,
              cursor: uploading ? 'not-allowed' : 'pointer',
              boxShadow: uploading ? 'none' : '0 4px 20px rgba(124,58,237,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {uploading ? (
              <><RefreshCw style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Upload...</>
            ) : (
              <><Upload style={{ width: 14, height: 14 }} /> Uploader</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   ██  MAIN COMPONENT
   ═══════════════════════════════════════════ */
const DocumentsManager = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [entityType, setEntityType] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [preview, setPreview] = useState(null);
  const [beforeAfterModal, setBeforeAfterModal] = useState(null);
  const [uploadBeforeAfter, setUploadBeforeAfter] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef();
  const dragCounter = useRef(0);

  // ── Vague 6 : React Query ────────────────────────────────────
  const docFilters = useMemo(() => ({
    entity_type: entityType || undefined,
    type: activeTab !== 'all' ? activeTab : undefined,
  }), [activeTab, entityType]);
  const { data: docs = [], isLoading: loading, refetch: fetchDocs } = useDocumentsList(docFilters);
  const deleteDocMut = useDeleteDocument();

  const uploadFile = async (file, type = 'document') => {
    const fileId = `${file.name}-${Date.now()}`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (entityType) formData.append('entity_type', entityType);

    setUploading(true);
    setUploadProgress(prev => ({ ...prev, [fileId]: { name: file.name, progress: 0 } }));

    try {
      await axios.post(`${API_URL}/documents/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          setUploadProgress(prev => ({ ...prev, [fileId]: { name: file.name, progress: pct } }));
        },
      });
      setUploadProgress(prev => ({ ...prev, [fileId]: { name: file.name, progress: 100 } }));
      toast.success(
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 style={{ width: 16, height: 16, color: '#047857' }} />
          <span><strong>{file.name}</strong> uploadé avec succès</span>
        </div>
      );
      setTimeout(() => {
        setUploadProgress(prev => { const n = { ...prev }; delete n[fileId]; return n; });
      }, 2000);
      fetchDocs();
    } catch {
      toast.error(`Erreur upload ${file.name}`);
      setUploadProgress(prev => { const n = { ...prev }; delete n[fileId]; return n; });
    } finally {
      setUploading(false);
    }
  };

  const uploadBeforeAfterPair = async (before, after) => {
    const formData = new FormData();
    formData.append('before', before);
    formData.append('after', after);
    setUploading(true);
    try {
      await axios.post(`${API_URL}/documents/before-after`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Photos avant/après uploadées');
      setUploadBeforeAfter(false);
      fetchDocs();
    } catch {
      toast.error('Erreur upload avant/après');
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(f => uploadFile(f, isImage(f) ? 'photo' : 'document'));
  }, [entityType]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => uploadFile(f, isImage(f) ? 'photo' : 'document'));
    e.target.value = '';
  };

  const handleDownload = async (doc) => {
    try {
      const url = doc.url || doc.file_url;
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.filename || doc.name || 'document';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Téléchargement lancé');
      }
    } catch {
      toast.error('Erreur téléchargement');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocMut.mutateAsync(id);
      setDeleteConfirm(null);
    } catch {}
  };

  // Filter docs by search
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase();
    return docs.filter(d => {
      const name = (d.filename || d.name || '').toLowerCase();
      const entity = (d.entity_type || '').toLowerCase();
      return name.includes(q) || entity.includes(q);
    });
  }, [docs, searchQuery]);

  const progressEntries = Object.entries(uploadProgress);

  return (
    <div className="crm-p-mobile" style={{ padding: '24px', maxWidth: 1440, margin: '0 auto', minHeight: '100vh' }}>
      <style>{STYLES}</style>

      {/* ── Header ── */}
      <div className="docs-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 16,
        animation: 'slideInDown 0.5s ease-out',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(4,120,87,0.2), rgba(4,120,87,0.05))',
              border: '1px solid rgba(4,120,87,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FolderOpen style={{ width: 22, height: 22, color: '#d97706' }} />
            </div>
            <div>
              <h1 style={{, fontSize: 26, fontWeight: 800,
                margin: 0,
                background: 'linear-gradient(135deg, #f1f5f9, #cbd5e1)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Documents
              </h1>
              <p style={{ color: '#78716c', fontSize: 13, margin: 0 }}>
                {docs.length} fichier{docs.length !== 1 ? 's' : ''} · Photos, documents, avant/après
              </p>
            </div>
          </div>
        </div>

        <div className="docs-header-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setUploadBeforeAfter(true)}
            className="action-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(4,120,87,0.08)',
              border: '1px solid rgba(4,120,87,0.2)',
              color: '#047857', borderRadius: 12,
              padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <ArrowLeftRight style={{ width: 15, height: 15 }} /> Avant/Après
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="action-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #047857, #047857)',
              border: 'none', color: '#fff', borderRadius: 12,
              padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(124,58,237,0.25)',
            }}
          >
            <Upload style={{ width: 15, height: 15 }} /> Upload
          </button>
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
        </div>
      </div>

      {/* ── Drop Zone ── */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={e => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="upload-zone"
        style={{
          border: `2px dashed ${dragging ? 'rgba(4,120,87,0.6)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 20, padding: dragging ? 40 : 32,
          textAlign: 'center', cursor: 'pointer',
          background: dragging
            ? 'radial-gradient(ellipse at center, rgba(4,120,87,0.08) 0%, rgba(4,120,87,0.02) 70%)'
            : 'rgba(255,255,255,0.01)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          marginBottom: 24, position: 'relative', overflow: 'hidden',
          animation: dragging ? 'dropzone-glow 2s ease-in-out infinite' : 'slideInUp 0.5s ease-out 0.1s both',
        }}
      >
        {/* Animated glow when dragging */}
        {dragging && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(4,120,87,0.1) 0%, transparent 70%)',
            animation: 'pulse-glow 1.5s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        {uploading && progressEntries.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, position: 'relative' }}>
            <RefreshCw style={{ width: 22, height: 22, color: '#047857', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#d97706', fontSize: 15, fontWeight: 700 }}>Upload en cours...</span>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 18, margin: '0 auto 16px',
              background: dragging
                ? 'linear-gradient(135deg, rgba(4,120,87,0.2), rgba(4,120,87,0.08))'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${dragging ? 'rgba(4,120,87,0.3)' : 'rgba(255,255,255,0.06)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s',
            }}>
              <CloudUpload style={{
                width: 26, height: 26,
                color: dragging ? '#d97706' : '#78716c',
                transition: 'all 0.3s',
                transform: dragging ? 'translateY(-3px)' : 'none',
              }} />
            </div>
            <p style={{
              color: dragging ? '#d97706' : '#78716c',
              fontSize: 15, fontWeight: 700, margin: '0 0 6px',
              transition: 'color 0.3s',
            }}>
              {dragging ? '✨ Relâchez pour uploader' : 'Glissez-déposez des fichiers ici'}
            </p>
            <p style={{ color: '#78716c', fontSize: 12, margin: 0 }}>
              ou <span style={{ color: '#d97706', fontWeight: 600 }}>cliquez pour parcourir</span> · JPG, PNG, PDF, DOC
            </p>
          </div>
        )}
      </div>

      {/* ── Upload Progress ── */}
      {progressEntries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {progressEntries.map(([id, { name, progress }]) => (
            <UploadProgressBar key={id} progress={progress} fileName={name} />
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="docs-filters" style={{
        display: 'flex', alignItems: 'center', gap: 14,
        marginBottom: 24, flexWrap: 'wrap',
        animation: 'slideInUp 0.5s ease-out 0.2s both',
      }}>
        {/* Tabs */}
        <div className="docs-tabs" style={{
          display: 'flex', gap: 4,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: 4,
        }}>
          {TABS.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`filter-tab ${isActive ? 'active' : ''}`}
                style={{
                  position: 'relative',
                  background: isActive ? `${tab.color}18` : 'transparent',
                  border: isActive ? `1px solid ${tab.color}30` : '1px solid transparent',
                  color: isActive ? tab.color : '#78716c',
                  borderRadius: 10, padding: '7px 16px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex', alignItems: 'center', gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                <TabIcon style={{ width: 13, height: 13 }} />
                {tab.label}
                {isActive && (
                  <div style={{
                    position: 'absolute', bottom: -1, left: '20%', right: '20%',
                    height: 2, borderRadius: 2,
                    background: tab.color,
                    animation: 'tab-indicator 0.3s ease-out',
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Entity type */}
        <select
          value={entityType}
          onChange={e => setEntityType(e.target.value)}
          className="premium-input"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '8px 14px',
            color: entityType ? '#f1f5f9' : '#78716c',
            fontSize: 13, fontWeight: 600,
            outline: 'none', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {ENTITY_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
          ))}
        </select>

        {/* Search */}
        <div style={{
          position: 'relative', flex: '1 1 200px', minWidth: 140, maxWidth: 280,
        }}>
          <Search style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            width: 14, height: 14, color: '#78716c', pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="premium-input"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '8px 14px 8px 34px',
              color: '#f1f5f9', fontSize: 13, fontWeight: 500,
              outline: 'none', transition: 'all 0.2s',
            }}
          />
        </div>

        {/* Count */}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: '5px 12px',
        }}>
          <HardDrive style={{ width: 12, height: 12, color: '#78716c' }} />
          <span style={{ fontSize: 12, color: '#78716c', fontWeight: 600 }}>
            {filteredDocs.length} fichier{filteredDocs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Refresh */}
        <button
          onClick={fetchDocs}
          className="action-btn"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#78716c', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="docs-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 18,
        }}>
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} index={i} />)}
        </div>
      ) : filteredDocs.length === 0 ? (
        <EmptyState activeTab={activeTab} onUpload={() => fileInputRef.current?.click()} />
      ) : (
        <div className="docs-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 18,
        }}>
          {filteredDocs.map((doc, i) => (
            <PremiumFileCard
              key={doc.id || i}
              doc={doc}
              index={i}
              onPreview={setPreview}
              onBeforeAfter={setBeforeAfterModal}
              onDownload={handleDownload}
              onDelete={(id, name) => setDeleteConfirm({ id, name })}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      <PreviewModal preview={preview} onClose={() => setPreview(null)} />
      <BeforeAfterModal data={beforeAfterModal} onClose={() => setBeforeAfterModal(null)} />

      {uploadBeforeAfter && (
        <UploadBeforeAfterModal
          onClose={() => setUploadBeforeAfter(false)}
          onUpload={uploadBeforeAfterPair}
          uploading={uploading}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmation
          docName={deleteConfirm.name}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default DocumentsManager;
