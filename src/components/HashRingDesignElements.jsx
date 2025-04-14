import React from 'react';
import theme from '../themes';

export function HashRingBackground({ width, height }) {
  return (
    <>
      <rect width={width} height={height} fill="url(#ringGradient)" className="ring-bg" />
      <rect width={width} height={height} fill="url(#grid)" className="ring-grid" />
    </>
  );
}

export function HashRingCircles({ width, height, radius }) {
  return (
    <>
      <circle
        cx={width / 2}
        cy={height / 2}
        r={radius + 30}
        fill="none"
        stroke={theme.hashRing.ring.outerCircleColor}
        strokeWidth={theme.hashRing.ring.outerCircleWidth}
        strokeDasharray={theme.hashRing.ring.outerCircleDashArray}
        className="ring-outer-circle"
      />
      <circle
        cx={width / 2}
        cy={height / 2}
        r={radius + 15}
        fill="none"
        stroke={theme.hashRing.ring.innerCircleColor}
        strokeWidth={theme.hashRing.ring.innerCircleWidth}
        strokeDasharray={theme.hashRing.ring.innerCircleDashArray}
        className="ring-inner-circle"
      />
    </>
  );
}

export function HashRingCrosshair({ width, height, radius }) {
  return (
    <circle
      cx={width / 2}
      cy={height / 2}
      r={radius}
      fill="none"
      stroke={theme.hashRing.ring.outlineColor}
      strokeWidth={theme.hashRing.ring.outlineWidth}
      style={{ cursor: 'crosshair' }}
      className="ring-outline"
    />
  );
}

export function HashRingRadialLines({ width, height }) {
  return (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const angleRad = (angle * Math.PI) / 180;
        const innerX = width / 2 + Math.cos(angleRad) * 20;
        const innerY = height / 2 + Math.sin(angleRad) * 20;
        const outerX = width / 2 + Math.cos(angleRad) * 35;
        const outerY = height / 2 + Math.sin(angleRad) * 35;

        return (
          <line
            key={`radial-${i}`}
            x1={innerX}
            y1={innerY}
            x2={outerX}
            y2={outerY}
            stroke="#44475a"
            strokeWidth={1}
            strokeDasharray="2,3"
            opacity={0.6}
          />
        );
      })}
    </>
  );
}

export function HashRingOrigin({ width, height }) {
  return (
    <g>
      <circle
        cx={width / 2}
        cy={height / 2}
        r={15}
        fill="rgba(241, 250, 140, 0.15)"
        stroke="#44475a"
        strokeWidth={1.5}
      >
        <animate attributeName="r" values="15;18;15" dur="3s" repeatCount="indefinite" />
        <animate
          attributeName="fill-opacity"
          values="0.15;0.25;0.15"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>

      <circle
        cx={width / 2}
        cy={height / 2}
        r={5}
        fill="#f1fa8c"
        opacity={0.7}
        filter="url(#particleGlow)"
      >
        <animate attributeName="r" values="4;6;4" dur="3s" repeatCount="indefinite" />
      </circle>

      <text
        x={width / 2}
        y={height / 2 - 25}
        textAnchor="middle"
        fill="#f8f8f2"
        fontSize={10}
        fontFamily="'Share Tech Mono', monospace"
        letterSpacing="1px"
      >
        REQUEST ORIGIN
      </text>
    </g>
  );
}

export function HashRingHashValues({ width, height, radius }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const hashPos = i / 8;
        const x = width / 2 + (radius + 25) * Math.cos(angle);
        const y = height / 2 + (radius + 25) * Math.sin(angle);

        return (
          <g key={`hash-${i}`}>
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={theme.hashRing.ring.hashTextColor}
              fontSize={theme.hashRing.ring.hashTextSize}
              fontFamily={theme.typography.fontFamily.mono}
              className="hash-text"
            >
              {(hashPos * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}
    </>
  );
}
