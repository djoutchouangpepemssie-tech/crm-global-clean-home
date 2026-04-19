// DirectorPasserelle.jsx — « La passerelle ».

import React, { Suspense, lazy } from 'react';
import { MagazineShell } from '../shared';

const DirectorDashboard = lazy(() => import('./DirectorDashboard'));

export default function DirectorPasserelle() {
  return (
    <MagazineShell
      label="Direction · Vue d'ensemble"
      title="La <em>passerelle</em>"
      subtitle="Tableau de bord de commandement — tout ce que la direction doit voir d'un seul regard"
      accent="oklch(0.22 0.07 240)"
    >
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'oklch(0.52 0.010 60)' }}>Montée sur la passerelle…</div>}>
        <DirectorDashboard />
      </Suspense>
    </MagazineShell>
  );
}
