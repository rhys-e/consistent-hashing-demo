import React from 'react';
import theme from '../../themes';
import { ringArcPath, ringPoint } from '../../story/projection';
import { colorsById } from '../../story/topology';
import { STAGE } from '../../story/stage';
import ServerLoadPanel from './ServerLoadPanel';

const palette = {
  ring: theme.colors.primary.cyberBlue,
  label: theme.colors.ui.text.secondary,
  bright: theme.colors.ui.text.bright,
  rail: theme.colors.ui.text.primary,
};

const LAYOUT = {
  centreX: 390,
  centreY: 185,
  radius: 108,
  ringWidth: 14,
  strip: { x: 60, y: 366, width: 660, height: 86 },
  panel: { x: 760, y: 150, width: 300 },
};

/**
 * Inside the strip, a highlighted range keeps its true width, because the strip
 * is where area means share. Padding each sliver to a legible 1.5px was the first
 * thing tried and it is exactly the lie the plan warns about: it paints a third
 * of the strip to state a claim of an eighth.
 *
 * Findability is handled by a separate marker rail above the strip, where a mark
 * is allowed a minimum width because that rail only claims "one here".
 */
const MARKER = { height: 6, gap: 5, minWidth: 1 };

const stripX = position => LAYOUT.strip.x + position * LAYOUT.strip.width;

function stripeSubpath(range) {
  const { y, height } = LAYOUT.strip;
  const from = stripX(range.from);
  const width = (range.to - range.from) * LAYOUT.strip.width;

  return `M ${from.toFixed(2)} ${y} h ${width.toFixed(2)} v ${height} h ${(-width).toFixed(2)} Z`;
}

function markerSubpath(range) {
  const y = LAYOUT.strip.y - MARKER.gap - MARKER.height;
  const from = stripX(range.from);
  const width = Math.max(MARKER.minWidth, (range.to - range.from) * LAYOUT.strip.width);

  return `M ${from.toFixed(2)} ${y} h ${width.toFixed(2)} v ${MARKER.height} h ${(-width).toFixed(2)} Z`;
}

/**
 * Treatment 6C: the ring unrolled into a strip, ownership as fine stripes.
 *
 * The argument for it is that the viewer already met this shape in Scene 0, and
 * that a straight run of the hash space gives every range the same width budget,
 * where an arc spends most of its length on whichever side of the ring the eye is
 * not on. The ring stays above it, deliberately too dense to read, so the strip
 * reads as the same data at a usable resolution rather than as a different claim.
 */
export function FullScaleStrip({ model, showRemap = false }) {
  const { topology, shares, remap } = model;
  const { centreX, centreY, radius, strip } = LAYOUT;
  const colors = colorsById(topology.servers);

  const byServer = topology.servers.map(server => ({
    ...server,
    ranges: topology.ranges.filter(range => range.serverId === server.id),
  }));

  const seam = ringPoint({ centreX, centreY, radius, position: 0 });
  const dimmed = showRemap && remap;
  const highlightColor = remap ? (colors.get(remap.serverId) ?? palette.bright) : palette.bright;

  return (
    <g>
      {byServer.map(server => (
        <g key={server.id} opacity={dimmed && server.id !== remap.serverId ? 0.25 : 1}>
          <path
            d={server.ranges
              .map(range =>
                ringArcPath({ centreX, centreY, radius, from: range.from, to: range.to })
              )
              .join(' ')}
            fill="none"
            stroke={server.color}
            strokeWidth={LAYOUT.ringWidth}
            strokeLinecap="butt"
            opacity="0.9"
          />
          <path d={server.ranges.map(stripeSubpath).join(' ')} fill={server.color} />
        </g>
      ))}

      {/* The cut: where the strip's two ends were joined a moment ago. */}
      <path
        d={`M ${seam.x} ${seam.y} L ${strip.x} ${strip.y} M ${seam.x} ${seam.y} L ${strip.x + strip.width} ${strip.y}`}
        stroke={palette.ring}
        strokeWidth="1"
        strokeDasharray="3 5"
        opacity="0.4"
        fill="none"
      />
      <circle cx={seam.x} cy={seam.y} r="3.5" fill={palette.bright} opacity="0.8" />

      <rect
        x={strip.x}
        y={strip.y}
        width={strip.width}
        height={strip.height}
        fill="none"
        stroke={palette.ring}
        strokeWidth="1"
        opacity="0.45"
      />

      {showRemap && remap ? (
        <>
          <path d={remap.ranges.map(stripeSubpath).join(' ')} fill={highlightColor} />
          <path
            d={remap.ranges.map(markerSubpath).join(' ')}
            fill={highlightColor}
            opacity="0.85"
          />
          <text
            x={strip.x}
            y={strip.y - MARKER.gap - MARKER.height - 8}
            fill={palette.label}
            fontSize="10"
            letterSpacing="1.6"
          >
            RANGES TAKEN OVER
          </text>
        </>
      ) : null}

      {/* Ticks and bounds echo Scene 0, because this is that rail again. */}
      {Array.from({ length: STAGE.ticks.count + 1 }).map((_, index) => {
        const isMajor = index % STAGE.ticks.majorEvery === 0;

        return (
          <line
            key={index}
            x1={stripX(index / STAGE.ticks.count)}
            y1={strip.y + strip.height}
            x2={stripX(index / STAGE.ticks.count)}
            y2={strip.y + strip.height + (isMajor ? 10 : 5)}
            stroke={palette.rail}
            strokeWidth="0.75"
            opacity={isMajor ? 0.35 : 0.16}
          />
        );
      })}

      <text
        x={strip.x}
        y={strip.y + strip.height + 30}
        fill={palette.label}
        fontSize="12"
        letterSpacing="1.8"
      >
        0x00000000
      </text>
      <text
        x={strip.x + strip.width}
        y={strip.y + strip.height + 30}
        fill={palette.label}
        fontSize="12"
        textAnchor="end"
        letterSpacing="1.8"
      >
        0xFFFFFFFF
      </text>

      <ServerLoadPanel {...LAYOUT.panel} shares={shares} remap={showRemap ? remap : null} />
    </g>
  );
}

export default FullScaleStrip;
