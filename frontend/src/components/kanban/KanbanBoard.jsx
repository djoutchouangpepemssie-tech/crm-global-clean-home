import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, GripVertical, Trello, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const COLUMNS = [
  { id: 'nouveau', title: 'Nouveau', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
  { id: 'contacté', title: 'Contacté', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  { id: 'en_attente', title: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  { id: 'devis_envoyé', title: 'Devis envoyé', color: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)' },
  { id: 'gagné', title: 'Gagné', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  { id: 'perdu', title: 'Perdu', color: '#f43f5e', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.2)' },
];

const KanbanBoard = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/leads?period=90d`, { withCredentials: true });
      setLeads(Array.isArray(res.data) ? res.data : res.data.leads || []);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedLead || draggedLead.status === targetColumnId) { setDraggedLead(null); return; }
    
    // Sauvegarder l'état précédent pour rollback
    const previousStatus = draggedLead.status;
    const previousLeads = leads;
    
    // Optimistic update - mettre à jour l'UI immédiatement
    setLeads(prev => prev.map(l => l.lead_id === draggedLead.lead_id ? { ...l, status: targetColumnId } : l));
    setDraggedLead(null);
    
    try {
      await axios.patch(`${API_URL}/leads/${draggedLead.lead_id}`, { status: targetColumnId }, { withCredentials: true });
      const col = COLUMNS.find(c => c.id === targetColumnId);
      toast.success(`✅ Déplacé vers "${col?.title}"`, { duration: 2000 });
    } catch (err) {
      // ROLLBACK - restaurer l'état précédent avec animation
      toast.error(`❌ Erreur - retour à "${COLUMNS.find(c=>c.id===previousStatus)?.title}"`, { duration: 3000 });
      // Rollback visuel avec délai pour que l'utilisateur voit l'animation
      setTimeout(() => {
        setLeads(previousLeads);
      }, 300);
    }
  };

  if (loading) return (
    <div className="p-6 animate-fade-in">
      <div className="skeleton h-8 w-48 mb-6 rounded-lg" />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(6)].map((_, i) => <div key={i} className="flex-shrink-0 w-72 skeleton h-96 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" data-testid="kanban-board">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trello className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Pipeline</h1>
          </div>
          <p className="text-slate-500 text-sm">
            <span className="text-violet-400 font-semibold">{leads.length}</span> leads · Glissez-déposez pour changer le statut
          </p>
        </div>
        <button onClick={fetchLeads} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all border border-white/5">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter(l => l.status === col.id || (col.id === 'contacté' && l.status === 'contacte') || (col.id === 'gagné' && l.status === 'gagne'));
          const isOver = dragOverColumn === col.id;

          return (
            <div key={col.id} className="flex-shrink-0 w-64 md:w-72" data-testid={`kanban-column-${col.id}`}>
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{background: col.color}} />
                  <h2 className="text-sm font-semibold text-slate-300">{col.title}</h2>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{color: col.color, background: col.bg, border: `1px solid ${col.border}`}}>
                  {colLeads.length}
                </span>
              </div>

              {/* Column body */}
              <div className="rounded-xl p-2 min-h-[400px] transition-all"
                style={{
                  background: isOver ? col.bg : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isOver ? col.border : 'rgba(255,255,255,0.05)'}`,
                  boxShadow: isOver ? `0 0 20px ${col.bg}` : 'none'
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.id); }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.id)}>

                <div className="space-y-2">
                  {colLeads.map((lead) => (
                    <div key={lead.lead_id} draggable
                      onDragStart={(e) => { setDraggedLead(lead); e.dataTransfer.effectAllowed = 'move'; }}
                      data-testid={`kanban-card-${lead.lead_id}`}
                      className={`rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all group ${
                        draggedLead?.lead_id === lead.lead_id ? 'opacity-40 scale-95' : 'hover:translate-y-[-2px]'
                      }`}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}>
                      
                      {/* Card header */}
                      <div className="flex items-start gap-2 mb-2">
                        <GripVertical className="w-3.5 h-3.5 text-slate-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{background: col.bg, color: col.color, border: `1px solid ${col.border}`}}>
                              {(lead.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xs font-semibold text-slate-200 truncate group-hover:text-slate-100">{lead.name}</h3>
                              <p className="text-[10px] text-slate-500 truncate">{lead.service_type}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="space-y-1 mb-2 pl-5">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pl-5">
                        <LeadScoreBadge score={lead.score || 50} />
                        {lead.surface && (
                          <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{lead.surface} m²</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {colLeads.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-700">
                      <div className="w-8 h-8 rounded-full border-2 border-dashed mb-2 flex items-center justify-center"
                        style={{borderColor: col.border}}>
                        <span style={{color: col.color}} className="text-xs">+</span>
                      </div>
                      <p className="text-xs">Aucun lead</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
