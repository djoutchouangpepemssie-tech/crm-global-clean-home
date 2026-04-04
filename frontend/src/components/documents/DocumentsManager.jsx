import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Upload, Image, FileText, X, Download, Eye, Grid, RefreshCw,
  Filter, ChevronLeft, ChevronRight, ArrowLeftRight
} from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'photo', label: 'Photos' },
  { id: 'document', label: 'Documents' },
  { id: 'before_after', label: 'Avant/Après' },
];

const ENTITY_TYPES = [
  { value: '', label: 'Toutes les entités' },
  { value: 'lead', label: 'Lead' },
  { value: 'intervention', label: 'Intervention' },
  { value: 'quote', label: 'Devis' },
  { value: 'invoice', label: 'Facture' },
];

const isImage = (file) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.filename || file.name || '');
const isBeforeAfter = (file) => file.type === 'before_after' || file.doc_type === 'before_after';

const DocumentsManager = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [entityType, setEntityType] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // { url, name }
  const [beforeAfterModal, setBeforeAfterModal] = useState(null); // { before, after }
  const [uploadBeforeAfter, setUploadBeforeAfter] = useState(false);
  const fileInputRef = useRef();
  const beforeRef = useRef();
  const afterRef = useRef();

  useEffect(() => { fetchDocs(); }, [activeTab, entityType]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityType) params.append('entity_type', entityType);
      if (activeTab !== 'all') params.append('type', activeTab);
      const res = await axios.get(`${API_URL}/documents?${params}`, { withCredentials: true });
      setDocs(Array.isArray(res.data) ? res.data : res.data.documents || []);
    } catch {
      toast.error('Erreur chargement documents');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file, type = 'document') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (entityType) formData.append('entity_type', entityType);
    setUploading(true);
    try {
      await axios.post(`${API_URL}/documents/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${file.name} uploadé avec succès`);
      fetchDocs();
    } catch {
      toast.error(`Erreur upload ${file.name}`);
    } finally {
      setUploading(false);
    }
  };

  const uploadBeforeAfterPair = async () => {
    const before = beforeRef.current?.files?.[0];
    const after = afterRef.current?.files?.[0];
    if (!before || !after) { toast.error('Sélectionnez les deux photos'); return; }
    const formData = new FormData();
    formData.append('before', before);
    formData.append('after', after);
    setUploading(true);
    try {
      await axios.post(`${API_URL}/documents/before-after`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
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
      }
    } catch {
      toast.error('Erreur téléchargement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    try {
      await axios.delete(`${API_URL}/documents/${id}`, { withCredentials: true });
      toast.success('Document supprimé');
      fetchDocs();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  const FileCard = ({ doc }) => {
    const img = isImage(doc);
    const ba = isBeforeAfter(doc);
    const url = doc.url || doc.file_url || doc.thumbnail_url;
    const name = doc.filename || doc.name || 'Document';

    return (
      <div
        style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer',
          position: 'relative'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; e.currentTarget.style.background = 'rgba(139,92,246,0.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
      >
        {/* Thumbnail */}
        <div
          style={{ height: 140, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}
          onClick={() => img ? setPreview({ url, name }) : ba ? setBeforeAfterModal(doc) : handleDownload(doc)}
        >
          {img && url ? (
            <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : ba ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
              <ArrowLeftRight style={{ width: 28, height: 28, color: '#8b5cf6' }} />
              <span style={{ fontSize: 11, color: '#64748b' }}>Avant / Après</span>
            </div>
          ) : (
            <FileText style={{ width: 36, height: 36, color: '#475569' }} />
          )}
          {/* Type badge */}
          <span style={{
            position: 'absolute', top: 8, left: 8,
            background: img ? 'rgba(139,92,246,0.8)' : 'rgba(6,182,212,0.8)',
            color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700
          }}>
            {ba ? 'Avant/Après' : img ? 'Photo' : 'Doc'}
          </span>
        </div>

        {/* Info */}
        <div style={{ padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>
            {name}
          </p>
          <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
            {doc.entity_type && <span style={{ color: '#64748b' }}>{doc.entity_type} · </span>}
            {doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR') : ''}
          </p>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {img && (
              <button onClick={() => setPreview({ url, name })} style={{ flex: 1, background: 'rgba(139,92,246,0.12)', border: 'none', color: '#a78bfa', borderRadius: 6, padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Eye style={{ width: 13, height: 13 }} />
              </button>
            )}
            {ba && (
              <button onClick={() => setBeforeAfterModal(doc)} style={{ flex: 1, background: 'rgba(139,92,246,0.12)', border: 'none', color: '#a78bfa', borderRadius: 6, padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowLeftRight style={{ width: 13, height: 13 }} />
              </button>
            )}
            <button onClick={() => handleDownload(doc)} style={{ flex: 1, background: 'rgba(6,182,212,0.1)', border: 'none', color: '#06b6d4', borderRadius: 6, padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download style={{ width: 13, height: 13 }} />
            </button>
            <button onClick={() => handleDelete(doc.id)} style={{ background: 'rgba(244,63,94,0.1)', border: 'none', color: '#f43f5e', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
            Gestionnaire de Documents
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Photos, documents, avant/après</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setUploadBeforeAfter(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <ArrowLeftRight style={{ width: 15, height: 15 }} /> Avant/Après
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', border: 'none', color: '#fff', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            <Upload style={{ width: 15, height: 15 }} /> Upload
          </button>
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 16, padding: 32, textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(139,92,246,0.05)' : 'rgba(255,255,255,0.01)',
          transition: 'all 0.2s', marginBottom: 24
        }}
      >
        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <RefreshCw style={{ width: 20, height: 20, color: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#a78bfa', fontSize: 14, fontWeight: 600 }}>Upload en cours...</span>
          </div>
        ) : (
          <>
            <Upload style={{ width: 32, height: 32, color: dragging ? '#8b5cf6' : '#475569', margin: '0 auto 12px' }} />
            <p style={{ color: dragging ? '#a78bfa' : '#64748b', fontSize: 14, fontWeight: 600, margin: 0 }}>
              {dragging ? 'Relâchez pour uploader' : 'Glissez-déposez des fichiers ici ou cliquez pour parcourir'}
            </p>
            <p style={{ color: '#475569', fontSize: 12, marginTop: 6 }}>JPG, PNG, PDF, DOC acceptés</p>
          </>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 4 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'rgba(139,92,246,0.2)' : 'transparent',
                border: activeTab === tab.id ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                color: activeTab === tab.id ? '#a78bfa' : '#64748b',
                borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Entity type filter */}
        <select
          value={entityType}
          onChange={e => setEntityType(e.target.value)}
          style={{ background: 'hsl(215,28%,10%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 12px', color: entityType ? '#f1f5f9' : '#64748b', fontSize: 13, outline: 'none', cursor: 'pointer' }}
        >
          {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#475569' }}>{docs.length} fichier(s)</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <RefreshCw style={{ width: 24, height: 24, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p>Chargement...</p>
        </div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>
          <Image style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: 15, fontWeight: 600 }}>Aucun document trouvé</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Uploadez votre premier fichier ci-dessus</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
          {docs.map((doc, i) => <FileCard key={doc.id || i} doc={doc} />)}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button onClick={() => setPreview(null)} style={{ position: 'absolute', top: -40, right: 0, background: 'none', border: 'none', color: '#fff', fontSize: 26, cursor: 'pointer' }}>×</button>
            <img src={preview.url} alt={preview.name} style={{ maxWidth: '85vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12 }} />
            <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 12, fontSize: 13 }}>{preview.name}</p>
          </div>
        </div>
      )}

      {/* Before/After modal */}
      {beforeAfterModal && (
        <div
          onClick={() => setBeforeAfterModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '90vw', maxWidth: 900, background: 'hsl(224,71%,6%)', borderRadius: 16, padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Manrope,sans-serif', color: '#f1f5f9', fontSize: 16, fontWeight: 800, margin: 0 }}>Avant / Après</h3>
              <button onClick={() => setBeforeAfterModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {['before_url', 'after_url'].map((key, i) => {
                const url = beforeAfterModal[key];
                const label = i === 0 ? '⬅ Avant' : 'Après ➡';
                return (
                  <div key={key}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>{label}</p>
                    {url ? (
                      <img src={url} alt={label} style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 300 }} />
                    ) : (
                      <div style={{ height: 200, background: 'rgba(255,255,255,0.03)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                        <Image style={{ width: 32, height: 32 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Upload Before/After modal */}
      {uploadBeforeAfter && (
        <div
          onClick={() => setUploadBeforeAfter(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: 'hsl(224,71%,6%)', borderRadius: 16, padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Manrope,sans-serif', color: '#f1f5f9', fontSize: 16, fontWeight: 800, margin: 0 }}>Upload Avant / Après</h3>
              <button onClick={() => setUploadBeforeAfter(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            {['Avant', 'Après'].map((label, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                <input ref={i === 0 ? beforeRef : afterRef} type="file" accept="image/*"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, cursor: 'pointer', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setUploadBeforeAfter(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={uploadBeforeAfterPair} disabled={uploading}
                style={{ background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {uploading ? 'Upload...' : 'Uploader'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DocumentsManager;
