import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../../themes';
import { mix } from '../../story/easing';
import { useAnimatedNumber } from '../../story/useAnimatedNumber';

const palette = {
  label: theme.colors.ui.text.secondary,
  bright: theme.colors.ui.text.bright,
  track: theme.colors.ui.panelBg,
  border: theme.colors.ui.border,
};

const ROW_HEIGHT = 34;
const BAR_HEIGHT = 6;
/**
 * Where an even share sits along the bar, leaving room either side for a server to
 * be off it.
 *
 * A scene whose whole point is one server ending up at twice an even share has to
 * put the mark further left, or the bar that makes the point clamps at the end of
 * its track and the doubling stops being measurable.
 */
const EVEN_MARK = 0.62;

const toPercent = share => `${(share * 100).toFixed(1)}%`;

function ShareRow({
  row,
  index,
  x,
  y,
  width,
  barWidth,
  scale,
  progress,
  settleFor,
  opacityFor,
  shiftFor,
  dataFor,
}) {
  const share = latest => mix(row.from, row.to, settleFor(latest, index));

  const barLength = useTransform(progress, latest => Math.min(barWidth, share(latest) * scale));
  const percent = useAnimatedNumber({ progress, valueFor: share, format: toPercent });
  const opacity = useTransform(progress, latest => opacityFor(latest, index));
  // The bar and the number are the data. The swatch, the name and the empty track
  // are the panel, and the panel is there from the first frame.
  const dataOpacity = useTransform(progress, dataFor);
  // A row that has not joined yet waits off the right-hand edge, so arriving is a
  // move into the list rather than a fade-up in a slot that was already reserved.
  //
  // `x` rather than a `transform` attribute: handed a template string, motion sets
  // the CSS `transform` property, and SVG transform syntax — `translate(44 0)`, no
  // units and no comma — is not valid CSS. It parses as nothing and the row simply
  // appears where it was going to be.
  const shift = useTransform(progress, latest => shiftFor(latest, index));

  return (
    <motion.g data-layer={`row:${row.id}`} style={{ opacity, x: shift }}>
      <rect x={x} y={y - 9} width="9" height="9" fill={row.color} />
      <text x={x + 17} y={y} fill={palette.label} fontSize="12" letterSpacing="0.8">
        {row.id}
      </text>
      <rect x={x} y={y + 8} width={barWidth} height={BAR_HEIGHT} fill={palette.track} />
      <motion.rect
        x={x}
        y={y + 8}
        width={barLength}
        height={BAR_HEIGHT}
        fill={row.color}
        style={{ opacity: dataOpacity }}
      />
      <motion.text
        x={x + width}
        y={y}
        fill={palette.bright}
        fontSize="12"
        textAnchor="end"
        letterSpacing="0.8"
        style={{ opacity: dataOpacity }}
      >
        {percent}
      </motion.text>
    </motion.g>
  );
}

/**
 * The numbers beside a full-scale view.
 *
 * The even-share mark is what turns a bar into a claim: the point is not how much
 * a server owns but how close every server is to the same amount. Bars are driven
 * off the scene timeline so that a topology change is watched settling rather than
 * read afterwards — the metric corroborates the animation instead of replacing it.
 */
export function ServerLoadPanel({
  x,
  y,
  width,
  rows,
  progress,
  settleFor,
  revealFor,
  rowOpacityFor = () => 1,
  rowShiftFor = () => 0,
  remap,
  remapProgressFor,
  remapRevealFor,
  evenMark = EVEN_MARK,
  evenShare: evenShareOverride,
  evenShareFor,
}) {
  const barWidth = width - 84;
  const evenShare = evenShareOverride ?? 1 / rows.length;
  /**
   * The scale is fixed, and only the mark moves.
   *
   * An even share changes when the roster does — lose one of three servers and it
   * goes from a third to a half — and a panel that still says 33.3% afterwards is
   * measuring against a fleet that no longer exists. But deriving the *scale* from
   * it would shorten every bar the moment the mark moved, which reads as everyone
   * losing space when nobody has. So a bar's length always means the same amount
   * of ring, and the reference slides along it.
   */
  const scale = (evenMark * barWidth) / evenShare;
  const shareNow = latest => evenShareFor?.(latest) ?? evenShare;

  const markX = useTransform(progress, latest => x + shareNow(latest) * scale);
  const evenLabel = useAnimatedNumber({
    progress,
    valueFor: shareNow,
    format: value => `EVEN SHARE ${toPercent(value)}`,
  });
  const footerY = y + 34 + rows.length * ROW_HEIGHT;

  const remapOpacity = useTransform(progress, remapRevealFor ?? revealFor);
  const remapped = useAnimatedNumber({
    progress,
    valueFor: latest =>
      remap ? remap.fraction * (remapProgressFor ? remapProgressFor(latest) : 1) : 0,
    format: value => `${toPercent(value)} of the space remapped`,
  });

  return (
    /**
     * No fade on the panel itself.
     *
     * The ring is composed off-centre to leave room for this, so the column has to
     * be occupied from the first frame or the ring reads as pushed out of true.
     * Fading the whole panel up was the first answer and it was worse: a ghost of
     * a panel is a third state to look at, and once a line of commentary appears
     * beneath it at full strength the column is showing two opacities at once.
     *
     * A panel with its headings, names and empty tracks is not a ghost. It is a
     * panel with no numbers in it yet, which is exactly what is true.
     */
    <g>
      <text x={x} y={y} fill={palette.label} fontSize="11" letterSpacing="2.4">
        SHARE OF HASH SPACE
      </text>

      <motion.line
        x1={markX}
        y1={y + 14}
        x2={markX}
        y2={y + 22 + rows.length * ROW_HEIGHT}
        stroke={palette.border}
        strokeWidth="1"
        strokeDasharray="2 4"
      />

      {rows.map((row, index) => (
        <ShareRow
          key={row.id}
          row={row}
          index={index}
          x={x}
          y={y + 34 + index * ROW_HEIGHT}
          width={width}
          barWidth={barWidth}
          scale={scale}
          progress={progress}
          settleFor={settleFor}
          opacityFor={rowOpacityFor}
          shiftFor={rowShiftFor}
          dataFor={revealFor}
        />
      ))}

      <text x={x} y={footerY + 18} fill={palette.label} fontSize="11" letterSpacing="1.6">
        {evenLabel}
      </text>

      {remap ? (
        <motion.text
          x={x}
          y={footerY + 42}
          style={{ opacity: remapOpacity }}
          fill={palette.bright}
          fontSize="13"
          letterSpacing="1.2"
        >
          {remapped}
        </motion.text>
      ) : null}
    </g>
  );
}

export default ServerLoadPanel;
