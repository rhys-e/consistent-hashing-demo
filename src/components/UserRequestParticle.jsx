import React from 'react';
import { toXY } from '../utils/geometryUtils';
import theme from '../themes';
import { useSelector } from '@xstate/react';

export function UserRequestParticle({ particleRef, dimensions: { width, height, radius } }) {
  const state = useSelector(particleRef, state => state);
  const {
    context: { key, initialAnimationProgress, currentPos, ringStartPos },
    value: phase,
  } = state;

  // Check if particle is in initial animation or regular movement
  if (phase === 'initial') {
    const [ringStartX, ringStartY] = toXY(ringStartPos, width, height, radius);
    const centerX = width / 2;
    const centerY = height / 2;
    const x = centerX + (ringStartX - centerX) * initialAnimationProgress;
    const y = centerY + (ringStartY - centerY) * initialAnimationProgress;
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
    const [x, y] = toXY(currentPos, width, height, radius);
    // Calculate a point slightly behind the particle for the trail
    const trailLength = theme.hashRing.particle.trailLength || 0.01;
    const trailPos = (currentPos - trailLength + 1) % 1;
    const [trailX, trailY] = toXY(trailPos, width, height, radius);
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
