import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { User, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { getStatusLabel } from '../../lib/utils';
import LeadScoreBadge from '../shared/LeadScoreBadge';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const KanbanBoard = () => {
  const [columns, setColumns] = useState({
    nouveau: { id: 'nouveau', title: 'Nouveau', leads: [] },
    contacté: { id: 'contacté', title: 'Contacté', leads: [] },
    en_attente: { id: 'en_attente', title: 'En attente', leads: [] },
    devis_envoyé: { id: 'devis_envoyé', title: 'Devis envoyé', leads: [] },
    gagné: { id: 'gagné', title: 'Gagné', leads: [] },
    perdu: { id: 'perdu', title: 'Perdu', leads: [] }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/leads?period=30d`, { withCredentials: true });
      const leads = response.data;

      // Group leads by status
      const newColumns = { ...columns };
      Object.keys(newColumns).forEach(key => {
        newColumns[key].leads = leads.filter(lead => lead.status === key);
      });

      setColumns(newColumns);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Erreur lors du chargement des leads');
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    const sourceLead = sourceColumn.leads.find(lead => lead.lead_id === draggableId);

    // Update UI immediately
    const newColumns = { ...columns };
    newColumns[source.droppableId].leads = sourceColumn.leads.filter(lead => lead.lead_id !== draggableId);
    newColumns[destination.droppableId].leads = [...destColumn.leads];
    newColumns[destination.droppableId].leads.splice(destination.index, 0, sourceLead);
    setColumns(newColumns);

    // Update backend
    try {
      await axios.patch(
        `${API_URL}/leads/${draggableId}`,
        { status: destination.droppableId },
        { withCredentials: true }
      );
      toast.success(`Lead déplacé vers "${getStatusLabel(destination.droppableId)}"`);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Erreur lors de la mise à jour');
      // Revert on error
      fetchLeads();
    }
  };

  const getColumnColor = (columnId) => {
    const colors = {
      nouveau: 'bg-blue-50 border-blue-200',
      contacté: 'bg-yellow-50 border-yellow-200',
      en_attente: 'bg-orange-50 border-orange-200',
      devis_envoyé: 'bg-purple-50 border-purple-200',
      gagné: 'bg-green-50 border-green-200',
      perdu: 'bg-red-50 border-red-200'
    };
    return colors[columnId] || 'bg-slate-50 border-slate-200';
  };

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

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.values(columns).map((column) => (
            <div
              key={column.id}
              className="flex-shrink-0 w-80"
              data-testid={`kanban-column-${column.id}`}
            >
              <div className={`rounded-xl border-2 ${getColumnColor(column.id)} p-4 h-full`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-900">{column.title}</h2>
                  <span className="px-2 py-1 bg-white rounded-full text-xs font-semibold text-slate-600">
                    {column.leads.length}
                  </span>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[200px] ${
                        snapshot.isDraggingOver ? 'bg-white/50 rounded-lg' : ''
                      }`}
                    >
                      {column.leads.map((lead, index) => (
                        <Draggable key={lead.lead_id} draggableId={lead.lead_id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-move ${
                                snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                              }`}
                              data-testid={`kanban-card-${lead.lead_id}`}
                            >
                              <div className="flex items-start gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold flex-shrink-0">
                                  {lead.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-slate-900 truncate">{lead.name}</h3>
                                  <p className="text-sm text-slate-600">{lead.service_type}</p>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm text-slate-600 mb-3">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 flex-shrink-0" />
                                  <span>{lead.phone}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <LeadScoreBadge score={lead.score || 50} />
                                {lead.surface && (
                                  <span className="text-xs text-slate-500">{lead.surface} m²</span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;
