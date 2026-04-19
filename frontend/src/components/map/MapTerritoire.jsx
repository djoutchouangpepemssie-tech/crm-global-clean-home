// MapTerritoire.jsx — « Le territoire ».
// Enveloppe magazine autour de la carte existante.

import React, { Suspense, lazy } from 'react';
import { MagazineShell } from '../shared';

const InterventionsMap = lazy(() => import('./InterventionsMap'));

export default function MapTerritoire() {
  return (
    <MagazineShell
      label="Terrain · Cartographie"
      title="Le <em>territoire</em>"
      subtitle="Cartographie vivante des interventions — chaque pin est un rendez-vous, chaque zone une tournée"
      accent="oklch(0.52 0.13 165)"
    >
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'oklch(0.52 0.010 60)' }}>Tracé du territoire…</div>}>
        <InterventionsMap />
      </Suspense>
    </MagazineShell>
  );
}
