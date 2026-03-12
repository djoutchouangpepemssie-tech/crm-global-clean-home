import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { getStatusLabel } from '../../lib/utils';
import LeadScoreBadge from '../shared/LeadScoreBadge';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const COLUMN_DEFS = [
  { id: 'nouveau', title: 'Nouveau', color: 'bg-blue-50 border-blue-200' },
  { id: 'contacté', title: 'Contacté', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'en_attente', title: 'En attente', color: 'bg-orange-50 border-orange-200' },
  { id: 'devis_envoyé', title: 'Devis envoyé', color: 'bg-purple-50 border-purple-200' },
  { id: 'gagné', title: 'Gagné', color: 'bg-green-50 border-green-200' },
  { id: 'perdu', title: 'Perdu', color: 'bg-red-50 border-red-200' }
];

const KanbanBoard = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/leads?period=30d`, { withCredentials: true });
      setLeads(response.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Erreur lors du chargement des leads');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.lead_id);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedLead || draggedLead.status === targetColumnId) {
      setDraggedLead(null);
      return;
    }

    // Optimistic update
    setLeads(prev =>
      prev.map(l =>
        l.lead_id === draggedLead.lead_id ? { ...l, status: targetColumnId } : l
      )
    );

    try {
      await axios.patch(
        `${API_URL}/leads/${draggedLead.lead_id}`,
        { status: targetColumnId },
        { withCredentials: true }
      );
      toast.success(`Lead déplacé vers "${getStatusLabel(targetColumnId)}"`);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Erreur lors de la mise à jour');
      fetchLeads();
    }

    setDraggedLead(null);
  };

  const getColumnLeads = (columnId) => leads.filter(l => l.status === columnId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="kanban-board">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Pipeline Kanban
        </h1>
        <p className="text-slate-600 mt-1">Glissez-déposez les leads pour changer leur statut</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMN_DEFS.map((column) => {
          const columnLeads = getColumnLeads(column.id);
          const isOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80"
              data-testid={`kanban-column-${column.id}`}
            >
              <div
                className={`rounded-xl border-2 ${column.color} p-4 min-h-[400px] transition-all ${
                  isOver ? 'ring-2 ring-violet-400 bg-violet-50/50' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-900">{column.title}</h2>
                  <span className="px-2 py-1 bg-white rounded-full text-xs font-semibold text-slate-600">
                    {columnLeads.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnLeads.map((lead) => (
                    <div
                      key={lead.lead_id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      data-testid={`kanban-card-${lead.lead_id}`}
                      className={`bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
                        draggedLead?.lead_id === lead.lead_id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <GripVertical className="w-4 h-4 text-slate-300 mt-1 flex-shrink-0" />
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/leads/${lead.lead_id}`)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-sm flex-shrink-0">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-medium text-slate-900 truncate text-sm">{lead.name}</h3>
                              <p className="text-xs text-slate-600">{lead.service_type}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 mb-3 pl-7">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pl-7">
                        <LeadScoreBadge score={lead.score || 50} />
                        {lead.surface && (
                          <span className="text-xs text-slate-500">{lead.surface} m²</span>
                        )}
                      </div>
                    </div>
                  ))}
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
