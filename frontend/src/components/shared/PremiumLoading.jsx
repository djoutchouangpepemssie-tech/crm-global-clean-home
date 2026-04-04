import React from 'react';

/**
 * Premium Loading Skeleton Components
 * Ultra-smooth animations and glassmorphism effects
 */

export const SkeletonCard = ({ count = 3, variant = 'card' }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, i) => (
      <div 
        key={i}
        className="animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 
                   rounded-2xl border border-white/5 p-5 min-h-[120px]"
        style={{
          animation: `shimmer 2s infinite`,
          animationDelay: `${i * 100}ms`
        }}
      >
        <div className="space-y-2">
          <div className="h-4 bg-white/10 rounded-lg w-3/4" />
          <div className="h-3 bg-white/8 rounded-lg w-1/2" />
        </div>
      </div>
    ))}
    <style>{`
      @keyframes shimmer {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
    `}</style>
  </div>
);

export const SkeletonRow = ({ count = 5 }) => (
  <div className="space-y-2">
    {[...Array(count)].map((_, i) => (
      <div 
        key={i}
        className="animate-pulse bg-white/3 rounded-xl h-12 border border-white/5"
        style={{
          animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
          animationDelay: `${i * 100}ms`
        }}
      />
    ))}
  </div>
);

export const SkeletonGrid = ({ cols = 4, rows = 2 }) => (
  <div className={`grid grid-cols-${cols} gap-4`}>
    {[...Array(cols * rows)].map((_, i) => (
      <div 
        key={i}
        className="animate-pulse bg-white/3 rounded-2xl aspect-square border border-white/5"
        style={{
          animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
          animationDelay: `${(i % cols) * 100}ms`
        }}
      />
    ))}
  </div>
);

export const SkeletonLine = () => (
  <div className="animate-pulse bg-white/3 rounded-lg h-4 w-full" />
);

export const LoadingDots = () => (
  <div className="flex items-center gap-1">
    {[0, 1, 2].map(i => (
      <div
        key={i}
        className="w-2 h-2 rounded-full bg-violet-400"
        style={{
          animation: `bounce 1.4s infinite`,
          animationDelay: `${i * 0.2}s`
        }}
      />
    ))}
  </div>
);

export const PremiumEmptyState = ({ 
  icon: Icon, 
  title = 'Aucune donnée',
  description = 'Il n\'y a rien à afficher pour le moment',
  action = null,
  emoji = '📭'
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="text-6xl mb-4 opacity-40 animate-bounce">{emoji}</div>
    {Icon && <Icon className="w-12 h-12 text-slate-500 mb-4 opacity-50" />}
    <h3 className="text-lg font-bold text-slate-300 mb-2">{title}</h3>
    <p className="text-sm text-slate-500 text-center max-w-sm mb-6">{description}</p>
    {action && (
      <button className="px-6 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold
                        hover:bg-violet-700 transition-all duration-200 transform hover:scale-105
                        shadow-lg hover:shadow-violet-500/30">
        {action.label}
      </button>
    )}
  </div>
);

export const PremiumError = ({
  title = 'Une erreur s\'est produite',
  description = 'Veuillez réessayer plus tard',
  action = null,
  emoji = '⚠️'
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 
                  bg-gradient-to-br from-red-500/5 via-transparent to-red-500/5
                  border border-red-500/20 rounded-2xl">
    <div className="text-6xl mb-4">{emoji}</div>
    <h3 className="text-lg font-bold text-red-400 mb-2">{title}</h3>
    <p className="text-sm text-slate-500 text-center max-w-sm mb-6">{description}</p>
    {action && (
      <button onClick={action.onClick}
              className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold
                        hover:bg-red-700 transition-all duration-200 transform hover:scale-105">
        {action.label}
      </button>
    )}
  </div>
);

export const LoadingBar = () => (
  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
    <div className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500
                   rounded-full animate-[shimmer_2s_infinite]"
         style={{
           backgroundSize: '200% 100%',
           animation: 'shimmer 2s infinite'
         }} />
  </div>
);

export const PageLoader = () => (
  <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
      <div className="flex flex-col items-center gap-4">
        <LoadingDots />
        <p className="text-sm text-slate-400">Chargement en cours...</p>
      </div>
    </div>
  </div>
);
