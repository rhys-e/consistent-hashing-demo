import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../../themes';
import { buildArcPath, projectOffset, projectPosition } from '../../story/projection';
import { mix } from '../../story/easing';
import { STAGE } from '../../story/stage';

/**
 * The drawing layers of the hash space, shared by every scene that renders it.
 *
 * Each layer positions itself through `projection`, so the same components draw
 * a number line at bend 0 and a ring at bend 1. That is what makes "the ring is
 * the same line, wrapped" true of the code and not just of the narration: Scene 1
 * opening on the straight rail is pixel-identical to the state Scene 0 ends in,
 * because it is the same layers at bend 0.
 *
 * Every layer takes the scene's `progress` motion value plus pure functions of it.
 * A scene therefore expresses timing ("this fades in over these beats") without a
 * layer knowing anything about beats, and nothing here re-renders per frame.
 */

export const palette = {
  railEdge: theme.colors.primary.cyberBlue,
  railCore: theme.colors.ui.text.primary,
  grid: theme.colors.ui.grid,
  label: theme.colors.ui.text.secondary,
  bright: theme.colors.ui.text.bright,
};

const { width, height } = STAGE;
const { annotation, bounds, fontSize, letterSpacing } = STAGE.text;

const always = value => () => value;

/**
 * Monospace advance width. Close enough to place a label clear of the rail, and
 * measuring for real would mean a layout read per frame.
 */
function textWidth(text, size, tracking) {
  return text.length * (size * 0.6 + tracking);
}

function useProjectedPoint(progress, computePoint) {
  const x = useTransform(progress, latest => computePoint(latest).x);
  const y = useTransform(progress, latest => computePoint(latest).y);

  return { x, y };
}

/**
 * One line of an annotation, `line` counting outwards from the rail.
 *
 * The line sits at the annotation's anchor distance along the normal, offset
 * vertically from it, and stays unrotated so it remains readable all the way
 * round the ring. Unrotated text centred on its anchor would straddle the rail at
 * the ring's sides, so it is pushed a further half its own width outward, scaled
 * by how sideways the normal currently points. `normalX` carries the sign, which
 * makes the push a no-op while the rail is straight.
 */
function annotationLinePoint({ railState, position, side, halfTextWidth, line }) {
  const point = projectPosition({ position, ...railState });
  const radial = side * (annotation.labelAnchor + halfTextWidth);

  return {
    x: point.x + point.normalX * radial,
    y: point.y + point.normalY * side * annotation.labelAnchor - side * line * annotation.lineGap,
  };
}

/**
 * Bounds labels tuck inside the span they mark rather than centring on it, which
 * is a shift along the rail rather than away from it. Once the rail closes, that
 * puts `0` and the maximum on opposite sides of the seam instead of on top of
 * each other, so the join can show both ends of the range meeting.
 */
function boundsLabelPoint({ railState, position, halfTextWidth }) {
  const gap = halfTextWidth + railState.bend * bounds.seamGap;
  // Position 0 tucks forward along the rail, the maximum tucks back, so both sit
  // inside the range they bound. Expressing the tuck as a distance along the rail
  // rather than a shift along the tangent keeps the label at a constant remove
  // from the rail: a tangent is a chord once the rail is curved, so the label
  // would drift into it.
  const inset = (position === 0 ? gap : -gap) / railState.length;

  return projectOffset({ ...railState, position: position + inset, offset: bounds.offset });
}

function buildTicksPath(railState, { major }) {
  const { count, majorEvery, minorLength, majorLength } = STAGE.ticks;
  const segments = [];

  for (let index = 0; index <= count; index++) {
    const isMajor = index % majorEvery === 0;
    if (isMajor !== major) continue;

    const position = index / count;
    const tickLength = isMajor ? majorLength : minorLength;
    const inner = projectOffset({ position, ...railState, offset: -tickLength });
    const outer = projectOffset({ position, ...railState, offset: tickLength });

    segments.push(
      `M ${inner.x.toFixed(2)} ${inner.y.toFixed(2)} L ${outer.x.toFixed(2)} ${outer.y.toFixed(2)}`
    );
  }

  return segments.join(' ');
}

function buildCapsPath(railState) {
  return [0, 1]
    .map(position => {
      const inner = projectOffset({ position, ...railState, offset: -STAGE.capHeight });
      const outer = projectOffset({ position, ...railState, offset: STAGE.capHeight });
      return `M ${inner.x.toFixed(2)} ${inner.y.toFixed(2)} L ${outer.x.toFixed(2)} ${outer.y.toFixed(2)}`;
    })
    .join(' ');
}

/**
 * Filter regions are in user space because a straight rail has a zero-height
 * bounding box, and a percentage region around that collapses to nothing. The
 * glow would vanish at exactly the moment Scene 1 has to match Scene 0.
 */
export function HashSpaceDefs({
  prefix,
  railEndColor = palette.railEdge,
  railEndOpacity = 0.25,
  /**
   * Where the rail's gradient begins and ends, in stage coordinates.
   *
   * It has to be stage coordinates. A gradient with the default
   * `objectBoundingBox` units is measured against the bounding box of whatever
   * references it, and the rail is a *perfectly horizontal line* for the whole of
   * the number-line scene — `M 90 310 L 550 310 L 1010 310`, a box 920 wide and
   * **zero high**. SVG says an element with a degenerate bounding box referencing
   * such a gradient is not rendered, so the rail's core stroke was not drawn at
   * all until the bend gave the box some height, and then appeared at full
   * strength in the frame that did. Everything visible before that was the glow
   * and the scaffold around a line that was not there.
   *
   * In user space the gradient does not care what shape the thing referencing it
   * is. The span is the rail at its straight length, so its two ends land exactly
   * where the fade is meant to be; once it bends it is shorter than this and sits
   * in the middle of the gradient, which is uniform core colour by then anyway.
   */
  railSpan,
}) {
  return (
    <>
      <pattern id={`${prefix}-grid`} width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke={palette.grid} strokeWidth="0.5" />
      </pattern>

      <linearGradient id={`${prefix}-grid-fade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>

      <mask id={`${prefix}-grid-mask`}>
        <rect width={width} height={height} fill={`url(#${prefix}-grid-fade)`} />
      </mask>

      {/* The rail dims towards its ends while it is a line with two ends. As it
          closes, the end stops are brought up to the core so the seam is not a
          dark patch in an otherwise continuous ring. */}
      <linearGradient
        id={`${prefix}-rail`}
        gradientUnits="userSpaceOnUse"
        x1={railSpan.from}
        y1="0"
        x2={railSpan.to}
        y2="0"
      >
        <motion.stop offset="0%" stopColor={railEndColor} stopOpacity={railEndOpacity} />
        <stop offset="20%" stopColor={palette.railCore} stopOpacity="0.85" />
        <stop offset="80%" stopColor={palette.railCore} stopOpacity="0.85" />
        <motion.stop offset="100%" stopColor={railEndColor} stopOpacity={railEndOpacity} />
      </linearGradient>

      <filter
        id={`${prefix}-rail-bloom`}
        filterUnits="userSpaceOnUse"
        x="0"
        y="0"
        width={width}
        height={height}
      >
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0"
          result="softened"
        />
        <feMerge>
          <feMergeNode in="softened" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter
        id={`${prefix}-rail-halo`}
        filterUnits="userSpaceOnUse"
        x="0"
        y="0"
        width={width}
        height={height}
      >
        <feGaussianBlur stdDeviation="8" />
      </filter>
    </>
  );
}

export function BackdropGrid({ prefix }) {
  return (
    <rect
      width={width}
      height={height}
      fill={`url(#${prefix}-grid)`}
      mask={`url(#${prefix}-grid-mask)`}
    />
  );
}

/**
 * `drawnFor` returns the fraction of the rail that exists yet, drawn outward from
 * the midpoint. `haloFor` adds the wider glow the closed ring wants and the
 * number line does not, so it stays at zero while the two scenes have to agree.
 */
export function RailPath({
  prefix,
  progress,
  railStateFor,
  drawnFor = always(1),
  haloFor = always(0),
}) {
  const railPath = useTransform(progress, latest => {
    const railState = railStateFor(latest);
    const drawn = drawnFor(latest);

    return buildArcPath({
      ...railState,
      from: 0.5 - drawn / 2,
      to: 0.5 + drawn / 2,
      segments: Math.max(2, Math.round(220 * railState.bend)),
    });
  });

  const haloOpacity = useTransform(progress, latest => haloFor(latest) * 0.08);
  const bleedOpacity = useTransform(progress, latest => haloFor(latest) * 0.18);

  return (
    <g>
      <motion.path
        data-layer="rail-halo"
        d={railPath}
        fill="none"
        stroke={palette.railEdge}
        strokeWidth="18"
        strokeLinecap="round"
        style={{ opacity: haloOpacity }}
        filter={`url(#${prefix}-rail-halo)`}
      />
      <motion.path
        data-layer="rail-bleed"
        d={railPath}
        fill="none"
        stroke={palette.railEdge}
        strokeWidth="5"
        strokeLinecap="round"
        style={{ opacity: bleedOpacity }}
      />
      <motion.path
        data-layer="rail-glow"
        d={railPath}
        fill="none"
        stroke={palette.railEdge}
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.07"
      />
      <motion.path
        data-layer="rail-core"
        d={railPath}
        fill="none"
        stroke={`url(#${prefix}-rail)`}
        strokeWidth="2.25"
        strokeLinecap="round"
        filter={`url(#${prefix}-rail-bloom)`}
      />
    </g>
  );
}

/** Ticks and end caps: the measuring marks that make the rail read as a range. */
export function RailScaffold({ progress, railStateFor, opacityFor = always(1) }) {
  const minorTicks = useTransform(progress, latest =>
    buildTicksPath(railStateFor(latest), { major: false })
  );
  const majorTicks = useTransform(progress, latest =>
    buildTicksPath(railStateFor(latest), { major: true })
  );
  const caps = useTransform(progress, latest => buildCapsPath(railStateFor(latest)));
  const opacity = useTransform(progress, latest => opacityFor(latest));

  return (
    <motion.g data-layer="scaffold" style={{ opacity }}>
      <motion.path
        data-layer="ticks-minor"
        d={minorTicks}
        fill="none"
        stroke={palette.railCore}
        strokeWidth="0.75"
        opacity="0.14"
      />
      <motion.path
        data-layer="ticks-major"
        d={majorTicks}
        fill="none"
        stroke={palette.railCore}
        strokeWidth="0.75"
        opacity="0.3"
      />
      <motion.path
        data-layer="rail-caps"
        d={caps}
        fill="none"
        stroke={palette.railCore}
        strokeWidth="1.25"
        opacity="0.55"
      />
    </motion.g>
  );
}

export function BoundsLabel({ progress, railStateFor, position, label, opacityFor = always(1) }) {
  const halfTextWidth = textWidth(label, fontSize.bounds, letterSpacing.bounds) / 2;

  const point = useProjectedPoint(progress, latest =>
    boundsLabelPoint({ railState: railStateFor(latest), position, halfTextWidth })
  );
  const opacity = useTransform(progress, latest => opacityFor(latest));

  return (
    <motion.text
      data-layer="bounds-label"
      data-position={position}
      x={point.x}
      y={point.y}
      style={{ opacity }}
      fill={palette.label}
      fontSize={fontSize.bounds}
      textAnchor="middle"
      dominantBaseline="middle"
      letterSpacing={letterSpacing.bounds}
    >
      {label}
    </motion.text>
  );
}

/** The settled key: a tick on the rail once its position is known. */
export function KeyMarker({
  progress,
  railStateFor,
  sampleKey,
  scaleFor = always(1),
  opacityFor = always(1),
}) {
  const { position, color } = sampleKey;

  const point = useProjectedPoint(progress, latest =>
    projectPosition({ position, ...railStateFor(latest) })
  );
  const opacity = useTransform(progress, opacityFor);
  const haloRadius = useTransform(progress, latest => Math.max(0, scaleFor(latest) * 14));
  const midRadius = useTransform(progress, latest => Math.max(0, scaleFor(latest) * 8));
  const coreRadius = useTransform(progress, latest => Math.max(0, scaleFor(latest) * 4));

  return (
    <motion.g data-layer="key-marker" data-key={sampleKey.slug} style={{ opacity }}>
      <motion.circle
        data-layer="marker-halo"
        cx={point.x}
        cy={point.y}
        r={haloRadius}
        fill={color}
        opacity="0.1"
      />
      <motion.circle
        data-layer="marker-mid"
        cx={point.x}
        cy={point.y}
        r={midRadius}
        fill={color}
        opacity="0.22"
      />
      <motion.circle
        data-layer="marker-core"
        cx={point.x}
        cy={point.y}
        r={coreRadius}
        fill={color}
      />
    </motion.g>
  );
}

/**
 * Key name and hashed position, on a stem that grows from the label towards the
 * rail. Keys alternate sides so their labels never collide, which on the ring
 * becomes alternating outside and inside.
 *
 * `hashText` is passed in rather than derived because Scene 0 decodes it one
 * glyph at a time, and that is text mutation rather than an animated attribute.
 */
export function KeyAnnotation({
  progress,
  railStateFor,
  sampleKey,
  hashText,
  opacityFor = always(1),
  stemFor = always(1),
}) {
  const { keyName, position, color, side } = sampleKey;
  const halfKeyWidth = textWidth(keyName, fontSize.key, letterSpacing.key) / 2;
  const halfHashWidth = textWidth(hashText || '', fontSize.hash, letterSpacing.hash) / 2;

  const stemOuter = useProjectedPoint(progress, latest =>
    projectOffset({ position, ...railStateFor(latest), offset: side * annotation.stemOuter })
  );
  // The stem grows from its outer end towards the rail, so the annotation reads
  // as reaching for the position rather than sprouting from it.
  const stemInner = useProjectedPoint(progress, latest =>
    projectOffset({
      position,
      ...railStateFor(latest),
      offset: side * mix(annotation.stemOuter, annotation.stemInner, stemFor(latest)),
    })
  );

  const hashPoint = useProjectedPoint(progress, latest =>
    annotationLinePoint({
      railState: railStateFor(latest),
      position,
      side,
      halfTextWidth: halfHashWidth,
      line: -1,
    })
  );
  const keyPoint = useProjectedPoint(progress, latest =>
    annotationLinePoint({
      railState: railStateFor(latest),
      position,
      side,
      halfTextWidth: halfKeyWidth,
      line: 1,
    })
  );

  const opacity = useTransform(progress, latest => opacityFor(latest));

  return (
    <motion.g data-layer="key-annotation" data-key={sampleKey.slug} style={{ opacity }}>
      <motion.line
        data-layer="stem-glow"
        x1={stemOuter.x}
        y1={stemOuter.y}
        x2={stemInner.x}
        y2={stemInner.y}
        stroke={color}
        strokeWidth="3"
        opacity="0.06"
      />
      <motion.line
        data-layer="stem"
        x1={stemOuter.x}
        y1={stemOuter.y}
        x2={stemInner.x}
        y2={stemInner.y}
        stroke={color}
        strokeWidth="1"
        opacity="0.4"
      />
      <motion.text
        data-layer="key-name"
        x={keyPoint.x}
        y={keyPoint.y}
        fill={color}
        fontSize={fontSize.key}
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing={letterSpacing.key}
      >
        {keyName}
      </motion.text>
      <motion.text
        data-layer="key-hash"
        x={hashPoint.x}
        y={hashPoint.y}
        fill={palette.label}
        fontSize={fontSize.hash}
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing={letterSpacing.hash}
      >
        {hashText}
      </motion.text>
    </motion.g>
  );
}
