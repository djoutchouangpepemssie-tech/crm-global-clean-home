import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const TemplatesManager = ({ onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'note',
    content: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/templates`, { withCredentials: true });
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/templates`, formData, { withCredentials: true });
      toast.success('Template créé');
      setFormData({ name: '', type: 'note', content: '' });
      setShowForm(false);
      fetchTemplates();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleDelete = async (templateId) => {
    try {
      await axios.delete(`${API_URL}/templates/${templateId}`, { withCredentials: true });
      toast.success('Template supprimé');
      fetchTemplates();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm" data-testid="templates-manager">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Templates de réponses</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
          data-testid="add-template-button"
        >
          <Plus className="w-4 h-4" />
          Nouveau template
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Nom du template"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            required
          />
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="note">Note</option>
            <option value="email">Email</option>
            <option value="relance">Relance</option>
          </select>
          <textarea
            placeholder="Contenu du template..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium">
              Créer
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm font-medium">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {templates.length === 0 ? (
          <p className="text-center text-slate-500 py-8">Aucun template créé</p>
        ) : (
          templates.map((template) => (
            <div
              key={template.template_id}
              className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              data-testid={`template-${template.template_id}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-slate-900">{template.name}</h3>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                    {template.type}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{template.content}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(template.content);
                    toast.success('Copié dans le presse-papier');
                    if (onSelectTemplate) onSelectTemplate(template.content);
                  }}
                  className="p-2 text-slate-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                  title="Copier"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(template.template_id)}
                  className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TemplatesManager;
