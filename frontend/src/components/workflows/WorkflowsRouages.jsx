// WorkflowsRouages.jsx — « Les rouages ».

import React, { Suspense, lazy } from 'react';
import { MagazineShell } from '../shared';

const WorkflowBuilder = lazy(() => import('./WorkflowBuilder'));

export default function WorkflowsRouages() {
  return (
    <MagazineShell
      label="Automatisation · Flux"
      title="Les <em>rouages</em>"
      subtitle="Enchaînements automatisés — chaque événement déclenche le geste suivant, pour que rien ne se perde"
      accent="oklch(0.55 0.12 35)"
    >
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'oklch(0.52 0.010 60)' }}>Mise en marche des rouages…</div>}>
        <WorkflowBuilder />
      </Suspense>
    </MagazineShell>
  );
}
