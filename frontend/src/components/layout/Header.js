import React from 'react';
import { Calendar } from 'lucide-react';

const Header = ({ title, subtitle, actions }) => {
  return (
    <div className="bg-white border-b border-slate-200 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {title}
          </h1>
          {subtitle && <p className="text-slate-600 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          {actions}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
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
