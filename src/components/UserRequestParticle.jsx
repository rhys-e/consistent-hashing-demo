import React from 'react';
import { toXY } from '../utils/geometryUtils';
import theme from '../themes';
import { useSelector } from '@xstate/react';

export function UserRequestParticle({ particleRef }) {
  const state = useSelector(particleRef, state => state);
  const {
    context: {
      key,
      initialAnimationProgress,
      center,
      currentPos,
      ringStartPos,
      dimensions: { svgWidth, svgHeight, svgRadius },
    },
    value: phase,
  } = state;

  // Check if particle is in initial animation or regular movement
  if (phase === 'initial') {
    const [ringStartX, ringStartY] = toXY(ringStartPos, svgWidth, svgHeight, svgRadius);
    const x = center.x + (ringStartX - center.x) * initialAnimationProgress;
    const y = center.y + (ringStartY - center.y) * initialAnimationProgress;
    return (
      <circle
        cx={x}
        cy={y}
        r={theme.hashRing.particle.size}
        fill={theme.hashRing.particle.color}
        stroke={theme.hashRing.particle.strokeColor}
        strokeWidth={theme.hashRing.particle.strokeWidth}
        filter="url(#particleGlow)"
        className="particle-dot animate-particle-blink"
      />
    );
  } else if (phase === 'ring') {
    const [x, y] = toXY(currentPos, svgWidth, svgHeight, svgRadius);
    // Calculate a point slightly behind the particle for the trail
    const trailLength = theme.hashRing.particle.trailLength || 0.01;
    const trailPos = (currentPos - trailLength + 1) % 1;
    const [trailX, trailY] = toXY(trailPos, svgWidth, svgHeight, svgRadius);
    const gradientId = `particleTrailGradient-${key}`;

    return (
      <React.Fragment>
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={trailX}
            y1={trailY}
            x2={x}
            y2={y}
          >
            <stop offset="0%" stopColor={theme.hashRing.particle.color} stopOpacity="0" />
            <stop
              offset="100%"
              stopColor={theme.hashRing.particle.color}
              stopOpacity={theme.hashRing.particle.trailOpacity}
            />
          </linearGradient>
        </defs>

        <g className="particle-group">
          {/* Particle trail with directional gradient */}
          <line
            x1={trailX}
            y1={trailY}
            x2={x}
            y2={y}
            stroke={`url(#${gradientId})`}
            strokeWidth={theme.hashRing.particle.trailWidth}
            className="particle-trail animate-particle-blink"
            style={{
              opacity: theme.hashRing.particle.trailOpacity,
            }}
          />

          {/* Particle dot */}
          <circle
            cx={x}
            cy={y}
            r={theme.hashRing.particle.size}
            fill={theme.hashRing.particle.color}
            stroke={theme.hashRing.particle.strokeColor}
            strokeWidth={theme.hashRing.particle.strokeWidth}
            filter="url(#particleGlow)"
            className="particle-dot animate-particle-blink"
          />
        </g>
      </React.Fragment>
    );
  }
}
