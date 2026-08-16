import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../themes';
import { easeInOutCubic, mix, pulseProgress, rangeProgress } from '../story/easing';
import { buildDashPattern, windowRanges } from '../story/ringDash';
import { ringPoint } from '../story/projection';
import {
  annotationAt,
  annotationPresenceAt,
  buildSteps,
  createTimeline,
  stepAtRest,
} from '../story/sceneSteps';
import { buildFullScaleModel } from '../story/topology';
import { LAYOUT, ServerRing } from './RingParts';
import SceneAnnotation from './SceneAnnotation';

/**
 * Scene 5: the boundaries are real, and they are everywhere.
 *
 * The scene before this one asserts production density and the scene after it
 * replaces the ring with a summary, which leaves a gap: nothing has shown that
 * the smear on the dense ring is *structure* rather than noise. Magnifying a
 * sliver shows that it is. Sweeping the sliver around shows it is the same
 * wherever you point it, which is the claim the whole full-scale treatment rests
 * on and the one it currently states in a sentence.
 *
 * The magnifier is not new machinery: a window of the ring renormalised to nought
 * and one is the same set of ranges, so the strip is drawn by the dash pattern
 * that draws everything else — on a straight line rather than a circle.
 */

/** One fiftieth. Small enough to be a hairline on the ring, wide enough to read. */
const WINDOW = 0.02;
/** Where the sweep starts and how far it goes: enough of the ring to be a claim. */
const SWEEP = { from: 0.1, to: 0.72 };

/** Aligned with the column everything else in the story puts on the right. */
export const STRIP = { x: LAYOUT.panel.x, y: 292, width: LAYOUT.panel.width, height: 30 };

const OPENING = 1.2;
const CLOSE = { move: 1.4 };
const MAGNIFY = { move: 1.2 };
const PAN = { move: 6 };
const RETRACT = { move: 1.1 };
const REST = 0.5;
/** A beat between the strip landing and the line about it. */
const SETTLE_BEFORE_SPEAKING = 0.7;
const READING_REST = 5;

export function buildZoomTimeline() {
  const timeline = createTimeline({ readingRest: READING_REST });

  const opening = timeline.rest(OPENING, 'The whole ring');

  const close = timeline.move(CLOSE.move);
  timeline.rest(REST, 'One fiftieth of it');

  const magnify = timeline.move(MAGNIFY.move);
  // Said after the strip has arrived, not with it. Two things appearing in the
  // same column at the same moment compete, and the picture should land first.
  timeline.skip(SETTLE_BEFORE_SPEAKING);
  timeline.annotate(
    "This is one small section of the ring, unrolled. Each colour change is a different server's range."
  );
  timeline.rest(READING_REST, 'Magnified');

  const pan = timeline.move(PAN.move);
  // Said in distance, not in duration. "Nobody holds it for long" measures the
  // wrong thing: a viewer reads it as a server letting go after a while, when the
  // claim is about how little of the ring any one of them holds in one piece.
  timeline.annotate(
    'Look anywhere on the ring and the mix is the same. The load is shared evenly across every section.'
  );
  timeline.rest(READING_REST, 'Everywhere the same');

  const retract = timeline.move(RETRACT.move);
  const closing = timeline.rest(REST, 'The whole ring again');

  return {
    opening,
    close,
    magnify,
    pan,
    retract,
    closing: (closing.from + closing.to) / 2,
    rests: timeline.rests(),
    captions: timeline.captions(),
    narrations: timeline.narrations(),
    annotations: timeline.annotations(),
    end: timeline.at(),
  };
}

export const ZOOM_MODEL = buildFullScaleModel({ serverCount: 6, vnodesPerServer: 150 });
export const ZOOM_BEATS = buildZoomTimeline();

export function buildZoomSteps(timeline) {
  return buildSteps(
    timeline.rests.filter(entry => entry.label).map(entry => stepAtRest(entry, entry.label)),
    timeline.end
  );
}

export const ZOOM_STEPS = buildZoomSteps(ZOOM_BEATS);

/** Where the window sits, as a position on the ring. */
export function windowAt(timeline, progressValue) {
  const swept = easeInOutCubic(rangeProgress(progressValue, timeline.pan.from, timeline.pan.to));
  return mix(SWEEP.from, SWEEP.to, swept);
}

/** How wide the calipers are open: full ring, closing, then held on the window. */
const spanAt = (timeline, progressValue) =>
  mix(
    1,
    WINDOW,
    easeInOutCubic(rangeProgress(progressValue, timeline.close.from, timeline.close.to))
  );

/**
 * The strip arrives and stays.
 *
 * It used to fade out with the calipers, which left the scene ending on an empty
 * column and undid the thing the whole scene had just shown. Only the brackets
 * retract; what they found is still worth looking at.
 */
const magnifiedAt = (timeline, progressValue) =>
  easeInOutCubic(rangeProgress(progressValue, timeline.magnify.from, timeline.magnify.to));

/**
 * A server's ranges inside the window, as a dash pattern along a straight line.
 *
 * `pathStart: 0` because a line begins where it begins — the circle's 0.75 is an
 * artefact of SVG starting a circle at three o'clock, and carrying it over here
 * would shift every strip by three quarters of its width.
 */
function StripBand({ progress, ranges, color, timeline }) {
  const patternAt = latest => {
    const inside = windowRanges(ranges, windowAt(timeline, latest), WINDOW);
    return buildDashPattern(inside, { pathStart: 0 });
  };

  const dashArray = useTransform(progress, latest => patternAt(latest)?.dashArray);
  const dashOffset = useTransform(progress, latest => patternAt(latest)?.dashOffset);
  const opacity = useTransform(progress, latest =>
    patternAt(latest) ? magnifiedAt(timeline, latest) : 0
  );

  return (
    <motion.line
      x1={STRIP.x}
      y1={STRIP.y + STRIP.height / 2}
      x2={STRIP.x + STRIP.width}
      y2={STRIP.y + STRIP.height / 2}
      pathLength="1"
      stroke={color}
      strokeWidth={STRIP.height}
      strokeDasharray={dashArray}
      strokeDashoffset={dashOffset}
      style={{ opacity }}
    />
  );
}

/** How far the caliper arms reach either side of the band. */
const INNER = LAYOUT.radius - 16;
const OUTER = LAYOUT.radius + 16;
/**
 * How much higher one arm has to be than the other before the wedge commits to
 * putting it at the top of the strip.
 *
 * The two arms swap which of them is uppermost as the window passes the top of
 * the ring, and choosing a corner for each by a straight comparison would snap
 * them across at that moment. Blending over a band this tall means they meet in
 * the middle as they pass and separate again, which nobody sees happen.
 */
const WEDGE_SPLIT = 34;

/** The two edges of the window, and the lines that say the strip is that sliver. */
function Calipers({ progress, timeline }) {
  const edge = (latest, side) => {
    const span = spanAt(timeline, latest);
    return windowAt(timeline, latest) + (side === 'end' ? span : 0);
  };
  const point = (latest, side, radius) =>
    ringPoint({ ...LAYOUT, radius, position: edge(latest, side) });

  // Written out rather than generated in a loop: a hook has to be called in the
  // same order every render, which a helper called per side is not.
  const startInnerX = useTransform(progress, latest => point(latest, 'start', INNER).x);
  const startInnerY = useTransform(progress, latest => point(latest, 'start', INNER).y);
  const startOuterX = useTransform(progress, latest => point(latest, 'start', OUTER).x);
  const startOuterY = useTransform(progress, latest => point(latest, 'start', OUTER).y);
  const endInnerX = useTransform(progress, latest => point(latest, 'end', INNER).x);
  const endInnerY = useTransform(progress, latest => point(latest, 'end', INNER).y);
  const endOuterX = useTransform(progress, latest => point(latest, 'end', OUTER).x);
  const endOuterY = useTransform(progress, latest => point(latest, 'end', OUTER).y);

  /**
   * Which end of the wedge each arm takes, decided by where the arms actually are
   * on screen rather than by their order round the ring.
   *
   * Ring order is the wrong basis: the window turns as it sweeps, so the arm that
   * is uppermost changes, and any fixed assignment reads correctly for half the
   * ring and crosses over for the other half.
   */
  const tilt = latest => {
    const spread = point(latest, 'end', OUTER).y - point(latest, 'start', OUTER).y;
    return Math.min(1, Math.max(0, 0.5 + spread / (2 * WEDGE_SPLIT)));
  };
  const startTargetY = useTransform(progress, latest =>
    mix(STRIP.y + STRIP.height, STRIP.y, tilt(latest))
  );
  const endTargetY = useTransform(progress, latest =>
    mix(STRIP.y, STRIP.y + STRIP.height, tilt(latest))
  );

  const opacity = useTransform(
    progress,
    latest =>
      rangeProgress(latest, timeline.close.from, timeline.close.from + 0.4) *
      (1 - easeInOutCubic(rangeProgress(latest, timeline.retract.from, timeline.retract.to)))
  );
  const reach = useTransform(progress, latest => magnifiedAt(timeline, latest) * 0.5);

  return (
    <motion.g data-layer="calipers" style={{ opacity }}>
      <motion.line
        x1={startInnerX}
        y1={startInnerY}
        x2={startOuterX}
        y2={startOuterY}
        stroke={theme.colors.ui.text.bright}
        strokeWidth="1.5"
      />
      <motion.line
        x1={endInnerX}
        y1={endInnerY}
        x2={endOuterX}
        y2={endOuterY}
        stroke={theme.colors.ui.text.bright}
        strokeWidth="1.5"
      />
      {/* The frustum: this sliver is that strip. Without it the strip is a second
          picture rather than a detail of the first.
          Both lines run to the strip's *near* edge rather than to an end each.
          Both run to the strip's near edge, and which of them takes the top corner
          is decided per frame from where the arms are on screen — see `tilt`. */}
      <motion.line
        x1={startOuterX}
        y1={startOuterY}
        x2={STRIP.x}
        y2={startTargetY}
        stroke={theme.colors.ui.text.bright}
        strokeWidth="1"
        style={{ opacity: reach }}
      />
      <motion.line
        x1={endOuterX}
        y1={endOuterY}
        x2={STRIP.x}
        y2={endTargetY}
        stroke={theme.colors.ui.text.bright}
        strokeWidth="1"
        style={{ opacity: reach }}
      />
    </motion.g>
  );
}

/** What is actually inside the window, counted rather than claimed. */
function StripReadout({ progress, model, timeline }) {
  const countsAt = React.useCallback(
    latest => {
      const inside = windowRanges(model.topology.ranges, windowAt(timeline, latest), WINDOW);
      return { ranges: inside.length, servers: new Set(inside.map(range => range.serverId)).size };
    },
    [model, timeline]
  );

  // Counted per frame while the window sweeps, which is the point: the numbers
  // barely move. Not a motion value, because they are text.
  const [counts, setCounts] = React.useState(() => countsAt(progress.get()));
  React.useEffect(() => {
    setCounts(countsAt(progress.get()));
    return progress.on('change', latest => setCounts(countsAt(latest)));
  }, [countsAt, progress]);

  /**
   * The count belongs to one window, so it is only shown while the window is
   * standing still.
   *
   * Left live through the sweep it swings between about eleven and twenty-eight
   * ranges several times a second. Every one of those numbers is correct and none
   * of them is readable, which makes the readout look broken rather than busy.
   * Two numbers a viewer can actually read — before the sweep and after it — say
   * the same thing better.
   */
  const settled = useTransform(progress, latest =>
    Math.min(
      magnifiedAt(timeline, latest),
      1 -
        pulseProgress(
          latest,
          timeline.pan.from - 0.3,
          timeline.pan.from,
          timeline.pan.to,
          timeline.pan.to + 0.3
        )
    )
  );

  return (
    <g data-layer="readout">
      <text
        x={STRIP.x}
        y={STRIP.y - 16}
        fill={theme.colors.ui.text.secondary}
        fontSize="11"
        letterSpacing="2.4"
      >
        A FIFTIETH OF THE RING, MAGNIFIED
      </text>
      <motion.text
        x={STRIP.x}
        y={STRIP.y + STRIP.height + 26}
        fill={theme.colors.ui.text.bright}
        fontSize="13"
        letterSpacing="1.2"
        style={{ opacity: settled }}
      >
        {`${counts.ranges} ranges, ${counts.servers} different servers`}
      </motion.text>
    </g>
  );
}

export function DensityZoom({ model, progress, timeline }) {
  const { centreX, centreY, radius } = LAYOUT;
  const seam = ringPoint({ ...LAYOUT, radius, position: 0 });
  const seamOut = ringPoint({ ...LAYOUT, radius: radius + 24, position: 0 });

  const rangesFor = serverId => model.topology.ranges.filter(range => range.serverId === serverId);

  return (
    <g>
      <circle
        data-layer="reference-ring"
        cx={centreX}
        cy={centreY}
        r={radius}
        fill="none"
        stroke={theme.colors.primary.cyberBlue}
        strokeWidth="1.25"
        opacity="0.3"
      />
      <line
        data-layer="seam"
        x1={seam.x}
        y1={seam.y}
        x2={seamOut.x}
        y2={seamOut.y}
        stroke={theme.colors.primary.cyberBlue}
        strokeWidth="1.25"
        opacity="0.5"
      />

      {model.servers.map(server => (
        <g key={server.id} data-layer={`ring:${server.id}`}>
          <ServerRing ranges={rangesFor(server.id)} color={server.color} opacity={1} />
        </g>
      ))}

      {/* The empty track, from the first frame. Same job as the share panel's
          faint presence in the other ring scenes: the ring sits off-centre to
          leave room for this, and an empty column reads as a mistake until
          something is holding it. */}
      {/* The empty slot, at full strength from the first frame. The ring sits
          off-centre to leave room for it, and a column holding nothing reads as a
          ring pushed out of true — see `ServerLoadPanel` for the same argument. */}
      <rect
        data-layer="strip-track"
        x={STRIP.x}
        y={STRIP.y}
        width={STRIP.width}
        height={STRIP.height}
        fill={theme.colors.ui.panelBg}
      />

      <Calipers progress={progress} timeline={timeline} />

      {model.servers.map(server => (
        <g key={`strip-${server.id}`} data-layer={`strip:${server.id}`}>
          <StripBand
            progress={progress}
            ranges={rangesFor(server.id)}
            color={server.color}
            timeline={timeline}
          />
        </g>
      ))}

      <StripReadout progress={progress} model={model} timeline={timeline} />

      <SceneAnnotation
        progress={progress}
        {...LAYOUT.annotation}
        textFor={latest => annotationAt(timeline, latest)}
        presenceFor={latest => annotationPresenceAt(timeline, latest)}
      />
    </g>
  );
}

export default DensityZoom;
