import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export const useRealtimeNotifications = () => {
  const [lastCheck, setLastCheck] = useState(new Date().toISOString());
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const intervalRef = useRef(null);

  const checkForNewLeads = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/leads/recent?since=${lastCheck}`,
        { withCredentials: true }
      );
      
      const { leads, count } = response.data;
      
      if (count > 0) {
        setNewLeadsCount(prev => prev + count);
        
        // Show toast notification for each new lead
        leads.forEach(lead => {
          toast.success(
            `🎯 Nouveau lead: ${lead.name}`,
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
        
        // Play notification sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjWH0fPTgjMGHm7A7+OZURE');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch (e) {
          // Ignore audio errors
        }
      }
      
      setLastCheck(new Date().toISOString());
    } catch (error) {
      // Ignore polling errors silently
      console.log('Polling check skipped');
    }
  };

  useEffect(() => {
    // Start polling every 30 seconds
    intervalRef.current = setInterval(checkForNewLeads, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [lastCheck]);

  const resetCount = () => setNewLeadsCount(0);

  return { newLeadsCount, resetCount };
};
