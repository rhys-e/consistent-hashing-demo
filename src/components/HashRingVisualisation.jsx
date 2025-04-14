import React, { useCallback } from 'react';
import { toXY } from '../utils/geometryUtils';
import theme from '../themes';
import { useApp } from '../context/AppContext';
import { PreviewIndicator } from './PreviewIndicator';
import { UserRequestParticle } from './UserRequestParticle';
import { HashRingSegment } from './HashRingSegment';
import { useHashRingSegments } from '../hooks/useHashRingSegments';
import { ServerNode } from './ServerNode';
import { HashRingTooltip } from './HashRingTooltip';
import { useHashRingTooltip } from '../hooks/useHashRingTooltip';
import { HashRingHit } from './HashRingHit';
import {
  HashRingBackground,
  HashRingCircles,
  HashRingCrosshair,
  HashRingRadialLines,
  HashRingOrigin,
  HashRingHashValues,
} from './HashRingDesignElements';

export function HashRingVisualisation({ onRemoveServer }) {
  const {
    particleRefs,
    userRequests,
    hits,
    nodes: { virtualNodes },
    dimensions: { svgWidth: width, svgHeight: height, svgRadius: radius },
  } = useApp();

  const segments = useHashRingSegments(virtualNodes, width, height, radius);
  const { tooltip, handleNodeMouseEnter, handleNodeMouseLeave } = useHashRingTooltip(virtualNodes);

  const handleNodeClick = useCallback(
    node => {
      onRemoveServer?.(node.id);
    },
    [onRemoveServer]
  );

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        className="ring-visualisation rounded-sm border border-cyber-border"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={theme.hashRing.ring.gridColor}
              strokeWidth={theme.hashRing.ring.gridWidth}
            />
          </pattern>

          <radialGradient id="ringGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor={theme.colors.gradients.ringGradient.start} />
            <stop offset="90%" stopColor={theme.colors.gradients.ringGradient.end} />
          </radialGradient>

          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={theme.hashRing.node.glowDeviation} result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={theme.hashRing.particle.glowDeviation} result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <HashRingBackground width={width} height={height} />
        <HashRingCircles width={width} height={height} radius={radius} />

        {/* Render segments using the singular component */}
        {segments.map((segment, i) => (
          <HashRingSegment
            key={`segment-${i}`}
            segment={segment}
            index={i}
            width={width}
            height={height}
          />
        ))}

        <HashRingCrosshair width={width} height={height} radius={radius} />
        <HashRingHashValues width={width} height={height} radius={radius} />

        {/* Render server nodes using the singular component */}
        {virtualNodes.map((node, i) => (
          <ServerNode
            key={`vnode-${node.id}-${i}`}
            node={node}
            width={width}
            height={height}
            radius={radius}
            onClick={handleNodeClick}
            onMouseEnter={handleNodeMouseEnter}
            onMouseLeave={handleNodeMouseLeave}
          />
        ))}

        {/* Render particles */}
        {particleRefs
          .filter(ref => ref.getSnapshot().status !== 'done')
          .map(ref => (
            <UserRequestParticle
              key={ref.id}
              particleRef={ref}
              dimensions={{ width, height, radius }}
            />
          ))}

        {/* hit effects */}
        {hits.map(hit => (
          <HashRingHit
            key={`hit-${hit.id}`}
            hit={hit}
            width={width}
            height={height}
            radius={radius}
          />
        ))}

        {/* Preview indicator for next particle */}
        {userRequests.map(request => (
          <PreviewIndicator
            key={`preview-${request.key}`}
            userRequest={request}
            width={width}
            height={height}
            radius={radius}
          />
        ))}

        <HashRingTooltip
          visible={tooltip.visible}
          x={tooltip.x}
          y={tooltip.y}
          content={tooltip.content}
          width={width}
          height={height}
        />

        <HashRingOrigin width={width} height={height} />
        <HashRingRadialLines width={width} height={height} />
      </svg>
    </div>
  );
}
