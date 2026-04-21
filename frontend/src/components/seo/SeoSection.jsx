// SeoSection.jsx — wrapper léger pour les sous-pages en cours d'extraction.
// Affiche le header de la section et le contenu enfant, en restant dans le
// shell SeoLayout (sidebar + topbar + filtres partagés).

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { PageHeader } from './SeoShared';

export default function SeoSection({ eyebrow, title, subtitle, children, legacyAnchor }) {
  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={
          legacyAnchor && (
            <Link to={`/seo/legacy#${legacyAnchor}`} className="seo-chip">
              Vue détaillée (classique) <ArrowUpRight style={{ width: 12, height: 12 }} />
            </Link>
          )
        }
      />
      {children}
    </div>
  );
}
