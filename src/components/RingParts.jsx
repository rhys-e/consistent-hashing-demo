import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../themes';
import { arcRanges, buildDashPattern } from '../story/ringDash';
import { rangeProgress } from '../story/easing';
import { ringPoint } from '../story/projection';
import { toHashLabel } from '../story/hashSpace';

/**
 * The parts a ring scene is drawn from: the band, a server on it, a key inside it.
 *
 * Shared rather than copied, because Scene 2 and Scene 3 are consecutive slides
 * showing the same ring and the seam between them is the whole point of running
 * them in that order. Two copies of this drift — a radius here, an inset there —
 * and the continuity the scenes depend on has to be maintained by hand instead of
 * being structural. It is the same argument that merged the opening two scenes.
 *
 * Everything takes its geometry from `LAYOUT` and its timing from functions the
 * caller supplies, so a part knows how to draw itself and nothing about when.
 */

/**
 * The ring sits left of centre to leave the share panel a column, which is the
 * same composition the full-scale scenes use — a viewer arriving from one of them
 * finds the ring where they left it.
 */
export const LAYOUT = {
  centreX: 392,
  centreY: 310,
  radius: 232,
  panel: { x: 760, y: 185, width: 300 },
  annotation: { x: 760, y: 420, width: 300 },
};

const ARC_WIDTH = 12;
/**
 * Arcs are flat, everywhere, and that is the whole rule.
 *
 * They were once drawn brightest at the owning server and falling away behind it,
 * which stated the one thing a uniform band cannot: that a range *ends* at its
 * server and begins at the one before. It reads beautifully on three arcs. It does
 * not survive thirty — a fade needs room to be a gradient, and in fifty pixels it
 * is an edge, so the dark tail of one arc against the bright head of the next reads
 * as a gap and a fully owned ring looks broken.
 *
 * Two ways out were tried and both were worse than flatness. Switching the fade off
 * partway through Scene 4 left the story with two treatments and no event to
 * explain the change. Scaling how far the fade falls to how much room it had kept
 * one rule, but produced arcs at every alpha between a quarter and solid on the
 * same ring, which is a third thing to look at rather than a subtler version of the
 * first.
 *
 * The direction the fade existed to state is taught by *movement* instead, and
 * always was: Scene 2 sweeps every arc backwards from its server to the position
 * before it, which is the ownership rule performed rather than shaded. A still
 * frame does not have to carry it.
 *
 * `fade` is kept for the Storybook comparison that settled this, and for nothing
 * else. No scene passes it.
 */
const ARC_BANDS = 8;
const ARC_BAND_ALPHA = 0.26;
/**
 * A server is a node straddling the band, ringed in the background colour.
 *
 * Two earlier attempts are worth recording, because the second looked like the fix
 * and was not. A dot *narrower* than the band leaves slivers of arc above and
 * below it that trace its outline, so it reads as a bead resting on the ring
 * rather than as part of it. Running the arc forward to cover that outline then
 * pushes colour past the boundary tick — trading a subtle wrongness for a
 * misstatement, since the whole scene is about exactly where boundaries fall.
 *
 * So the node is drawn *proud* of the band instead. Its outline is deliberate
 * rather than incidental, and the dark ring separates the two arcs that meet under
 * it. It also gives the story a grammar: round and on the ring is a server,
 * angular and inside it is a key.
 *
 * **One size, in every scene.** It was shrunk once where positions were dense, to
 * buy room a hashed ring does not have to give — see `placedRing`, which buys the
 * room by placing the positions instead. The shrunken dot read as a smudge and cost
 * the picture the one mark the story had taught.
 */
const MARKER = { labelGap: 30, hashGap: 13, dot: 8.5, outline: 3 };
/**
 * Keys ride inside the band with a stem back to it, so a key reads as a *position*
 * — the thing the ring is made of — rather than as a bead threaded on it.
 */
/**
 * `labelGap` is kept tight on purpose, close enough that a name reads as belonging
 * to its own key rather than to the ring of names.
 *
 * The cost is that where the radius runs horizontally a centred label reaches
 * sideways towards its own mark, and the longest of them very nearly touches it.
 * Widening the gap fixes that and loosens every label from its key to do it, which
 * is the worse trade.
 */
const KEY = { inset: 34, size: 5.5, labelGap: 34 };

/** How far inside the band a settled key sits, for a scene that animates it. */
export const KEY_INSET = KEY.inset;
/**
 * The shortest arc that is drawn, in position units — about three pixels here.
 *
 * A sweep growing from nothing passes through lengths far below a pixel, and a
 * renderer handed one of those has no tangent to orient the stroke by and draws a
 * disc the width of it instead. `ringDash` refuses to emit such a range at all,
 * which leaves the other half of the problem: a circle with no dash array is a
 * *solid* one, so an arc that owns nothing would draw the entire ring. Below this
 * length the arc is drawn at this length and hidden, so neither case can arise.
 */
const MIN_DRAW = 0.002;
/**
 * Below this length an arc fades, so that it is gone before it reaches the length
 * it can no longer honestly shrink past.
 *
 * `MIN_DRAW` stops a vanishing arc becoming a degenerate mark, but on its own it
 * turns the last of a shrink into a stall: the arc wipes down to a three-pixel
 * sliver, sits there at full strength while the number keeps falling, and then
 * pops out when it finally hits zero. Six of those going at once — a server with
 * six positions failing — reads as a glitch rather than as a server leaving.
 *
 * Fading over the last few pixels of the shrink covers the clamp entirely, and it
 * does the same favour in the other direction: a sweep growing from nothing now
 * fades up instead of popping a stub into view at full opacity.
 *
 * It has to be measured against the arc's *own* span, not as an absolute length.
 * Fading everything shorter than a fixed number dims the ranges that are simply
 * small — at six positions per server several genuinely are — and a range drawn
 * faint because it is short is the drawing lying about ownership. So this is a
 * ceiling on the fade, and a short arc fades over the last half of itself instead.
 */
const FADE_BELOW = MIN_DRAW * 5;

/**
 * A server's ownership, brightest at its own position and falling away behind it.
 *
 * Drawn as a dashed circle rather than an arc path: the dash lives in position
 * units on a `pathLength="1"` circle, so a sweep is a change to one number rather
 * than a rebuilt path. It is the same device the full-scale lanes use, which is
 * what lets a viewer carry the reading from one scene into the other.
 */
export function OwnershipArc({
  progress,
  endsAt,
  color,
  lengthFor,
  fullLength,
  opacityFor,
  fade = false,
  layer,
}) {
  const vanishBelow = Math.min(FADE_BELOW, (fullLength ?? FADE_BELOW) / 2);
  const bands = Array.from({ length: ARC_BANDS }, (unused, index) => (index + 1) / ARC_BANDS);
  const opacity = useTransform(
    progress,
    latest => rangeProgress(lengthFor(latest), 0, vanishBelow) * (opacityFor?.(latest) ?? 1)
  );

  return (
    <motion.g data-layer={layer} style={{ opacity }}>
      {(fade ? bands : [1]).map(fraction => (
        <ArcBand
          key={fraction}
          progress={progress}
          endsAt={endsAt}
          color={color}
          lengthFor={latest => Math.max(MIN_DRAW, lengthFor(latest) * fraction)}
          alpha={fade ? ARC_BAND_ALPHA : 1}
        />
      ))}
    </motion.g>
  );
}

function ArcBand({ progress, endsAt, color, lengthFor, alpha }) {
  const pattern = latest => buildDashPattern(arcRanges(endsAt, lengthFor(latest)));
  const dashArray = useTransform(progress, latest => pattern(latest)?.dashArray);
  const dashOffset = useTransform(progress, latest => pattern(latest)?.dashOffset);
  const bandOpacity = alpha;

  return (
    <motion.circle
      cx={LAYOUT.centreX}
      cy={LAYOUT.centreY}
      r={LAYOUT.radius}
      pathLength="1"
      fill="none"
      stroke={color}
      strokeWidth={ARC_WIDTH}
      strokeOpacity={bandOpacity}
      strokeDasharray={dashArray}
      strokeDashoffset={dashOffset}
    />
  );
}

/**
 * A server on the ring: a dot straddling the band, and its name outside.
 *
 * There is one dot, at one size, in every scene that draws one — see `MARKER`.
 */
export function ServerMarker({
  progress,
  server,
  position,
  presenceFor,
  waverFor,
  scaleFor,
  namedFor,
  layer,
}) {
  const on = ringPoint({ ...LAYOUT, radius: LAYOUT.radius, position });
  const label = ringPoint({
    ...LAYOUT,
    radius: LAYOUT.radius + MARKER.labelGap,
    position,
  });

  const presence = useTransform(progress, presenceFor);
  /**
   * A node shrinks as a server acquires more of them.
   *
   * Kept at one for every scene the story now draws, because `placedRing` clears
   * the crowding at the source. It stays available because a scene that ever does
   * put more positions on the ring than there is room for should shrink the mark
   * rather than overlap it.
   */
  const dotRadius = useTransform(
    progress,
    latest => MARKER.dot * presenceFor(latest) * (scaleFor?.(latest) ?? 1)
  );
  // The waver is a failing server's own signal, so it flickers the marker without
  // touching anything else on the ring.
  // A name is a separate question from a node: eighteen of them cannot be labelled,
  // so a dense scene keeps its names in the panel and lets the ring go quiet.
  const flicker = useTransform(
    progress,
    latest =>
      Math.max(0, presenceFor(latest) - (waverFor?.(latest) ?? 0) * 0.75) *
      (namedFor?.(latest) ?? 1)
  );
  // Names sit outside the ring, and which side of the anchor they fall on depends
  // on which side of the ring they are: a name on the left has to read outwards to
  // the left, or it runs back across the arc it names.
  const anchor =
    label.x < LAYOUT.centreX - 12 ? 'end' : label.x > LAYOUT.centreX + 12 ? 'start' : 'middle';
  // The dark ring around a node separates two arcs meeting under it. Kept in
  // proportion, or at micro size it is all outline and no node.
  const outline = useTransform(dotRadius, latest =>
    Math.min(MARKER.outline, (latest / MARKER.dot) * MARKER.outline + 0.5)
  );

  return (
    <motion.g data-layer={layer} style={{ opacity: presence }}>
      <motion.circle
        cx={on.x}
        cy={on.y}
        r={dotRadius}
        fill={server.color}
        stroke={theme.colors.ui.background}
        strokeWidth={outline}
      />
      {/* The name, and under it the position it hashed to.
          A server is on this ring for the same reason a key is — it hashed here —
          and that is the easiest thing in the story to stop believing once the
          ring starts looking like a diagram of machines. The value is set small
          and dim on purpose: it is there to be noticed, not read. */}
      <motion.g style={{ opacity: flicker }}>
        <text
          x={label.x}
          y={label.y + 4}
          textAnchor={anchor}
          fill={server.color}
          fontSize="13"
          letterSpacing="0.8"
        >
          {server.id}
        </text>
        <text
          x={label.x}
          y={label.y + 4 + MARKER.hashGap}
          textAnchor={anchor}
          fill={theme.colors.ui.border}
          fontSize="10"
          letterSpacing="0.6"
        >
          {toHashLabel(position)}
        </text>
      </motion.g>
    </motion.g>
  );
}

/**
 * A key: a diamond inside the ring on a stem back to its own position.
 *
 * Three things had to be true of it. It has to read as a *position* rather than as
 * a bead threaded on the ring, which is what the stem is for. It has to be
 * distinguishable from a server, which is what the shape is for — servers are
 * round and sit on the ring, keys are angular and sit inside it. And it has to
 * stay legible against an arc of its own colour, which is what the dark outline is
 * for; a same-coloured halo, which is what this had first, did the opposite.
 */
export function KeyMark({ progress, sampleKey, colorFor, presenceFor, labelFor, insetFor, layer }) {
  /**
   * How far inside the band the key sits, which is a *scene* decision rather than
   * a fixed property of a key.
   *
   * Scene 1 draws keys on the line itself, which is the better picture of "hashing
   * is positioning". They have to move inside once servers arrive, because the
   * band stops being a number line and becomes ownership — so the offset animates,
   * and the stem grows out of it rather than appearing beside it.
   */
  const insetAt = latest => insetFor?.(latest) ?? KEY.inset;
  const pointAt = (latest, inward = 0) =>
    ringPoint({
      ...LAYOUT,
      radius: LAYOUT.radius - insetAt(latest) - inward,
      position: sampleKey.position,
    });

  // The stem reaches the inner edge of the ownership band, so the key is joined to
  // the exact position it hashed to rather than floating near it.
  const stemEnd = ringPoint({
    ...LAYOUT,
    radius: LAYOUT.radius - ARC_WIDTH / 2,
    position: sampleKey.position,
  });

  const presence = useTransform(progress, presenceFor);
  // The diamond is drawn from its own points rather than rotated into shape: an
  // SVG element's transform origin is not the place a CSS length says it is, and a
  // rotation about the wrong point moves the mark instead of turning it.
  const points = useTransform(progress, latest => {
    const at = pointAt(latest);
    const size = KEY.size * presenceFor(latest);
    return [
      [at.x, at.y - size],
      [at.x + size, at.y],
      [at.x, at.y + size],
      [at.x - size, at.y],
    ]
      .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
      .join(' ');
  });
  const markX = useTransform(progress, latest => pointAt(latest).x);
  const markY = useTransform(progress, latest => pointAt(latest).y);
  const labelX = useTransform(progress, latest => pointAt(latest, KEY.labelGap).x);
  const labelY = useTransform(progress, latest => pointAt(latest, KEY.labelGap).y + 4);
  // No stem while the key is still on the band: there is nothing for it to span.
  const stemOpacity = useTransform(progress, latest =>
    Math.min(1, (insetAt(latest) / KEY.inset) * 0.4)
  );

  // Colour is not something a motion value can drive out of render, and it changes
  // only as the absorbing arc passes over the key — see `keyColorAt`.
  const [color, setColor] = React.useState(() => colorFor(progress.get()));
  React.useEffect(
    () => progress.on('change', latest => setColor(colorFor(latest))),
    [colorFor, progress]
  );

  const labelPresence = useTransform(progress, labelFor ?? (() => 0));
  /**
   * Inside the key on the same radius, centred, on a ring of its own.
   *
   * Every label following the radius means labels separate exactly as their keys
   * do, and the whole set reads as one evenly spaced ring rather than as marks
   * that each solved their own crowding differently. Anchoring by the horizontal
   * component instead — start on the left of the ring, end on the right, centred
   * top and bottom — avoids overlap too, and looks like three rules fighting.
   *
   * The gap is what makes centring safe: it has to clear half a label, because
   * where the radius runs horizontally a centred label would otherwise be drawn
   * straight through its own diamond.
   */
  return (
    <motion.g data-layer={layer} style={{ opacity: presence }}>
      <motion.line
        x1={markX}
        y1={markY}
        x2={stemEnd.x}
        y2={stemEnd.y}
        stroke={color}
        strokeWidth="1"
        style={{ opacity: stemOpacity }}
      />
      <motion.text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        fill={color}
        // A step down from the server names, which buys back the clearance the
        // tight label gap costs where the radius runs horizontally — and says
        // these are the smaller of the two things named on the ring.
        fontSize="10"
        letterSpacing="0.6"
        style={{ opacity: labelPresence }}
      >
        {sampleKey.name}
      </motion.text>
      {/* A dark outline, because the fill is the owner's colour and it is sitting
          against that owner's arc. A same-coloured halo, which this had first, did
          the opposite of separating them. */}
      <motion.polygon
        points={points}
        fill={color}
        stroke={theme.colors.ui.background}
        strokeWidth="1.5"
      />
    </motion.g>
  );
}

/**
 * One circle per server, whatever the position count.
 *
 * The story's other ring scenes draw an arc per *position*, which is affordable
 * at three and at thirty and is not at five hundred. A `pathLength="1"` circle
 * with the server's ranges as its dash pattern is the same picture in one
 * element, which is the device the full-scale scenes use and the only reason
 * this one can be dragged up to four thousand positions without thinking about
 * it.
 */
const RING_WIDTH = 13;

export function ServerRing({ ranges, color, opacity }) {
  const pattern = React.useMemo(() => buildDashPattern(ranges), [ranges]);
  if (!pattern) return null;

  return (
    <motion.circle
      cx={LAYOUT.centreX}
      cy={LAYOUT.centreY}
      r={LAYOUT.radius}
      pathLength="1"
      fill="none"
      stroke={color}
      strokeWidth={RING_WIDTH}
      strokeDasharray={pattern.dashArray}
      strokeDashoffset={pattern.dashOffset}
      style={{ opacity }}
    />
  );
}
