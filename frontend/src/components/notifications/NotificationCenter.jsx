import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bell, Check, CheckCheck, Info, AlertTriangle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../lib/utils';

import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const typeIcons = {
  info: { icon: Info, color: 'text-blue-500 bg-blue-50' },
  success: { icon: Zap, color: 'text-green-500 bg-green-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50' },
  alert: { icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
};

const NotificationCenter = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications`, { withCredentials: true });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await axios.post(`${API_URL}/notifications/read`, {}, { withCredentials: true });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // Silently fail
    }
  };

  const handleClick = (notif) => {
    if (notif.link) {
      navigate(notif.link);
      setOpen(false);
    }
  };

  return (
    <div className="relative" data-testid="notification-center">
      {/* Bell button */}
      <button
        data-testid="notification-bell"
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
          <div className="absolute right-0 sm:right-0 top-12 w-[calc(100vw-2rem)] sm:w-96 max-w-[384px] bg-white rounded-xl border border-slate-200 shadow-2xl z-50 max-h-[500px] overflow-hidden" data-testid="notification-dropdown">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  data-testid="mark-all-read"
                  onClick={markAllRead}
                  className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tout marquer lu
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto max-h-[400px]">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                notifications.map(notif => {
                  const cfg = typeIcons[notif.type] || typeIcons.info;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={notif.notification_id}
                      data-testid={`notification-${notif.notification_id}`}
                      onClick={() => handleClick(notif)}
                      className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        notif.link ? 'cursor-pointer' : ''
                      } ${!notif.read ? 'bg-violet-50/30' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 truncate">{notif.title}</p>
                            {!notif.read && <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0"></span>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{notif.message}</p>
                          <p className="text-xs text-slate-400 mt-1">{formatDateTime(notif.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
