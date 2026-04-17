import React, { useEffect, useRef } from 'react';

export function ProgressRing({ rings = [], size = 180, strokeWidth = 14, gap = 10 }) {
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {rings.map((ring, i) => {
        const radius = center - strokeWidth / 2 - (strokeWidth + gap) * i;
        const circumference = 2 * Math.PI * radius;
        const progress = Math.min(1, Math.max(0, ring.value / ring.max));
        const dashOffset = circumference * (1 - progress);

        return (
          <g key={i}>
            <circle cx={center} cy={center} r={radius} fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
            <circle cx={center} cy={center} r={radius} fill="none"
              stroke={ring.color} strokeWidth={strokeWidth}
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default ProgressRing;
