// AdsAffichage.jsx — « Le tableau d'affichage ».

import React, { Suspense, lazy } from 'react';
import { MagazineShell } from '../shared';

const AdsDashboard = lazy(() => import('./AdsDashboard'));

export default function AdsAffichage() {
  return (
    <MagazineShell
      label="Marketing · Publicités"
      title="Le <em>tableau</em> d'affichage"
      subtitle="Campagnes Meta et Google — budget engagé, performances et ciblage des audiences"
      accent="oklch(0.62 0.14 45)"
    >
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'oklch(0.52 0.010 60)' }}>Affichage des campagnes…</div>}>
        <AdsDashboard />
      </Suspense>
    </MagazineShell>
  );
}
