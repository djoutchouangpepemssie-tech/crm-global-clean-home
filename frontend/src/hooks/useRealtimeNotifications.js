import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export const useRealtimeNotifications = () => {
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const lastCheckRef = useRef(new Date().toISOString());
  const intervalRef = useRef(null);

  const checkForNewLeads = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/leads/recent?since=${lastCheckRef.current}`,
        { withCredentials: true }
      );
      
      const { leads, count } = response.data;
      
      if (count > 0) {
        setNewLeadsCount(prev => prev + count);
        
        leads.forEach(lead => {
          toast.success(
            `Nouveau lead: ${lead.name}`,
            {
              description: `${lead.service_type} - ${lead.email}`,
              duration: 8000,
              action: {
                label: 'Voir',
                onClick: () => window.location.href = `/leads/${lead.lead_id}`
              }
            }
          );
        });
      }
      
      lastCheckRef.current = new Date().toISOString();
    } catch (error) {
      // Ignore polling errors silently
    }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(checkForNewLeads, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkForNewLeads]);

  const resetCount = () => setNewLeadsCount(0);

  return { newLeadsCount, resetCount };
};
