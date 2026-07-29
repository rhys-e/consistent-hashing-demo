import React from 'react';
import theme from '../../themes';

const palette = {
  label: theme.colors.ui.text.secondary,
  bright: theme.colors.ui.text.bright,
  track: theme.colors.ui.panelBg,
  border: theme.colors.ui.border,
};

const ROW_HEIGHT = 34;
const BAR_HEIGHT = 6;
/** An even share sits here, leaving room either side for a server to be off it. */
const EVEN_MARK = 0.62;

const toPercent = share => `${(share * 100).toFixed(1)}%`;

/**
 * The numbers beside a full-scale view.
 *
 * Both candidate treatments carry the same panel so that judging them is a
 * judgement about the artwork rather than about which one got the better readout.
 * The even-share mark is what turns a bar into a claim: the point is not how much
 * a server owns but how close every server is to the same amount.
 */
export function ServerLoadPanel({ x, y, width, shares, remap }) {
  const barWidth = width - 84;
  const evenShare = 1 / shares.length;
  const scale = (EVEN_MARK * barWidth) / evenShare;

  return (
    <g>
      <text x={x} y={y} fill={palette.label} fontSize="11" letterSpacing="2.4">
        SHARE OF HASH SPACE
      </text>

      <line
        x1={x + barWidth * EVEN_MARK}
        y1={y + 14}
        x2={x + barWidth * EVEN_MARK}
        y2={y + 22 + shares.length * ROW_HEIGHT}
        stroke={palette.border}
        strokeWidth="1"
        strokeDasharray="2 4"
      />

      {shares.map((server, index) => {
        const rowY = y + 34 + index * ROW_HEIGHT;

        return (
          <g key={server.id}>
            <rect x={x} y={rowY - 9} width="9" height="9" fill={server.color} />
            <text x={x + 17} y={rowY} fill={palette.label} fontSize="12" letterSpacing="0.8">
              {server.id}
            </text>
            <rect x={x} y={rowY + 8} width={barWidth} height={BAR_HEIGHT} fill={palette.track} />
            <rect
              x={x}
              y={rowY + 8}
              width={Math.min(barWidth, server.share * scale)}
              height={BAR_HEIGHT}
              fill={server.color}
            />
            <text
              x={x + width}
              y={rowY}
              fill={palette.bright}
              fontSize="12"
              textAnchor="end"
              letterSpacing="0.8"
            >
              {toPercent(server.share)}
            </text>
          </g>
        );
      })}

      <text
        x={x}
        y={y + 34 + shares.length * ROW_HEIGHT + 18}
        fill={palette.label}
        fontSize="11"
        letterSpacing="1.6"
      >
        {`EVEN SHARE ${toPercent(evenShare)}`}
      </text>

      {remap ? (
        <text
          x={x}
          y={y + 34 + shares.length * ROW_HEIGHT + 42}
          fill={palette.bright}
          fontSize="13"
          letterSpacing="1.2"
        >
          {`${toPercent(remap.fraction)} of the space remapped`}
        </text>
      ) : null}
    </g>
  );
}

export default ServerLoadPanel;
