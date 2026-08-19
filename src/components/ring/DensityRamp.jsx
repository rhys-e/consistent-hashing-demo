import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../../themes';
import { easeInOutCubic, easeOutCubic, mix, rangeProgress } from '../../story/easing';
import { ringPoint } from '../../story/projection';
import { buildDashPattern, windowRanges } from '../../story/ringDash';
import {
  annotationAt,
  annotationPresenceAt,
  buildSteps,
  createTimeline,
  stepAtRest,
} from '../../story/sceneSteps';
import { useAnimatedNumber } from '../../story/useAnimatedNumber';
import { LAYOUT, ServerMarker } from './RingParts';
import ServerLoadPanel from './ServerLoadPanel';
import SceneAnnotation from './SceneAnnotation';

/**
 * Bridge from Scene 4 to production density. Treatments differ only in staging;
 * new positions append and never move. See `densityRamp.js`.
 */

const RING_WIDTH = 13;
/** A boundary mark: a tick across the band, which is what a position is. */
const TICK = { outer: 8, inner: 8, width: 1.4 };

const PANEL = { ...LAYOUT.panel, y: 150 };
const READOUT_Y = PANEL.y + 34 + 6 * 34 + 56;
const STRIP = { x: PANEL.x, y: 470, width: PANEL.width, height: 26 };
/** The section the window holds on, chosen to be busy at every level. */
const WINDOW = { from: 0.4, width: 0.02 };

const OPENING = 1.2;
/** New positions arrive, then ownership rearranges to match. Cause, then effect. */
const ARRIVE = 1.6;
const RESOLVE = 1.4;
const REST = 0.5;
const READING_REST = 5;
/** The roster prelude, for the carry-over treatment only. */
const JOIN = { each: 0.5, stagger: 0.45 };
const CLOSING_REST = 2;

const MULTIPLY = { move: 3.4, each: 0.55 };
const MORPH = 1.1;

export const TREATMENTS = ['fill-in', 'carry-over', 'through-window', 'multiply'];

/** The window for one item of a staggered group, as Scenes 3 and 4 deal theirs. */
function staggered({ from, to, count, each }, index) {
  const step = count > 1 ? (to - from - each) / (count - 1) : 0;
  const start = from + index * step;

  return { from: start, to: start + each };
}

/**
 * The scene as durations laid end to end.
 *
 * One transition per level, each of them the same two movements: the tranche of
 * new positions grows in, and then ownership settles onto them. They overlap by a
 * little, so the ring is never doing nothing, but the rest that follows is clear
 * of both.
 */
export function buildRampTimeline(model, { treatment = 'fill-in' } = {}) {
  const timeline = createTimeline({ readingRest: READING_REST });
  const isMultiply = treatment === 'multiply';

  const opening = timeline.rest(OPENING, `${model.levels[0].vnodesPerServer} positions each`);

  let join = null;
  if (model.arrivals.length > 0) {
    timeline.annotate(
      `${model.arrivals.length} more servers arrive. Each one takes its positions from its own name.`
    );
    join = {
      ...timeline.move(JOIN.each + JOIN.stagger * (model.arrivals.length - 1)),
      count: model.arrivals.length,
      each: JOIN.each,
    };
    timeline.rest(REST, `${model.servers.length} servers`);
  }

  timeline.annotate(
    isMultiply
      ? 'Each server takes more positions. Every position it already had stays exactly where it is.'
      : 'Every position stays where it is. A server with more positions only adds more of them.'
  );

  /** One per level after the first: the tranche arriving, then ownership settling. */
  const steps = [];
  let morph = null;

  model.levels.slice(1).forEach((level, index) => {
    const dealt = isMultiply && index === 0;
    const arrive = dealt
      ? { ...timeline.move(MULTIPLY.move), count: model.tranches[1].length, each: MULTIPLY.each }
      : timeline.move(ARRIVE);
    const resolve = timeline.move(RESOLVE);
    const isLast = index === model.levels.length - 2;
    const settled = timeline.rest(
      isLast ? READING_REST : REST,
      `${level.vnodesPerServer} positions each`
    );

    steps.push({ arrive, resolve, settled: (settled.from + settled.to) / 2, level: index + 1 });

    // The notation change gets its own movement and its own rest, between the last
    // level a viewer could count and the first they could not. Folded into either
    // neighbouring step it would be a thing that happened while something else was
    // happening, which is the one way to make it unreadable.
    if (dealt) {
      timeline.annotate(
        'There are too many now to inspect one by one. Each position becomes a tick.'
      );
      morph = timeline.move(MORPH);
      timeline.rest(REST, 'Positions become ticks');
    }
  });

  timeline.annotate(
    'The ranges are much smaller now. No single range is big enough to matter when it moves.'
  );
  const closing = timeline.rest(CLOSING_REST, 'Production density');

  return {
    treatment,
    opening: (opening.from + opening.to) / 2,
    join,
    steps,
    morph,
    closing: (closing.from + closing.to) / 2,
    rests: timeline.rests(),
    captions: timeline.captions(),
    narrations: timeline.narrations(),
    annotations: timeline.annotations(),
    end: timeline.at(),
  };
}

export function buildRampSteps(timeline) {
  return buildSteps(
    timeline.rests.filter(rest => rest.label).map(rest => stepAtRest(rest, rest.label)),
    timeline.end
  );
}

/**
 * Where the ramp has got to, as a continuous level index.
 *
 * Zero is the sparsest level and `levels.length - 1` the densest, and everything
 * on screen reads off this one number — how present each tranche of marks is, how
 * far the crossfade between two ownerships has run, how big the numbers say the
 * pieces are. It is the same discipline the timed scenes use, with the levels
 * standing in for beats.
 */
export function levelAt(timeline, progressValue) {
  let level = 0;

  timeline.steps.forEach(step => {
    level += easeInOutCubic(rangeProgress(progressValue, step.resolve.from, step.resolve.to));
  });

  return level;
}

/**
 * The same scalar, one movement earlier: how many tranches of *positions* are on
 * the ring.
 *
 * The two are deliberately out of step. New boundaries appear first and ownership
 * rearranges onto them afterwards, which is cause and then effect, and is the only
 * order in which the change is followable — a viewer who sees the colours move at
 * the same moment as the marks has no way to tell which one explains the other.
 * It is the same grammar as Scene 7 naming a lane before moving anything out of it.
 *
 * Both are whole numbers at every rest, so a step still lands on a frame where the
 * two agree and nothing is mid-flight.
 */
export function positionsAt(timeline, progressValue) {
  let level = 0;

  timeline.steps.forEach(step => {
    level += easeOutCubic(rangeProgress(progressValue, step.arrive.from, step.arrive.to));
  });

  return level;
}

/**
 * How far the dots have become ticks. One, instantly, where there is no morph.
 *
 * A separate scalar from the ramp because it is a separate claim. The ramp says
 * there are more positions; this says the story has stopped asking the viewer to
 * look at them one at a time. Running them off one number would make the notation
 * change look like a consequence of the count rather than a decision about it.
 */
export function morphedAt(timeline, progressValue) {
  if (!timeline.morph) return 1;
  return easeInOutCubic(rangeProgress(progressValue, timeline.morph.from, timeline.morph.to));
}

/**
 * How much of the mark layer is left — one while it is being read, nought once it
 * has dissolved into the band.
 *
 * It rides the *last ownership resolve*, which is the one movement in the scene
 * with nothing else to say. Tying it to the position count instead put the arrival
 * of the final tranche and its own retirement inside the same movement, so three
 * hundred and sixty ticks washed in and vanished again without ever being a frame.
 * Now they arrive, and then the whole layer sinks into the ring it was describing.
 */
function retireAt(model, timeline, progressValue) {
  const last = model.levels.length - 1;
  return 1 - Math.min(1, Math.max(0, levelAt(timeline, progressValue) - (last - 1)));
}

/** How far the roster prelude has run. One, instantly, where there is none. */
function joinedAt(timeline, progressValue, index) {
  if (!timeline.join) return 1;

  const { from, to, count, each } = timeline.join;
  const step = count > 1 ? (to - from - each) / (count - 1) : 0;
  const start = from + index * step;

  return easeOutCubic(rangeProgress(progressValue, start, start + each));
}

/**
 * A tranche of positions, drawn once and never moved.
 *
 * Every mark in a tranche belongs to the same step of the ramp, so the whole
 * tranche is one path with one opacity — which is what makes nine hundred
 * boundaries affordable, and is also the honest grouping: these are the positions
 * that did not exist a moment ago.
 */
function TrancheMarks({ progress, vnodes, colorOf, presenceFor, widthFor, serverPresenceFor }) {
  const byServer = React.useMemo(() => {
    const paths = new Map();

    vnodes.forEach(vnode => {
      const inner = ringPoint({
        ...LAYOUT,
        radius: LAYOUT.radius - TICK.inner,
        position: vnode.position,
      });
      const outer = ringPoint({
        ...LAYOUT,
        radius: LAYOUT.radius + TICK.outer,
        position: vnode.position,
      });
      const segment = `M ${inner.x.toFixed(2)} ${inner.y.toFixed(2)} L ${outer.x.toFixed(2)} ${outer.y.toFixed(2)}`;

      paths.set(vnode.serverId, (paths.get(vnode.serverId) ?? '') + segment);
    });

    return [...paths.entries()];
  }, [vnodes]);

  const strokeWidth = useTransform(progress, widthFor);

  return (
    <g>
      {byServer.map(([serverId, d]) => (
        <ServerMarks
          key={serverId}
          progress={progress}
          d={d}
          color={colorOf(serverId)}
          strokeWidth={strokeWidth}
          opacityFor={latest => presenceFor(latest) * serverPresenceFor(latest, serverId)}
        />
      ))}
    </g>
  );
}

/**
 * How small a dot gets as its server acquires more of them. The sparse end is
 * Scene 4's own `DENSE_SCALE`, so the opening frame is drawn at the size the
 * previous scene left it.
 */
const DOT_SCALE = { sparse: 0.34, dense: 0.22 };

/**
 * One position, drawn as whichever notation the story is currently using.
 *
 * A dot while there are few enough to count and a tick once there are not, with
 * the two anchored at the same point so the change reads as the dot collapsing
 * into the boundary it always was — rather than as one set of marks being swapped
 * for another. The dot is `ServerMarker`, the same component the ring scenes have
 * used since Scene 2, so the opening frame here is drawn by the code that drew the
 * frame it follows.
 */
function PositionMark({
  progress,
  server,
  position,
  arrivalFor,
  morphFor,
  scaleFor,
  tickWidthFor,
  layer,
}) {
  const inner = ringPoint({ ...LAYOUT, radius: LAYOUT.radius - TICK.inner, position });
  const outer = ringPoint({ ...LAYOUT, radius: LAYOUT.radius + TICK.outer, position });

  const tickOpacity = useTransform(progress, latest => arrivalFor(latest) * morphFor(latest));
  const strokeWidth = useTransform(progress, tickWidthFor);

  return (
    <g data-layer={layer}>
      <ServerMarker
        progress={progress}
        server={server}
        position={position}
        presenceFor={latest => arrivalFor(latest) * (1 - morphFor(latest))}
        // No names. Thirty of them could not be labelled in Scene 4 and ninety
        // certainly cannot, so the panel is the legend from the first frame.
        namedFor={() => 0}
        scaleFor={scaleFor}
      />
      <motion.line
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke={server.color}
        style={{ opacity: tickOpacity, strokeWidth }}
      />
    </g>
  );
}

/**
 * The line from a server's first position to one of its new ones, straight across
 * the ring — Scene 4's device, at the next order of magnitude.
 *
 * It is what makes a burst of marks in one colour read as *one server taking more
 * places* rather than as a crowd of new servers, and reusing it here means the
 * viewer has already been taught to read this exact movement. Decoration, and
 * marked as such: the scene must never wait for it.
 */
function Tether({ progress, from, to, color, windowFor }) {
  const start = ringPoint({ ...LAYOUT, radius: LAYOUT.radius, position: from });
  const end = ringPoint({ ...LAYOUT, radius: LAYOUT.radius, position: to });

  const opacity = useTransform(progress, latest => {
    const arrived = windowFor(latest);
    return arrived > 0 && arrived < 1 ? 0.35 * (1 - arrived) : 0;
  });

  return (
    <motion.line
      data-ephemeral="true"
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke={color}
      strokeWidth="1"
      style={{ opacity }}
    />
  );
}

function ServerMarks({ progress, d, color, strokeWidth, opacityFor }) {
  const opacity = useTransform(progress, opacityFor);

  return (
    <motion.path
      d={d}
      stroke={color}
      style={{ strokeWidth, opacity }}
      strokeLinecap="butt"
      fill="none"
    />
  );
}

/**
 * One level's ownership, as one dashed circle per server.
 *
 * Ownership is the one thing here that genuinely cannot be subdivided: inserting a
 * position between two others hands the range before it to a different server, so
 * two levels are different answers rather than one answer at two resolutions.
 * Crossfading them is the honest transition, and it is bearable precisely because
 * the marks underneath are not crossfading — the eye holds the boundaries while
 * the colour behind them resolves.
 */
function LevelOwnership({ progress, level, opacityFor }) {
  const opacity = useTransform(progress, opacityFor);

  return (
    <motion.g style={{ opacity }}>
      {level.byServer.map(server => {
        const pattern = buildDashPattern(server.ranges);
        if (!pattern) return null;

        return (
          <circle
            key={server.id}
            cx={LAYOUT.centreX}
            cy={LAYOUT.centreY}
            r={LAYOUT.radius}
            pathLength="1"
            fill="none"
            stroke={server.color}
            strokeWidth={RING_WIDTH}
            strokeDasharray={pattern.dashArray}
            strokeDashoffset={pattern.dashOffset}
          />
        );
      })}
    </motion.g>
  );
}

/** The same section of ring at every level, laid out straight. */
function WindowStrip({ progress, model, timeline }) {
  const midY = STRIP.y + STRIP.height / 2;

  return (
    <g data-layer="window-strip">
      <text
        x={STRIP.x}
        y={STRIP.y - 12}
        fill={theme.colors.ui.text.secondary}
        fontSize="11"
        letterSpacing="1.8"
      >
        A FIFTIETH OF THE RING
      </text>

      {model.levels.map((level, index) => (
        <StripLevel
          key={level.vnodesPerServer}
          progress={progress}
          level={level}
          midY={midY}
          opacityFor={latest => levelPresence(levelAt(timeline, latest), index)}
        />
      ))}

      <rect
        x={STRIP.x}
        y={STRIP.y}
        width={STRIP.width}
        height={STRIP.height}
        fill="none"
        stroke={theme.colors.primary.cyberBlue}
        strokeWidth="1"
        opacity="0.45"
      />
    </g>
  );
}

function StripLevel({ progress, level, midY, opacityFor }) {
  const opacity = useTransform(progress, opacityFor);

  return (
    <motion.g style={{ opacity }}>
      {level.byServer.map(server => {
        const inside = windowRanges(server.ranges, WINDOW.from, WINDOW.width);
        const pattern = buildDashPattern(inside, { pathStart: 0 });
        if (!pattern) return null;

        return (
          <line
            key={server.id}
            x1={STRIP.x}
            y1={midY}
            x2={STRIP.x + STRIP.width}
            y2={midY}
            pathLength="1"
            stroke={server.color}
            strokeWidth={STRIP.height}
            strokeDasharray={pattern.dashArray}
            strokeDashoffset={pattern.dashOffset}
          />
        );
      })}
    </motion.g>
  );
}

/** A hat function: full at its own level, nothing once a neighbour has the floor. */
const levelPresence = (level, index) => Math.max(0, 1 - Math.abs(level - index));

/**
 * The two numbers, in the column every other scene puts its numbers in.
 *
 * The biggest piece rather than the spread, for the reason `densityRamp.js` gives:
 * spread is not monotone at these sample sizes and would show the argument failing
 * halfway through.
 */
function Readout({ progress, interpolate }) {
  const positions = useAnimatedNumber({
    progress,
    valueFor: latest => interpolate(latest, level => level.vnodesPerServer),
    format: value => `${Math.round(value)} POSITIONS EACH`,
  });
  const biggest = useAnimatedNumber({
    progress,
    valueFor: latest => interpolate(latest, level => level.biggest),
    format: value => `${(value * 100).toFixed(2)}%`,
  });
  const pieces = useAnimatedNumber({
    progress,
    valueFor: latest => interpolate(latest, level => level.rangeCount),
    format: value => `${Math.round(value)}`,
  });

  const line = (y, label, value) => (
    <>
      <text
        x={PANEL.x}
        y={y}
        fill={theme.colors.ui.text.secondary}
        fontSize="11"
        letterSpacing="1.6"
      >
        {label}
      </text>
      <text
        x={PANEL.x + PANEL.width}
        y={y}
        textAnchor="end"
        fill={theme.colors.ui.text.bright}
        fontSize="13"
        letterSpacing="1.2"
      >
        {value}
      </text>
    </>
  );

  return (
    <g data-layer="readout">
      <text
        x={PANEL.x}
        y={READOUT_Y - 26}
        fill={theme.colors.ui.text.bright}
        fontSize="11"
        letterSpacing="2.4"
      >
        {positions}
      </text>
      {line(READOUT_Y, 'PIECES ON THE RING', pieces)}
      {line(READOUT_Y + 24, 'BIGGEST PIECE', biggest)}
    </g>
  );
}

/**
 * The first two tranches, a mark at a time.
 *
 * These are the positions that are still worth looking at individually — the ten
 * each the viewer arrives with, and the twenty each that are dealt out on tethers.
 * Everything beyond them is drawn in bulk, because past ninety marks the ring
 * stops being something you read one mark at a time, which is the fact the notation
 * change exists to admit.
 */
function DealtPositions({ model, progress, timeline }) {
  const [held, dealt] = model.tranches;
  const serverOf = id => model.servers.find(server => server.id === id);
  const originOf = id =>
    model.tranches[0].find(vnode => vnode.vnodeId === `${id}#0`)?.position ?? 0;

  /** Dealt round the ring rather than server by server, so all three deal at once. */
  const order = new Map(dealt.map((vnode, index) => [vnode.vnodeId, index]));
  const arrive = timeline.steps[0].arrive;

  const dealtAt = (latest, index) => {
    const window = staggered(arrive, index);
    return easeOutCubic(rangeProgress(latest, window.from, window.to));
  };

  /**
   * A dot shrinks as its server acquires more, which is Scene 4's rule and the
   * reason the opening frame here is drawn at exactly the size Scene 4 left it.
   * It follows the ramp rather than a mark's own arrival: a position that has just
   * landed is not smaller than the ones already there, the whole ring is.
   */
  const dotScale = latest =>
    mix(DOT_SCALE.sparse, DOT_SCALE.dense, Math.min(1, positionsAt(timeline, latest)));
  /** A tick thins as the ring fills, exactly as the bulk layer's do. */
  const tickWidth = latest =>
    mix(TICK.width, 0.35, positionsAt(timeline, latest) / (model.levels.length - 1));
  /** These retire with the bulk layer, so the whole notation goes at once. */
  const retire = latest => retireAt(model, timeline, latest);

  return (
    <g data-layer="dealt-positions">
      {held.map(vnode => (
        <PositionMark
          key={vnode.vnodeId}
          progress={progress}
          server={serverOf(vnode.serverId)}
          position={vnode.position}
          arrivalFor={retire}
          morphFor={latest => morphedAt(timeline, latest)}
          scaleFor={dotScale}
          tickWidthFor={tickWidth}
          layer={`position:${vnode.vnodeId}`}
        />
      ))}

      {dealt.map(vnode => {
        const index = order.get(vnode.vnodeId);

        return (
          <g key={vnode.vnodeId}>
            <Tether
              progress={progress}
              from={originOf(vnode.serverId)}
              to={vnode.position}
              color={model.colorOf(vnode.serverId)}
              windowFor={latest => dealtAt(latest, index)}
            />
            <PositionMark
              progress={progress}
              server={serverOf(vnode.serverId)}
              position={vnode.position}
              arrivalFor={latest => dealtAt(latest, index) * retire(latest)}
              morphFor={latest => morphedAt(timeline, latest)}
              scaleFor={dotScale}
              tickWidthFor={tickWidth}
              layer={`position:${vnode.vnodeId}`}
            />
          </g>
        );
      })}
    </g>
  );
}

export function DensityRamp({ model, progress, timeline }) {
  const { centreX, centreY, radius } = LAYOUT;
  const seam = ringPoint({ ...LAYOUT, radius, position: 0 });
  const seamOut = ringPoint({ ...LAYOUT, radius: radius + 22, position: 0 });

  const showWindow = timeline.treatment === 'through-window';
  const isMultiply = timeline.treatment === 'multiply';

  /**
   * How far a server has arrived. One throughout, where the roster never changes.
   *
   * An arrival takes its *marks* on this schedule and the ring re-divides once they
   * are all down — positions first, ownership second, which is the same grammar the
   * density steps use and the reason either of them is followable.
   */
  const arrivalIndex = serverId => model.arrivals.findIndex(server => server.id === serverId);
  const serverPresence = (latest, serverId) => {
    const index = arrivalIndex(serverId);
    return index < 0 ? 1 : joinedAt(timeline, latest, index);
  };
  /** Once every arrival is down, so ownership resolves after the positions land. */
  const rosterAt = latest =>
    model.arrivals.length === 0 ? 1 : joinedAt(timeline, latest, model.arrivals.length - 1);

  /**
   * Marks thin as they multiply, and are gone by the densest level.
   *
   * At a hundred and fifty positions each, seven hundred and fifty-seven of the
   * nine hundred boundaries land within three pixels of the one before, so a tick
   * per boundary stops being a mark and becomes a fill. It is drawn while it can
   * still be counted, and retires when it cannot — which is the notation change
   * the cut used to make silently between two slides.
   */
  const markWidth = latest =>
    mix(TICK.width, 0.35, positionsAt(timeline, latest) / (model.levels.length - 1));
  const markPresence = (latest, index) =>
    (index === 0 ? 1 : Math.min(1, Math.max(0, positionsAt(timeline, latest) - (index - 1)))) *
    retireAt(model, timeline, latest);

  /**
   * Whatever the ramp says, at whatever point between two levels it has reached —
   * and, before the ramp starts, between the opening ring and the first level.
   *
   * Everything the panel and the readout show goes through here, so there is one
   * answer to "what is true right now" rather than one per figure.
   */
  const interpolate = (latest, pick) => {
    const level = levelAt(timeline, latest);
    const low = model.levels[Math.floor(level)];
    const high = model.levels[Math.min(model.levels.length - 1, Math.ceil(level))];
    const ramped = mix(pick(low), pick(high), level - Math.floor(level));

    if (!model.prelude) return ramped;
    return mix(pick(model.prelude), ramped, rosterAt(latest));
  };

  /**
   * `from` and `to` are nought and one, so `settleFor` hands the panel the share
   * itself rather than a fraction of the way between two endpoints.
   *
   * The panel's own tween is not wanted here. A share is a function of where the
   * ramp has got to, not of a settle that happens to be running beside it, and
   * these shares pass through a middle level that no straight line between the two
   * ends goes anywhere near.
   */
  const rows = model.servers.map(server => ({
    id: server.id,
    color: server.color,
    from: 0,
    to: 1,
  }));

  const settleFor = (latest, rowIndex) => {
    const id = model.servers[rowIndex].id;
    const shareIn = level => level.shares.find(entry => entry.id === id)?.share ?? 0;
    return interpolate(latest, shareIn);
  };

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
        opacity="0.25"
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

      {/* The ring as it opens, under the ring the arrivals turn it into. Two
          servers owning everything is a different set of arcs from six servers
          sharing it, not the same set with four hidden. */}
      {model.prelude ? (
        <LevelOwnership
          progress={progress}
          level={model.prelude}
          opacityFor={latest =>
            levelPresence(levelAt(timeline, latest), 0) * (1 - rosterAt(latest))
          }
        />
      ) : null}

      {model.levels.map((level, index) => (
        <LevelOwnership
          key={`own-${level.vnodesPerServer}`}
          progress={progress}
          level={level}
          opacityFor={latest =>
            levelPresence(levelAt(timeline, latest), index) * (index === 0 ? rosterAt(latest) : 1)
          }
        />
      ))}

      {isMultiply ? <DealtPositions model={model} progress={progress} timeline={timeline} /> : null}

      {model.tranches.map((vnodes, index) => {
        // The multiply treatment draws its first two tranches a mark at a time, so
        // that they can be dealt out and can change notation. Only the last one —
        // three hundred and sixty positions, past anything worth looking at
        // individually — arrives in bulk.
        if (isMultiply && index < 2) return null;

        return (
          <TrancheMarks
            key={`marks-${index}`}
            progress={progress}
            vnodes={vnodes}
            colorOf={model.colorOf}
            presenceFor={latest => markPresence(latest, index)}
            widthFor={markWidth}
            // Only the opening tranche has servers still to arrive; by the time the
            // ramp starts the roster is complete.
            serverPresenceFor={index === 0 ? serverPresence : () => 1}
          />
        );
      })}

      {showWindow ? (
        <>
          <WindowEdges />
          <WindowStrip progress={progress} model={model} timeline={timeline} />
        </>
      ) : null}

      <ServerLoadPanel
        {...PANEL}
        rows={rows}
        progress={progress}
        settleFor={settleFor}
        revealFor={() => 1}
        rowOpacityFor={(latest, rowIndex) => serverPresence(latest, model.servers[rowIndex].id)}
        evenShare={model.evenShare}
        // An even share is a fact about the roster, so where the roster grows the
        // mark has to move with it — a half between two servers, a sixth between
        // six.
        evenShareFor={
          model.arrivals.length > 0
            ? latest =>
                1 /
                model.servers.reduce(
                  (count, server) => count + serverPresence(latest, server.id),
                  0
                )
            : undefined
        }
        evenMark={0.55}
      />

      {showWindow ? null : <Readout progress={progress} interpolate={interpolate} />}

      <SceneAnnotation
        progress={progress}
        x={LAYOUT.annotation.x}
        y={showWindow ? 545 : READOUT_Y + 58}
        width={LAYOUT.annotation.width}
        textFor={latest => annotationAt(timeline, latest)}
        presenceFor={latest => annotationPresenceAt(timeline, latest)}
      />
    </g>
  );
}

/** Two hairlines from the ring to the strip, so the strip is *that* section. */
function WindowEdges() {
  const edge = position => ringPoint({ ...LAYOUT, radius: LAYOUT.radius + 16, position });
  const near = edge(WINDOW.from);
  const far = edge(WINDOW.from + WINDOW.width);

  return (
    <g data-layer="window-edges" opacity="0.5">
      <path
        d={`M ${near.x} ${near.y} L ${STRIP.x} ${STRIP.y} M ${far.x} ${far.y} L ${STRIP.x + STRIP.width} ${STRIP.y}`}
        stroke={theme.colors.primary.cyberBlue}
        strokeWidth="1"
        strokeDasharray="3 5"
        fill="none"
      />
    </g>
  );
}

export default DensityRamp;
