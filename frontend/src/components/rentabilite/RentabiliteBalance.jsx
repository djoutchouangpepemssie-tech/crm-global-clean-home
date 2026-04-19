// RentabiliteBalance.jsx — « La balance ».

import React, { Suspense, lazy } from 'react';
import { MagazineShell } from '../shared';

const RentabiliteModule = lazy(() => import('./RentabiliteModule'));

export default function RentabiliteBalance() {
  return (
    <MagazineShell
      label="Gestion · Marges"
      title="La <em>balance</em>"
      subtitle="Rentabilité par chantier, service et intervenant — ce qui pèse d'un côté et ce qui rentre de l'autre"
      accent="oklch(0.72 0.13 85)"
    >
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'oklch(0.52 0.010 60)' }}>Pesée en cours…</div>}>
        <RentabiliteModule />
      </Suspense>
    </MagazineShell>
  );
}
