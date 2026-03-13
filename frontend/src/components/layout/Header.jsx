import React from 'react';
import { Calendar } from 'lucide-react';
import NotificationCenter from '../notifications/NotificationCenter';

const Header = ({ title, subtitle, actions }) => {
  return (
    <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {title}
          </h1>
          {subtitle && <p className="text-slate-600 mt-1 text-sm">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <NotificationCenter />
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
