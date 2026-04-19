// AICabinet.jsx — « Le cabinet ».

import React, { Suspense, lazy } from 'react';
import { MagazineShell } from '../shared';

const AICenter = lazy(() => import('./AICenter'));

export default function AICabinet() {
  return (
    <MagazineShell
      label="Intelligence · Conseil"
      title="Le <em>cabinet</em>"
      subtitle="Conseils de l'assistant IA, commandes vocales et analyses prédictives pour la conduite de l'atelier"
      accent="oklch(0.52 0.13 165)"
    >
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'oklch(0.52 0.010 60)' }}>Ouverture du cabinet…</div>}>
        <AICenter />
      </Suspense>
    </MagazineShell>
  );
}
