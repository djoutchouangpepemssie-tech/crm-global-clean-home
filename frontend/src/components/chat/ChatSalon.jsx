// ChatSalon.jsx — « Le salon ».

import React, { Suspense, lazy } from 'react';
import { MagazineShell } from '../shared';

const ChatCenter = lazy(() => import('./ChatCenter'));

export default function ChatSalon() {
  return (
    <MagazineShell
      label="Communication · Échanges"
      title="Le <em>salon</em>"
      subtitle="Conversations avec les clients, équipes et fournisseurs — tout ce qui se dit se consigne"
      accent="oklch(0.52 0.13 165)"
    >
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'oklch(0.52 0.010 60)' }}>Entrée dans le salon…</div>}>
        <ChatCenter />
      </Suspense>
    </MagazineShell>
  );
}
