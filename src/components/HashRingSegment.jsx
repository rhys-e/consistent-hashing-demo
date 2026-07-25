import React from 'react';
import theme from '../themes';

export function HashRingSegment({ segment, index, width, height }) {
  return (
    <>
      <radialGradient
        id={`segmentGradient-${index}`}
        cx="50%"
        cy="50%"
        r="50%"
        fx="50%"
        fy="50%"
        gradientUnits="objectBoundingBox"
      >
        <stop
          offset="0%"
          stopColor={segment.color}
          stopOpacity={theme.hashRing.segment.gradientInnerOpacity}
        />
        <stop
          offset="100%"
          stopColor={segment.color}
          stopOpacity={theme.hashRing.segment.gradientOuterOpacity}
        />
      </radialGradient>

      <g className="segment">
        <path
          d={segment.arcPath}
          transform={`translate(${width / 2}, ${height / 2})`}
          fill={`url(#segmentGradient-${index})`}
          stroke={segment.color}
          strokeWidth={theme.hashRing.segment.strokeWidth}
          strokeOpacity={theme.hashRing.segment.strokeOpacity}
          className="segment-path"
        />

        {/* Segment boundary line */}
        <line
          x1={width / 2}
          y1={height / 2}
          x2={segment.startX}
          y2={segment.startY}
          stroke={segment.color}
          strokeWidth={theme.hashRing.segment.boundaryLineWidth}
          strokeOpacity={theme.hashRing.segment.boundaryLineOpacity}
          strokeDasharray={theme.hashRing.segment.boundaryLineDashArray}
          className="segment-line"
        />
      </g>
    </>
  );
}
