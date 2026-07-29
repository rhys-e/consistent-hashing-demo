import React from 'react';
import theme from '../../themes';
import { ringArcPath, ringPoint } from '../../story/projection';
import { colorsById } from '../../story/topology';
import ServerLoadPanel from './ServerLoadPanel';

const palette = {
  ring: theme.colors.primary.cyberBlue,
  label: theme.colors.ui.text.secondary,
  bright: theme.colors.ui.text.bright,
};

const LAYOUT = {
  centreX: 392,
  centreY: 310,
  referenceRadius: 254,
  highlightRadius: 240,
  band: { outer: 224, inner: 96 },
  panel: { x: 760, y: 150, width: 300 },
};

/**
 * Treatment 6A: one thin lane per server, each carrying that server's own ranges.
 *
 * The claim it makes is the one that survives at scale: every server is
 * everywhere, and the ink in a lane is its share. Nothing is coloured by "who
 * owns this slice of the ring", so there is no point at which the picture states
 * something the data does not support.
 */
export function FullScaleLanes({ model, showRemap = false }) {
  const { topology, shares, remap } = model;
  const { centreX, centreY, band } = LAYOUT;
  const colors = colorsById(topology.servers);

  const laneStep = (band.outer - band.inner) / topology.servers.length;
  const laneWidth = laneStep * 0.56;

  const lanes = topology.servers.map((server, index) => ({
    ...server,
    radius: band.outer - index * laneStep,
    ranges: topology.ranges.filter(range => range.serverId === server.id),
  }));

  const seam = ringPoint({ ...LAYOUT, radius: LAYOUT.referenceRadius, position: 0 });
  const dimmed = showRemap && remap;

  return (
    <g>
      <circle
        cx={centreX}
        cy={centreY}
        r={LAYOUT.referenceRadius}
        fill="none"
        stroke={palette.ring}
        strokeWidth="1.25"
        opacity="0.35"
      />
      <line
        x1={seam.x}
        y1={seam.y - 9}
        x2={seam.x}
        y2={seam.y + 9}
        stroke={palette.bright}
        strokeWidth="1.25"
        opacity="0.6"
      />
      <text
        x={seam.x}
        y={seam.y + 28}
        fill={palette.label}
        fontSize="11"
        textAnchor="middle"
        letterSpacing="1.6"
      >
        0x00000000
      </text>

      {lanes.map(lane => (
        <g key={lane.id} opacity={dimmed && lane.id !== remap.serverId ? 0.22 : 1}>
          {/* The empty track is half the statement: it shows how much of the ring
              this server does not own, so a lane reads as a proportion. */}
          <circle
            cx={centreX}
            cy={centreY}
            r={lane.radius}
            fill="none"
            stroke={lane.color}
            strokeWidth={laneWidth}
            opacity="0.09"
          />
          <path
            d={lane.ranges
              .map(range =>
                ringArcPath({ ...LAYOUT, radius: lane.radius, from: range.from, to: range.to })
              )
              .join(' ')}
            fill="none"
            stroke={lane.color}
            strokeWidth={laneWidth}
            strokeLinecap="butt"
            opacity="0.92"
          />
        </g>
      ))}

      {showRemap && remap ? (
        <path
          d={remap.ranges
            .map(range =>
              ringArcPath({
                ...LAYOUT,
                radius: LAYOUT.highlightRadius,
                from: range.from,
                to: range.to,
              })
            )
            .join(' ')}
          fill="none"
          stroke={colors.get(remap.serverId) ?? palette.bright}
          strokeWidth="10"
          strokeLinecap="butt"
        />
      ) : null}

      <ServerLoadPanel {...LAYOUT.panel} shares={shares} remap={showRemap ? remap : null} />
    </g>
  );
}

export default FullScaleLanes;
