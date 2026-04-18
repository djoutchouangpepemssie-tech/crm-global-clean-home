import React from 'react';

export const SkeletonCard = ({ count = 3 }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-xl border border-neutral-200 p-5 min-h-[120px] relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-100 to-transparent animate-shimmer"
             style={{ backgroundSize: '200% 100%' }} />
        <div className="relative space-y-2.5">
          <div className="h-4 bg-neutral-100 rounded w-3/4" />
          <div className="h-3 bg-neutral-100 rounded w-1/2" />
          <div className="h-3 bg-neutral-100 rounded w-5/6 mt-4" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonRow = ({ count = 5 }) => (
  <div className="space-y-2">
    {[...Array(count)].map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-lg h-12 border border-neutral-200 animate-pulse-soft"
        style={{ animationDelay: `${i * 100}ms` }}
      />
    ))}
  </div>
);

export const SkeletonGrid = ({ cols = 4, rows = 2 }) => (
  <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
    {[...Array(cols * rows)].map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-xl aspect-square border border-neutral-200 animate-pulse-soft"
        style={{ animationDelay: `${(i % cols) * 100}ms` }}
      />
    ))}
  </div>
);

export const SkeletonLine = ({ width = 'w-full' }) => (
  <div className={`bg-neutral-100 rounded h-3 ${width} animate-pulse-soft`} />
);

export const LoadingDots = () => (
  <div className="flex items-center gap-1.5">
    {[0, 1, 2].map(i => (
      <div
        key={i}
        className="w-2 h-2 rounded-full bg-brand-600"
        style={{
          animation: `pulse-soft 1.4s ease-in-out infinite`,
          animationDelay: `${i * 0.2}s`
        }}
      />
    ))}
  </div>
);

export const PremiumEmptyState = ({
  icon: Icon,
  title = 'Aucune donnée',
  description = "Il n'y a rien à afficher pour le moment.",
  action = null,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {Icon && (
      <div className="w-14 h-14 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-brand-600" strokeWidth={1.75} />
      </div>
    )}
    <h3 className="font-display text-lg font-semibold text-neutral-900 mb-1.5 tracking-tight">{title}</h3>
    <p className="text-sm text-neutral-500 max-w-sm mb-6 leading-relaxed">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold
                   hover:bg-brand-700 transition-all duration-200 shadow-sm hover:shadow-brand"
      >
        {action.label}
      </button>
    )}
  </div>
);

export const PremiumError = ({
  title = "Une erreur s'est produite",
  description = 'Veuillez réessayer plus tard.',
  action = null,
}) => (
  <div className="flex flex-col items-center justify-center py-14 px-4 text-center
                  bg-terracotta-50/50 border border-terracotta-200 rounded-2xl">
    <div className="w-14 h-14 rounded-xl bg-terracotta-100 border border-terracotta-200 flex items-center justify-center mb-4">
      <svg className="w-6 h-6 text-terracotta-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    </div>
    <h3 className="font-display text-lg font-semibold text-terracotta-800 mb-1.5 tracking-tight">{title}</h3>
    <p className="text-sm text-neutral-600 max-w-sm mb-6 leading-relaxed">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-5 py-2.5 rounded-lg bg-terracotta-600 text-white text-sm font-semibold
                   hover:bg-terracotta-700 transition-all duration-200 shadow-sm"
      >
        {action.label}
      </button>
    )}
  </div>
);

export const LoadingBar = () => (
  <div className="w-full h-0.5 bg-neutral-100 rounded-full overflow-hidden">
    <div className="h-full bg-brand-600 rounded-full animate-shimmer"
         style={{ backgroundSize: '200% 100%' }} />
  </div>
);

export const PageLoader = () => (
  <div className="fixed inset-0 bg-neutral-900/20 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-card-xl">
      <div className="flex flex-col items-center gap-4">
        <LoadingDots />
        <p className="text-sm text-neutral-600 font-mono uppercase tracking-[0.08em]">Chargement…</p>
      </div>
    </div>
  </div>
);
