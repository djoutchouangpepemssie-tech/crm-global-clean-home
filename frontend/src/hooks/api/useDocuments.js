/**
 * Hooks React Query pour la gestion documentaire.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../lib/api';

const KEYS = {
  all: ['documents'],
  list: (filters) => ['documents', 'list', filters],
};

export function useDocumentsList(filters = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const { data } = await api.get(`/documents?${params.toString()}`);
      return Array.isArray(data) ? data : data.documents || data.items || [];
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Document uploadé');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'upload');
    },
  });
}

export function useUploadBeforeAfter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await api.post('/documents/before-after', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Photos avant/après uploadées');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'upload');
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId) => {
      await api.delete(`/documents/${documentId}`);
      return documentId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Document supprimé');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });
}
