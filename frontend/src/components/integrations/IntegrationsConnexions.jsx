// IntegrationsConnexions.jsx — « Les connexions ».

import React, { Suspense, lazy } from 'react';
import { MagazineShell } from '../shared';

const Integrations = lazy(() => import('./Integrations'));

export default function IntegrationsConnexions() {
  return (
    <MagazineShell
      label="Technique · Tiers"
      title="Les <em>connexions</em>"
      subtitle="Stripe, Google, Meta, webhooks — tous les liens de l'atelier avec le reste du monde"
      accent="oklch(0.35 0.08 240)"
    >
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'oklch(0.52 0.010 60)' }}>Établissement des connexions…</div>}>
        <Integrations />
      </Suspense>
    </MagazineShell>
  );
}
