import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../../themes';
import { easeInOutCubic, mix, pulseProgress, rangeProgress } from '../../story/easing';
import { buildDashPattern, windowRanges } from '../../story/ringDash';
import { ringPoint } from '../../story/projection';
import {
  annotationAt,
  annotationPresenceAt,
  buildSteps,
  createTimeline,
  stepAtRest,
} from '../../story/sceneSteps';
import { buildFullScaleModel } from '../../story/topology';
import { LAYOUT, ServerRing } from './RingParts';
import SceneAnnotation from './SceneAnnotation';

/**
 * Magnify a window of the dense ring onto a strip. Same dash pattern, on a line.
 */

/** One fiftieth. Small enough to be a hairline on the ring, wide enough to read. */
const WINDOW = 0.02;

export const ZOOM_MODEL = buildFullScaleModel({ serverCount: 6, vnodesPerServer: 150 });

/**
 * The keys the scene closes on, and the ranges that own them.
 *
 * Placed, not hashed — the same trade Scene 4 makes, and for the same reason.
 * Three keys that hash into one fiftieth of the ring, each far enough from its
 * own server position to have a walk worth watching and far enough from the next
 * key not to collide with it, is a search with almost no answers; taking the ones
 * it does have would let a hash function choose the composition of the frame.
 *
 * What is *not* placed is the answer. Each key's owner and the position it walks
 * to are read out of the real topology, so the picture can be arranged and still
 * cannot be wrong about who owns what.
 *
 * Named `user:<id>` like every other key in the story, and at three ids the story
 * has not used elsewhere.
 */
function buildClosingKey(model, { name, at }, windowStart) {
  const position = windowStart + at * WINDOW;
  const range = model.topology.ranges.find(entry => entry.from < position && position <= entry.to);

  return { name, at, position, owner: range.serverId, arrival: range.to };
}

/**
 * Where the sweep stops, and the three places in it a key comes down.
 *
 * The window is chosen and the keys are put in it, rather than the other way
 * round. Two things choose it, and the second is not about the ring at all:
 *
 * - it holds four ranges wide enough to give a key a walk of twenty-five to forty
 *   pixels instead of a twitch, and three of them belong to different servers
 * - it sits beside the strip, at about four o'clock. The calipers reach from the
 *   ring to the strip, and a window on the far side of the ring makes that reach a
 *   long diagonal across the frame instead of the short one it is meant to be. The
 *   window is where the magnifier is pointing, so where it is on the ring is a
 *   composition decision like any other.
 *
 * A key is placed by which colour it will arrive at, not only by how far it has to
 * walk. The whole point of the walk is the handover at the end of it — the key
 * gives up the neutral colour it fell in and takes its owner's — so a range whose
 * colour is already near that neutral has the key arrive and appear not to change.
 * `cache-06` is the one that cannot be used: it is `chromeSilver`, and a white
 * diamond turning silver is the same frame twice. The widest range in this window
 * belongs to it, and it is passed over for the blue one two sections to its left.
 */
const CLOSING_WINDOW = 0.78902;
const PLACED_KEYS = [
  { name: 'user:2318', at: 0.09 },
  { name: 'user:5064', at: 0.38 },
  { name: 'user:7241', at: 0.615 },
];

export const CLOSING_KEYS = PLACED_KEYS.map(entry =>
  buildClosingKey(ZOOM_MODEL, entry, CLOSING_WINDOW)
);

/**
 * Where the sweep starts and how far it goes: enough of the ring to be a claim.
 *
 * It ends on the window the closing keys are in, which is most of the way round
 * from where it started.
 */
const SWEEP = { from: 0.1, to: CLOSING_WINDOW };

/** Aligned with the column everything else in the story puts on the right. */
export const STRIP = { x: LAYOUT.panel.x, y: 292, width: LAYOUT.panel.width, height: 30 };

const OPENING = 1.2;
const CLOSE = { move: 1.4 };
const MAGNIFY = { move: 1.2 };
const PAN = { move: 6 };
const RETRACT = { move: 1.1 };
/** The closing act: three keys, down onto the strip and along to their servers. */
const LAND = { move: 1.1 };
const ROUTE = { move: 2.2 };
/** Long enough to see where it came down. Not long enough to be a scene of its own. */
const LANDED_REST = 1.8;
/**
 * The closing rest, a beat shorter than the scene's other reading rests. The line
 * it holds is the shortest in the scene, and by the time it arrives the viewer has
 * watched three keys do the thing it describes.
 */
const ANSWERED_REST = 4;
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
  timeline.skip(SETTLE_BEFORE_SPEAKING);
  timeline.annotate(
    "This is one small section of the ring, unrolled. Each colour change is a different server's range."
  );
  timeline.rest(READING_REST, 'Magnified');

  const pan = timeline.move(PAN.move);
  timeline.annotate(
    'Look anywhere on the ring and the mix is the same. The load is shared evenly across every section.'
  );
  timeline.rest(READING_REST, 'Everywhere the same');

  const land = timeline.move(LAND.move);
  timeline.skip(SETTLE_BEFORE_SPEAKING);
  timeline.annotate('Three keys land in this section. Clockwise runs to the right here.');
  timeline.rest(LANDED_REST, 'Three keys land');

  const route = timeline.move(ROUTE.move);
  timeline.annotate(
    'Each key goes to the first server position on its right. That server owns the key.'
  );
  timeline.rest(ANSWERED_REST, 'Owners found');

  const retract = timeline.move(RETRACT.move);
  const closing = timeline.rest(REST, 'The whole ring again');

  return {
    opening,
    close,
    magnify,
    pan,
    land,
    route,
    retract,
    closing: (closing.from + closing.to) / 2,
    rests: timeline.rests(),
    captions: timeline.captions(),
    narrations: timeline.narrations(),
    annotations: timeline.annotations(),
    end: timeline.at(),
  };
}

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

/** The strip stays after the calipers retract. */
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

/** Where a ring position falls along the strip, at whatever the window is showing. */
const stripX = (timeline, latest, position) =>
  STRIP.x + ((position - windowAt(timeline, latest)) / WINDOW) * STRIP.width;

/** How far it falls before it lands, and how big the mark is once it has. */
const FALL = 46;
const MARK = 6;
/**
 * How far above the band the key sits, which is the one thing that makes the
 * answer readable.
 *
 * Drawn on the band it would be a mark of the owner's colour on a band of the
 * owner's colour, and the whole payoff of the act — the key taking that colour —
 * would happen invisibly. Every ring scene insets its keys off the band for the
 * same reason, and joins them back to the exact position with a stem.
 */
const KEY_LIFT = 18;

/**
 * The closing argument: the rule from Scene 2, at nine hundred positions.
 *
 * Everything before this says the dense ring is *even*. None of it says the dense
 * ring is still *the same ring*, and the two are different claims — a viewer can
 * accept that six servers each hold a sixth and still lose the thing that made
 * the sixth arrive anywhere in particular. So one key comes down, walks right to
 * the first position it meets, and takes that server's colour.
 *
 * Reusing Scene 2's vocabulary exactly, because it is the same event. The key does
 * not move: it lands where it sits and stays there, and what travels is the
 * lookup. The trail is neutral while it runs, since which server owns the key is
 * the question rather than the premise, and the owner's colour arrives only when
 * the answer does.
 */
function ClosingKey({ progress, model, timeline, sampleKey, land, route }) {
  const server = model.servers.find(entry => entry.id === sampleKey.owner);
  const band = STRIP.y + STRIP.height / 2;
  const rest = STRIP.y - KEY_LIFT;

  const landedAt = latest => easeInOutCubic(rangeProgress(latest, land.from, land.to));
  const travelledAt = latest => easeInOutCubic(rangeProgress(latest, route.from, route.to));

  const markX = useTransform(progress, latest => stripX(timeline, latest, sampleKey.position));
  const markY = useTransform(progress, latest => mix(rest - FALL, rest, landedAt(latest)));
  const points = useTransform([markX, markY], ([x, y]) =>
    [
      [x, y - MARK],
      [x + MARK, y],
      [x, y + MARK],
      [x - MARK, y],
    ]
      .map(([pointX, pointY]) => `${pointX.toFixed(2)},${pointY.toFixed(2)}`)
      .join(' ')
  );
  const presence = useTransform(progress, latest => landedAt(latest));

  const headX = useTransform(progress, latest =>
    stripX(timeline, latest, mix(sampleKey.position, sampleKey.arrival, travelledAt(latest)))
  );
  // Down onto the band as it goes, so the arrival lands *on* a position rather
  // than above one. Scene 2 does this by changing radius.
  const headY = useTransform(progress, latest => mix(rest, band, travelledAt(latest)));
  const running = useTransform(progress, latest => {
    const done = travelledAt(latest);
    return done > 0 && done < 1 ? 1 : 0;
  });
  const trailOpacity = useTransform(running, latest => latest * 0.55);
  const headRadius = useTransform(running, latest => latest * 4);
  const stemOpacity = useTransform(progress, latest => landedAt(latest) * 0.4);
  // The name arrives with the key, not with the answer: which key it is was never
  // the question.
  const labelOpacity = useTransform(progress, latest => landedAt(latest));

  // Colour is not something a motion value can drive out of render, and it changes
  // once, on arrival — the same handover Scene 2 makes.
  const answeredAt = React.useCallback(
    latest =>
      easeInOutCubic(rangeProgress(latest, route.from, route.to)) >= 1
        ? server.color
        : theme.colors.ui.text.bright,
    [route, server]
  );
  const [color, setColor] = React.useState(() => answeredAt(progress.get()));
  React.useEffect(() => {
    setColor(answeredAt(progress.get()));
    return progress.on('change', latest => setColor(answeredAt(latest)));
  }, [answeredAt, progress]);

  const landing = useTransform(progress, latest => stripX(timeline, latest, sampleKey.arrival));
  const flare = useTransform(progress, latest =>
    pulseProgress(latest, route.to - 0.05, route.to, route.to, route.to + 0.5)
  );
  const flareRadius = useTransform(flare, latest => 9 + latest * 15);

  return (
    <g data-layer={`closing-key:${sampleKey.name}`}>
      {/* The stem, which joins the key to the exact place on the band it sits at.
          Without it the key is a mark floating near a position rather than on one. */}
      <motion.line
        x1={markX}
        y1={markY}
        x2={markX}
        y2={STRIP.y}
        stroke={color}
        strokeWidth="1"
        style={{ opacity: stemOpacity }}
      />
      <motion.line
        x1={markX}
        y1={markY}
        x2={headX}
        y2={headY}
        stroke={theme.colors.ui.text.bright}
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ opacity: trailOpacity }}
      />
      <motion.circle cx={headX} cy={headY} r={headRadius} fill={theme.colors.ui.text.bright} />
      {/* The arrival, marked on the position that answers. Decoration, and excluded
          from the rest check: a scene should not have to wait for its own flash. */}
      <motion.circle
        data-ephemeral="true"
        cx={landing}
        cy={band}
        r={flareRadius}
        fill="none"
        stroke={server.color}
        strokeWidth="2"
        style={{ opacity: flare }}
      />
      {/* Named, at the size the ring scenes name their keys, and centred over the
          mark so the pair reads as one thing. */}
      <motion.text
        x={markX}
        y={STRIP.y - KEY_LIFT - MARK - 8}
        textAnchor="middle"
        fill={color}
        fontSize="10"
        letterSpacing="0.6"
        style={{ opacity: labelOpacity }}
      >
        {sampleKey.name}
      </motion.text>
      {/* Outlined, because the fill is the owner's colour and it is sitting on that
          owner's band. The story draws every key this way — see `KeyMark`. */}
      <motion.polygon
        points={points}
        fill={color}
        stroke={theme.colors.ui.background}
        strokeWidth="1.5"
        style={{ opacity: presence }}
      />
    </g>
  );
}

/**
 * One key's slice of a shared movement, so the three cascade instead of moving as
 * a block.
 *
 * Landing together and walking together would read as one event with three marks
 * in it. Offset, each key is its own small demonstration, and the viewer who
 * misses the first has two more.
 */
function staggered(window, index, count, overlap) {
  const total = window.to - window.from;
  const span = total / (1 + (count - 1) * (1 - overlap));
  const step = span * (1 - overlap);

  return { from: window.from + index * step, to: window.from + index * step + span };
}

/** Loosely cascaded on the way down, more nearly one at a time on the way along. */
const LAND_OVERLAP = 0.72;
const ROUTE_OVERLAP = 0.45;

function ClosingKeys({ progress, model, timeline }) {
  return (
    <g data-layer="closing-keys">
      {CLOSING_KEYS.map((sampleKey, index) => (
        <ClosingKey
          key={sampleKey.name}
          progress={progress}
          model={model}
          timeline={timeline}
          sampleKey={sampleKey}
          land={staggered(timeline.land, index, CLOSING_KEYS.length, LAND_OVERLAP)}
          route={staggered(timeline.route, index, CLOSING_KEYS.length, ROUTE_OVERLAP)}
        />
      ))}
    </g>
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
        y={STRIP.y - 54}
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

      <ClosingKeys progress={progress} model={model} timeline={timeline} />

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
