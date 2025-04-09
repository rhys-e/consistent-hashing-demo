import React, { useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { angleScale, toXY } from '../utils/geometryUtils';
import theme from '../themes';
import { useExecutionStatus, EXECUTION_STATES } from '../hooks/useExecutionStatus';

const sortNodes = nodeMap => {
  return Object.values(nodeMap)
    .slice()
    .sort((a, b) => a.position - b.position);
};

export function HashRingVisualisation({
  ringNodes,
  dimensions,
  pCurPos,
  pRingInitialPos,
  onRemoveServer,
  onAddServerAtPosition,
  hitsToRender,
  collapsedPanels,
  togglePanel,
}) {
  const { getState } = useExecutionStatus();
  const executionStatus = getState();
  const width = dimensions.svgWidth;
  const height = dimensions.svgHeight;
  const radius = dimensions.svgRadius;

  const handleNodeClick = useCallback(
    node => {
      onRemoveServer(node.id);
    },
    [onRemoveServer]
  );

  const segments = useMemo(() => {
    if (!ringNodes || Object.keys(ringNodes).length < 2) return [];

    const segments = [];
    const sortedNodes = sortNodes(ringNodes);

    for (let i = 0; i < sortedNodes.length; i++) {
      const current = sortedNodes[i];
      // The node that owns this segment is the NEXT node clockwise
      const nextNodeIndex = (i + 1) % sortedNodes.length;
      const nextNode = sortedNodes[nextNodeIndex];

      // Calculate if this segment wraps around the circle
      const wrapsAround = nextNode.position < current.position;

      // Get the exact node coordinates
      const [startX, startY] = toXY(current.position, width, height, radius);
      const [endX, endY] = toXY(nextNode.position, width, height, radius);

      // Pre-calculate the arc path data
      const startAngle = angleScale(current.position);
      let endAngle = angleScale(nextNode.position);

      // Handle wrap-around case
      if (wrapsAround) {
        endAngle = angleScale(nextNode.position + 1);
      }

      // Calculate the arc path
      const arcPath = d3
        .arc()
        .innerRadius(radius - theme.hashRing.segment.width / 2)
        .outerRadius(radius + theme.hashRing.segment.width / 2)
        .startAngle(startAngle)
        .endAngle(endAngle)
        .cornerRadius(0)();

      segments.push({
        start: current.position,
        end: nextNode.position,
        wrapsAround: wrapsAround,
        color: nextNode.color,
        id: nextNode.id,
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
        arcPath: arcPath,
      });
    }

    return segments;
  }, [ringNodes, width, height, radius]);

  const nodeElements = useMemo(() => {
    const nodeElements = [];

    if (!ringNodes) return [];

    const serverVnodeCounts = {};
    Object.values(ringNodes).forEach(node => {
      serverVnodeCounts[node.id] = (serverVnodeCounts[node.id] || 0) + 1;
    });

    Object.values(ringNodes).forEach((node, i) => {
      const [x, y] = toXY(node.position, width, height, radius);

      nodeElements.push(
        <circle
          key={`vnode-${node.id}-${i}`}
          cx={x}
          cy={y}
          r={theme.hashRing.node.size}
          fill={node.color}
          stroke={theme.hashRing.node.strokeColor}
          strokeWidth={theme.hashRing.node.strokeWidth}
          filter={Object.keys(ringNodes).length < 50 ? theme.hashRing.node.glowFilter : undefined}
          onClick={() => handleNodeClick(node)}
          onMouseEnter={() =>
            setTooltip({
              visible: true,
              x: x,
              y: y - 20,
              content: `${node.id}: vnode ${node.vnodeIndex + 1} of ${serverVnodeCounts[node.id] || '?'} [${(node.position * 100).toFixed(1)}%]`,
            })
          }
          onMouseLeave={() => setTooltip({ visible: false })}
          className="node-element cursor-pointer"
        />
      );
    });

    return nodeElements;
  }, [width, height, radius, handleNodeClick, ringNodes]);

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: '',
  });

  const handleRingClick = event => {
    if (!onAddServerAtPosition) return;

    // Calculate click position relative to SVG center
    const svgRect = event.currentTarget.getBoundingClientRect();
    const centerX = width / 2;
    const centerY = height / 2;

    const clickX = event.clientX - svgRect.left - centerX;
    const clickY = event.clientY - svgRect.top - centerY;

    // Convert to angle then normalize to [0,1)
    let angle = Math.atan2(clickY, clickX);
    if (angle < 0) angle += 2 * Math.PI;
    const position = angle / (2 * Math.PI);

    onAddServerAtPosition(position);
  };

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

          {segments.map((segment, i) => (
            <radialGradient
              key={`gradient-${i}`}
              id={`segmentGradient-${i}`}
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
          ))}
        </defs>

        {/* background rect with grid */}
        <rect width={width} height={height} fill="url(#ringGradient)" className="ring-bg" />
        <rect width={width} height={height} fill="url(#grid)" className="ring-grid" />

        {/* background circle with gradient */}
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

        {/* boundary markers on segments */}
        {segments.map((segment, i) => (
          <g key={`segment-${i}`} className="segment">
            <path
              d={segment.arcPath}
              transform={`translate(${width / 2}, ${height / 2})`}
              fill={`url(#segmentGradient-${i})`}
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
        ))}

        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke={theme.hashRing.ring.outlineColor}
          strokeWidth={theme.hashRing.ring.outlineWidth}
          style={{ cursor: 'crosshair' }}
          onClick={handleRingClick}
          className="ring-outline"
        />

        {/* Add hash values around the circle */}
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

        {nodeElements}

        {/* Render particles */}
        {pCurPos &&
          pCurPos
            .map((particle, i) => {
              if (particle.phase === 'completed') {
                return null;
              }
              // Check if particle is in initial animation or regular movement
              if (particle.phase === 'initial') {
                return (
                  <circle
                    key={`particle-${i}`}
                    cx={particle.x}
                    cy={particle.y}
                    r={theme.hashRing.particle.size}
                    fill={theme.hashRing.particle.color}
                    stroke={theme.hashRing.particle.strokeColor}
                    strokeWidth={theme.hashRing.particle.strokeWidth}
                    filter="url(#particleGlow)"
                    className="particle-dot animate-particle-blink"
                  />
                );
              } else if (particle.phase === 'ring') {
                // Calculate a point slightly behind the particle for the trail
                const trailLength = theme.hashRing.particle.trailLength || 0.01;
                const trailPos = (particle.pos - trailLength + 1) % 1;
                const [trailX, trailY] = toXY(trailPos, width, height, radius);
                const gradientId = `particleTrailGradient-${i}`;

                return (
                  <React.Fragment key={`particle-fragment-${i}`}>
                    <defs>
                      <linearGradient
                        id={gradientId}
                        gradientUnits="userSpaceOnUse"
                        x1={trailX}
                        y1={trailY}
                        x2={particle.x}
                        y2={particle.y}
                      >
                        <stop
                          offset="0%"
                          stopColor={theme.hashRing.particle.color}
                          stopOpacity="0"
                        />
                        <stop
                          offset="100%"
                          stopColor={theme.hashRing.particle.color}
                          stopOpacity={theme.hashRing.particle.trailOpacity}
                        />
                      </linearGradient>
                    </defs>

                    <g key={`particle-${i}`} className="particle-group">
                      {/* Particle trail with directional gradient */}
                      <line
                        x1={trailX}
                        y1={trailY}
                        x2={particle.x}
                        y2={particle.y}
                        stroke={`url(#${gradientId})`}
                        strokeWidth={theme.hashRing.particle.trailWidth}
                        className="particle-trail animate-particle-blink"
                        style={{
                          opacity: theme.hashRing.particle.trailOpacity,
                        }}
                      />

                      {/* Particle dot */}
                      <circle
                        cx={particle.x}
                        cy={particle.y}
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
            })
            .filter(Boolean)}

        {/* hit effects */}
        {hitsToRender &&
          hitsToRender
            .map((hit, i) => {
              if (hit.expired) return null;
              const [x, y] = toXY(hit.pos, width, height, radius);
              return (
                <g key={`hit-${i}-${hit.completedAt}`} className="hit-effect">
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
                  {/* <circle
                  cx={x}
                  cy={y}
                  r={theme.hashRing.hitEffect.innerDotSize}
                  fill={theme.hashRing.hitEffect.color}
                  opacity={theme.hashRing.hitEffect.innerDotOpacity}
                  className="hit-dot animate-hit-dot-blink"
                /> */}
                </g>
              );
            })
            .filter(Boolean)}

        {/* Preview indicator for next particle */}
        {pRingInitialPos &&
          pRingInitialPos.length > 0 &&
          pRingInitialPos.map(particle => {
            return (
              <g className="preview-indicator" key={`preview-${particle.id}`}>
                <path
                  d={`M ${width / 2} ${height / 2} L ${particle.x} ${particle.y}`}
                  stroke={theme.hashRing.previewIndicator.pathColor}
                  strokeWidth={theme.hashRing.previewIndicator.pathWidth}
                  strokeDasharray={theme.hashRing.previewIndicator.pathDashArray}
                  opacity={theme.hashRing.previewIndicator.opacity}
                  className="preview-path animate-dash"
                />
                <circle
                  cx={particle.x}
                  cy={particle.y}
                  r={theme.hashRing.previewIndicator.dotSize}
                  fill={theme.hashRing.previewIndicator.dotColor}
                  className="preview-dot animate-blink"
                />
              </g>
            );
          })}

        {tooltip.visible && (
          <foreignObject
            x={Math.min(
              Math.max(tooltip.x - theme.hashRing.tooltip.width / 2, 10),
              width - theme.hashRing.tooltip.width - 10
            )}
            y={Math.min(
              Math.max(tooltip.y - theme.hashRing.tooltip.height, 10),
              height - theme.hashRing.tooltip.height - 10
            )}
            width={theme.hashRing.tooltip.width}
            height={theme.hashRing.tooltip.height}
          >
            <div className="absolute flex h-full w-full items-center justify-center rounded-sm border border-tooltip-border bg-tooltip-bg p-1 text-center font-mono text-tooltip-text">
              {tooltip.content}
            </div>
          </foreignObject>
        )}

        <g>
          {/* Central origin point with pulsing effect */}
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

          {/* Central dot */}
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

          {/* Optional: Radial lines for tech effect */}
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

          {/* Origin label */}
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
      </svg>

      {/* Legend */}
      <div
        className="legend"
        style={{
          position: 'absolute',
          bottom: theme.hashRing.legend.bottom,
          right: theme.hashRing.legend.right,
          width: theme.hashRing.legend.width,
          padding: theme.hashRing.legend.padding,
          backgroundColor: theme.hashRing.legend.backgroundColor,
          border: `${theme.hashRing.legend.borderWidth}px solid ${theme.hashRing.legend.borderColor}`,
          borderRadius: theme.hashRing.legend.borderRadius,
          color: theme.hashRing.legend.textColor,
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.hashRing.legend.fontSize,
          zIndex: 10,
          display: collapsedPanels.legend ? 'none' : 'block',
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold">Legend</h3>
          <button onClick={() => togglePanel('legend')} className="text-xs hover:text-blue-400">
            Hide
          </button>
        </div>
        <div className="grid grid-cols-1 gap-1">
          <div className="flex items-center">
            <div
              className="mr-2 h-3 w-3 rounded-full"
              style={{ backgroundColor: theme.hashRing.node.defaultColor }}
            ></div>
            <span>Server Node</span>
          </div>
          <div className="flex items-center">
            <div
              className="mr-2 h-3 w-3 rounded-full"
              style={{ backgroundColor: theme.hashRing.particle.color }}
            ></div>
            <span>Request</span>
          </div>
          <div className="flex items-center">
            <div
              className="mr-2 h-3 w-3 border"
              style={{
                borderColor: theme.hashRing.segment.strokeColor,
                backgroundColor: 'rgba(255,255,255,0.1)',
              }}
            ></div>
            <span>Server Segment</span>
          </div>
          <div className="flex items-center">
            <div
              className="mr-2 h-3 w-3 rounded-full"
              style={{ backgroundColor: theme.hashRing.hitEffect.color }}
            ></div>
            <span>Request Hit</span>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div
        className={`absolute z-10 border border-status-border bg-status-bg font-mono text-status-text ${collapsedPanels.status ? 'hidden' : 'flex'} items-center gap-2`}
        style={{
          top: theme.hashRing.statusIndicator.top,
          right: theme.hashRing.statusIndicator.right,
          padding: theme.hashRing.statusIndicator.padding,
          borderRadius: theme.hashRing.statusIndicator.borderRadius,
        }}
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center">
            <div
              className="mr-2 h-3 w-3 rounded-full"
              style={{
                backgroundColor:
                  executionStatus === EXECUTION_STATES.RUNNING
                    ? theme.hashRing.statusIndicator.activeColor
                    : theme.hashRing.statusIndicator.inactiveColor,
              }}
            ></div>
            <span>{executionStatus === EXECUTION_STATES.RUNNING ? 'Active' : 'Paused'}</span>
          </div>
          <button
            onClick={() => togglePanel('status')}
            className="ml-4 text-xs hover:text-blue-400"
          >
            Hide
          </button>
        </div>
      </div>
    </div>
  );
}
