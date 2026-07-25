import React from 'react';
import { toXY } from '../utils/geometryUtils';
import theme from '../themes';

export function HashRingHit({ hit, width, height, radius }) {
  const [x, y] = toXY(hit.pos, width, height, radius);
  return (
    <g key={`hit-${hit.id}`} className="hit-effect">
      <circle
        cx={x}
        cy={y}
        r={theme.hashRing.hitEffect.width}
        fill="none"
        stroke={theme.hashRing.hitEffect.color}
        strokeWidth={theme.hashRing.hitEffect.strokeWidth}
        opacity={theme.hashRing.hitEffect.opacity}
        className="hit-pulse animate-pulse"
      />
    </g>
  );
}
