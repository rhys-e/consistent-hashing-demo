import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../../themes';
import {
  easeInOutCubic,
  easeOutCubic,
  mix,
  pulseProgress,
  rangeProgress,
} from '../../story/easing';
import { buildDashPattern } from '../../story/ringDash';
import { laneRanges } from '../../story/topology';
import {
  annotationAt,
  annotationPresenceAt,
  buildSteps,
  createTimeline,
  stepAtRest,
} from '../../story/sceneSteps';
import { ringPoint } from '../../story/projection';
import ServerLoadPanel from './ServerLoadPanel';
import SceneAnnotation from './SceneAnnotation';

const palette = {
  ring: theme.colors.primary.cyberBlue,
  label: theme.colors.ui.text.secondary,
  bright: theme.colors.ui.text.bright,
};

export const LAYOUT = {
  centreX: 392,
  centreY: 310,
  referenceRadius: 250,
  band: { outer: 226, inner: 92 },
  panel: { x: 760, y: 150, width: 300 },
};

/**
 * The scene as durations rather than timestamps.
 *
 * Every movement here is a lane changing radius, and every one is followed by a
 * rest: an interval in which nothing at all moves. The rests are what the viewer
 * steps between, so they are part of the timing rather than whatever gap happens
 * to be left over — laying the scene out as durations is what stops a movement
 * growing into the quiet moment that was supposed to follow it.
 */
const OPENING = 1;
const FAN_OUT = 1.5;
const PANEL = 0.45;
const JOIN = 0.45;
/**
 * The roster changes before the ring does.
 *
 * Watching six lanes give something up only means anything if you already know a
 * seventh server has turned up and why. So the newcomer arrives first as a row
 * sliding into the table — the smallest, most legible statement of "there is one
 * more of these now" — and the ring is left alone while that lands.
 */
const ROSTER = { slide: 0.7, rest: 2 };
/** Far enough out to be a row arriving from somewhere, not a row fading up. */
const ROSTER_SLIDE_FROM = 44;
/**
 * A handover is four moments: the lane about to give something up crossfades into
 * the light, holds while nothing moves so the viewer can see which one it is, the
 * ranges cross, and everything rests. The hold matters because without it the
 * answer to "which server just lost that?" arrives after the movement that would
 * have answered it.
 *
 * ## Teach one, montage five
 *
 * Six handovers at one speed taught the mechanic six times and none of them well:
 * fast enough to be a rhythm, too fast to follow the first time, and by the third
 * the viewer is watching a texture rather than reading an event. So the first one
 * is slow enough to be read as a sentence — this lane lights, *these* ranges leave
 * it, they arrive *there* — and the other five run at a pace that says "and again,
 * and again" without asking to be parsed individually.
 *
 * The repetition is still doing work: what the montage proves is that every server
 * gives up a share, not what a handover consists of. That was already established.
 */
const TEACH = { cross: 0.25, hold: 0.6, flight: 0.85, rest: 0.55 };
const MONTAGE = { cross: 0.15, hold: 0.1, flight: 0.3, rest: 0.3 };
const handoverShape = index => (index === 0 ? TEACH : MONTAGE);
/**
 * After the last server hands over, everything stays back with only the newcomer
 * lit. Without it the last handover has nowhere to land: its lane fades out just as
 * the others fade in, so it blinks instead of taking its turn. That hold is also
 * where the result gets stated on its own terms, so it is a narration rest: the
 * one lane built entirely out of slivers is what you look at while reading why.
 */
const NEWCOMER = { hold: 1.8, restore: 0.45 };
/** The long rest on the assembled lanes: the seam between two scenes. */
const ASSEMBLED_REST = 0.7;
const MERGE = { move: 0.28, rest: 0.24 };
/**
 * The closing highlight, and the restore that follows it.
 *
 * The restore is not a flourish, it is the correction to what the highlight would
 * otherwise say. This scene's claim is a *negative* — that the rest of the ring
 * was untouched — and dimming everything else makes the slivers the figure and the
 * untouched majority the ground, which is the argument upside down. Ending there
 * leaves a viewer with "these slivers are the result", when the result is the ring
 * shared seven ways and the slivers are what it cost.
 *
 * So the highlight is passed through: it answers what moved, and the frame the
 * scene rests on afterwards answers what did not.
 */
const HIGHLIGHT = { move: 0.55, restore: 0.8 };
/** The last frame: the ring entire, seven ways, and mostly where it was. */
const WHOLE_REST = 1.6;
/** Long enough that a step lands clear of the movement either side of it. */
const REST = 0.35;
/**
 * The empty lane, held. Longer than a structural rest because this is where the
 * standing commentary arrives, and the first sentence wants stillness under it —
 * the deliberate first handover that follows gives it the rest of its reading time.
 */
const NEW_LANE_REST = 1.5;
/**
 * A rest that follows new narration, long enough to actually read it in.
 *
 * Around six seconds at the scene's pace. Captions used to change often and
 * briefly, which pulled the eye back and forth between the words and the ring and
 * gave neither enough attention — so there are now fewer of them, each saying more.
 * Six seconds rather than eight because the note has the screen to itself: reading
 * something is faster when it is not also asking you to watch something.
 */
const READING_REST = 5;
/** The last frame of the scene, with the last thing said about it still up. */
const CLOSING_REST = READING_REST;

/** A flare is an event. It peaks on contact and is gone before the pause is. */
const FLARE_DECAY = 0.18;

const LANE_OPACITY = { full: 0.92, dim: 0.14, highlighted: 0.12 };
/** How present the share panel is before it has anything to say. */
const PANEL_PRESENCE = 0.16;

/**
 * Beat boundaries depend on how many lanes there are, because the sequence is a
 * list: one entry per server handing over, then one per lane folding back in.
 */
/** Everything from the seventh server arriving to what it took being picked out. */
function addJoin(timeline, laneCount, sources) {
  const roster = timeline.move(ROSTER.slide);
  // Left standing through the empty lane, every handover and the fold back out:
  // the whole of that movement is this one sentence happening.
  timeline.annotate('A new cache joins. The ring has to be shared out again to make room for it.');
  timeline.rest(ROSTER.rest, 'A cache joins');

  const join = timeline.move(JOIN);
  timeline.rest(NEW_LANE_REST, 'New lane');

  const handoverFrom = timeline.at();
  const phases = [];
  for (let index = 0; index < sources; index++) {
    const shape = handoverShape(index);
    phases.push({ ...shape, start: timeline.at() });
    timeline.skip(shape.cross + shape.hold + shape.flight);
    timeline.rest(shape.rest, `handover:${index}`);
  }
  const handoverTo = timeline.at();

  // The last lane needs its own crossfade out before the newcomer stands alone.
  // Recorded as a phase of its own so that asking for "the handover after the last
  // one" gets a real answer — that is where the outgoing lane's fade out ends.
  phases.push({ start: handoverTo, cross: MONTAGE.cross, hold: 0, flight: 0, rest: 0 });
  timeline.skip(MONTAGE.cross);
  const newcomer = timeline.rest(NEWCOMER.hold, 'The newcomer alone');

  const restore = timeline.move(NEWCOMER.restore);
  const assembledRest = timeline.rest(ASSEMBLED_REST, 'All lanes');

  const mergeFrom = timeline.at();
  for (let index = 0; index < laneCount; index++) {
    timeline.skip(MERGE.move);
    timeline.rest(MERGE.rest, index === laneCount - 1 ? 'Ring restored' : 'Folding in');
  }
  const mergeTo = timeline.at();

  const highlight = timeline.move(HIGHLIGHT.move);
  // The one thing the picture cannot say. Absence of change looks identical to
  // nothing happening, so the claim at the heart of consistent hashing — that the
  // rest of the ring was untouched — is the one claim worth spending words on.
  // Nothing replaces it: it is the last word of the scene and stays up until the
  // slide does.
  timeline.annotate(
    'Only these ranges changed hands. Every other key stayed exactly where it was.'
  );
  timeline.rest(CLOSING_REST, 'What it took');

  const restoreHighlight = timeline.move(HIGHLIGHT.restore);
  timeline.rest(WHOLE_REST, 'Everything else held');

  return {
    roster,
    join,
    handover: { from: handoverFrom, to: handoverTo, count: sources, phases, cross: TEACH.cross },
    newcomer,
    restore,
    /** All lanes lit, the handover complete: the seam between two scenes. */
    assembled: assembledRest.to,
    merge: { from: mergeFrom, to: mergeTo, step: MERGE.move + MERGE.rest, move: MERGE.move },
    highlight,
    // Not `restore`: that name already belongs to the newcomer coming back up,
    // and shadowing it here silently repoints `laneOpacityAt` at this window.
    highlightRestore: restoreHighlight,
  };
}

/**
 * `fromSettled` starts the scene on lanes that have already separated. Kept for a
 * scene that wants to begin part-way, but *not* used by the join: taking the ring
 * apart and putting it back has to happen in one movement, or the concentric lanes
 * start to look like a structure the system has rather than a way of looking at
 * one. A zero-length window reads as "finished" to everything that consumes it.
 */
/** What a built timeline carries forward from the one that recorded it. */
const snapshot = timeline => ({
  rests: timeline.rests(),
  captions: timeline.captions(),
  narrations: timeline.narrations(),
  annotations: timeline.annotations(),
  end: timeline.at(),
});

export function buildLaneTimeline(laneCount, { hasRemap = true, fromSettled = false } = {}) {
  const sources = Math.max(1, laneCount - 1);
  const timeline = createTimeline({ readingRest: READING_REST });
  const done = { from: 0, to: 0 };

  if (fromSettled) {
    const join = addJoin(timeline, laneCount, sources);

    return {
      laneCount,
      sources,
      fanOut: done,
      panel: done,
      settled: 0,
      ...join,
      ...snapshot(timeline),
    };
  }

  timeline.narrate(
    'Ownership changes hands hundreds of times around this ring — no stretch of it belongs to any one server.'
  );
  timeline.skip(OPENING);
  const fanOut = timeline.move(FAN_OUT);
  timeline.rest(REST, 'Lanes separated');

  const panel = timeline.move(PANEL);
  const settledRest = timeline.rest(REST, 'Shares shown');

  const shared = {
    laneCount,
    sources,
    fanOut,
    panel,
    settled: settledRest.to,
  };

  if (!hasRemap) {
    return {
      ...shared,
      ...snapshot(timeline),
    };
  }

  return {
    ...shared,
    ...addJoin(timeline, laneCount, sources),
    ...snapshot(timeline),
  };
}

/**
 * Where the scene rests, in the order it rests there. Steps come from the
 * timeline's own rests rather than being re-derived, so there is one place a
 * moment can be mistimed instead of two that can disagree.
 */
export function buildLaneSteps(timeline, servers) {
  const named = timeline.rests.map(rest => {
    const handover = /^handover:(\d+)$/.exec(rest.label);
    if (!handover) return stepAtRest(rest, rest.label);

    const server = servers[Number(handover[1])];
    return stepAtRest(rest, `${server ? server.id : 'server'} hands over`);
  });

  // Narration rests are steps too, so a viewer stepping through reads the line
  // before the movement it introduces.

  return buildSteps([{ at: 0, label: 'Shared ring' }, ...named], timeline.end);
}

/** The timeline the join stories pin against: six servers plus the one that joins. */
export const LANE_BEATS = buildLaneTimeline(7);

/**
 * Lanes are laid out for the final server count from the first frame, so that a
 * server joining never nudges the others. "Only its ranges moved" has to be true
 * of the drawing, not just of the narration.
 */
function laneGeometry(laneCount) {
  const step = (LAYOUT.band.outer - LAYOUT.band.inner) / Math.max(1, laneCount);

  return {
    radiusOf: index => LAYOUT.band.outer - index * step,
    width: step * 0.56,
  };
}

/**
 * Every lane separates on the same curve. The fan is produced by the inner lanes
 * having further to travel, not by staggering their starts, which keeps the gaps
 * between lanes even at every moment. The curve front-loads the movement because
 * lanes only stop overlapping once they are about half separated, and that is the
 * moment the picture starts making sense.
 */
function separationAt(timeline, progressValue) {
  return easeOutCubic(rangeProgress(progressValue, timeline.fanOut.from, timeline.fanOut.to));
}

/**
 * One handover, as the four windows it is made of. Every timing in the sequence
 * comes from here so that the rests the viewer steps between stay the rests the
 * scene was laid out with.
 */
const NO_HANDOVER = { start: Infinity, cross: 0, hold: 0, flight: 0, rest: 0 };

export function handoverPhasesOf(timeline, sourceIndex) {
  const handover = timeline.handover;
  // Read out of the timeline rather than multiplied out from a single step, because
  // the handovers are no longer the same length as each other.
  const { start, cross, hold, flight, rest } =
    handover?.phases?.[sourceIndex] ?? handover?.phases?.at(-1) ?? NO_HANDOVER;
  const lit = start + cross;
  const flightFrom = lit + hold;

  return {
    start,
    // The first lane is already lit when the others step back: nothing has dimmed
    // yet, so introducing it would mean dimming it and bringing it straight back.
    crossFrom: sourceIndex === 0 ? start - cross : start,
    lit,
    flightFrom,
    flightTo: flightFrom + flight,
    restTo: start + cross + hold + flight + rest,
  };
}

function travelAt(timeline, progressValue, sourceIndex) {
  const { flightFrom, flightTo } = handoverPhasesOf(timeline, sourceIndex);
  return easeInOutCubic(rangeProgress(progressValue, flightFrom, flightTo));
}

/**
 * How much of the floor a lane has: it crossfades in, holds it through its own
 * handover and the rest that follows, then crossfades out as the next lane takes
 * over. One lane's fade out is the next one's fade in, so the sequence reads as a
 * baton passed rather than as lanes blinking independently.
 */
function turnAt(timeline, progressValue, laneIndex) {
  const phases = handoverPhasesOf(timeline, laneIndex);
  const nextPhases = handoverPhasesOf(timeline, laneIndex + 1);

  return pulseProgress(progressValue, phases.crossFrom, phases.lit, phases.restTo, nextPhases.lit);
}

/** The moment a batch lands: a spike on contact, gone before the rest begins. */
function landingAt(timeline, progressValue, sourceIndex) {
  const { flightFrom, flightTo } = handoverPhasesOf(timeline, sourceIndex);

  return pulseProgress(
    progressValue,
    flightTo - (flightTo - flightFrom) * 0.35,
    flightTo,
    flightTo,
    flightTo + FLARE_DECAY
  );
}

/**
 * The fold back in, as a step index and how far through that step we are.
 *
 * Lanes recombine from the inside out: the new lane rises onto the one outside it,
 * then the pair onto the next, and so on until the ring is whole again. Each step
 * puts more of the circle back, so the ring visibly refills rather than simply
 * reappearing.
 */
function mergeAt(timeline, progressValue) {
  // A scene that only separates the lanes never folds them back, so it has no
  // merge phase at all.
  if (!timeline.merge) return null;

  const { from, step, move } = timeline.merge;
  if (progressValue <= from) return null;

  const index = Math.min(timeline.laneCount - 1, Math.floor((progressValue - from) / step));
  const stepStart = from + index * step;

  return {
    index,
    fraction: easeInOutCubic(rangeProgress(progressValue, stepStart, stepStart + move)),
  };
}

/**
 * The merge step at which a lane stops being a lane of its own: either it starts
 * moving, or the group arrives alongside it. Its empty track means "the space this
 * server does not own", which stops being true the moment it shares a radius.
 */
const laneMergeStep = (laneCount, laneIndex) => Math.max(0, laneCount - 2 - laneIndex);

/**
 * Tracks fade one lane at a time as the ring reassembles, mirroring the way they
 * arrived. Dropping them all at once made the fold-back read as a different kind
 * of movement from the fan-out, when it is the same one reversed.
 */
function trackFadeAt(timeline, progressValue, laneIndex) {
  if (!timeline.merge) return 1;

  const start =
    timeline.merge.from + laneMergeStep(timeline.laneCount, laneIndex) * timeline.merge.step;

  return 1 - rangeProgress(progressValue, start, start + timeline.merge.move);
}

function mergedRadiusOf(geometry, laneCount, laneIndex, merge) {
  // The last step lifts the reassembled ring back onto the ring it came from.
  if (merge.index >= laneCount - 1) {
    return mix(geometry.radiusOf(0), LAYOUT.referenceRadius, merge.fraction);
  }

  const movingFrom = laneCount - 1 - merge.index;
  if (laneIndex < movingFrom) return geometry.radiusOf(laneIndex);

  return mix(geometry.radiusOf(movingFrom), geometry.radiusOf(movingFrom - 1), merge.fraction);
}

function laneRadiusAt(timeline, geometry, progressValue, laneIndex) {
  const merge = mergeAt(timeline, progressValue);
  if (merge) return mergedRadiusOf(geometry, timeline.laneCount, laneIndex, merge);

  return mix(
    LAYOUT.referenceRadius,
    geometry.radiusOf(laneIndex),
    separationAt(timeline, progressValue)
  );
}

/**
 * Ranges that are not moving step back while ranges that are moving cross between
 * lanes, and come back up once everything has settled. Holding still is the claim
 * being made about them, and it is invisible unless the moving ones are louder.
 *
 * A lane brightens for its own handover, so the sequence reads as a list of
 * servers each giving something up rather than as one undifferentiated shuffle.
 */
/** How far into the table the newcomer's row has slid. Instant where there is none. */
function rosterAt(timeline, progressValue) {
  if (!timeline.roster) return 1;
  return easeOutCubic(rangeProgress(progressValue, timeline.roster.from, timeline.roster.to));
}

/** Zero for a scene that has no closing highlight, which is one without a remap. */
function highlightAt(timeline, progressValue) {
  if (!timeline.highlight) return 0;

  return pulseProgress(
    progressValue,
    timeline.highlight.from,
    timeline.highlight.to,
    timeline.highlightRestore.from,
    timeline.highlightRestore.to
  );
}

function laneOpacityAt(timeline, progressValue, laneIndex, isJoining) {
  // Everything steps back over the same window the first lane crossfades in, so
  // the sequence begins with one lane lit rather than with a flicker.
  // Without a remap there is no handover, so nothing ever steps back.
  if (!timeline.handover) return LANE_OPACITY.full;

  const steppedBack = rangeProgress(
    progressValue,
    timeline.handover.from,
    timeline.handover.from + timeline.handover.cross
  );
  const restored = rangeProgress(progressValue, timeline.restore.from, timeline.restore.to);
  // The lane receiving the ranges keeps the light for the whole sequence: they
  // have to arrive somewhere the eye is already looking.
  const turn = isJoining ? 1 : turnAt(timeline, progressValue, laneIndex);

  const attention = mix(
    LANE_OPACITY.full,
    LANE_OPACITY.dim,
    steppedBack * (1 - restored) * (1 - turn)
  );

  // The closing beat leaves only the newcomer lit, on a ring that is whole again.
  const highlight = isJoining ? 0 : highlightAt(timeline, progressValue);

  return attention * mix(1, LANE_OPACITY.highlighted, highlight);
}

/** How far outside its lane a label sits, on the ring's left. */
const LABEL_GAP = 12;

/**
 * How visible a lane's own name is.
 *
 * Only ever one at a time, and only when that lane is the subject: the source
 * during its handover, the newcomer while it stands alone. Seven names on screen
 * at once would be a legend, and the panel already is one — what the artwork was
 * missing is which of these rings the thing currently moving belongs to.
 *
 * Taken from `turnAt`, the same signal that decides which lane is lit, so a name
 * cannot appear on a lane that has stepped back or linger past its turn.
 */
function laneLabelAt(timeline, progressValue, laneIndex, isJoining) {
  if (isJoining) {
    const hold = timeline.newcomer;
    if (!hold) return 0;

    return pulseProgress(progressValue, hold.from, hold.from + 0.3, hold.to - 0.3, hold.to);
  }

  if (!timeline.handover) return 0;

  const phases = handoverPhasesOf(timeline, laneIndex);
  const next = handoverPhasesOf(timeline, laneIndex + 1);

  // `start`, not `crossFrom`. The first lane's *turn* opens early so its brightness
  // does not dip when everything else steps back — but a name appearing early
  // announces the handover while the scene is still holding on the rest before it.
  return pulseProgress(progressValue, phases.start, phases.lit, phases.restTo, next.lit);
}

/**
 * The name, right-aligned just outside its lane on the vertical midline, where the
 * composition is empty. It tracks the lane's radius, so it stays attached through
 * the fan-out and the fold back in.
 */
function LaneLabel({ progress, timeline, geometry, lane }) {
  const x = useTransform(
    progress,
    latest => LAYOUT.centreX - laneRadiusAt(timeline, geometry, latest, lane.index) - LABEL_GAP
  );
  const opacity = useTransform(progress, latest =>
    laneLabelAt(timeline, latest, lane.index, lane.isJoining)
  );

  return (
    <motion.text
      data-layer={`label:${lane.id}`}
      x={x}
      y={LAYOUT.centreY + 4}
      textAnchor="end"
      fontSize="12"
      letterSpacing="0.8"
      fill={lane.color}
      style={{ opacity }}
    >
      {lane.id}
    </motion.text>
  );
}

/**
 * A server's ranges as one dashed circle. Because the dash pattern is in position
 * units, the same element is the arc on the shared ring, the arc in a lane, and
 * every frame in between; only `r` changes.
 */
function LaneRing({
  progress,
  radiusFor,
  pattern,
  color,
  width,
  widthFor,
  opacityFor,
  ephemeral,
  layer,
}) {
  const radius = useTransform(progress, radiusFor);
  const opacity = useTransform(progress, opacityFor ?? (() => 1));
  const strokeWidth = useTransform(progress, widthFor ?? (() => width));

  // A server that owns nothing is drawn by not drawing it.
  if (pattern === null) return null;

  return (
    <motion.circle
      data-layer={layer}
      data-ephemeral={ephemeral ? 'true' : undefined}
      cx={LAYOUT.centreX}
      cy={LAYOUT.centreY}
      r={radius}
      pathLength="1"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={pattern?.dashArray}
      strokeDashoffset={pattern?.dashOffset}
      style={{ opacity }}
    />
  );
}

/**
 * The ranges one server loses, carried from its lane to the joining server's.
 *
 * They are the same dashed circle as a lane, so they cross at a fixed angle and
 * arrive already in formation. The colour changes hands on the way, which is the
 * whole of what a remap is, and the batch flares as it lands so that each arrival
 * registers as a separate event.
 */
function TravellingRanges({
  progress,
  timeline,
  geometry,
  source,
  sourceIndex,
  targetIndex,
  targetColor,
}) {
  const travel = useTransform(progress, latest => travelAt(timeline, latest, sourceIndex));
  const color = useTransform(travel, [0, 1], [source.color, targetColor]);
  const pattern = buildDashPattern(source.ranges);

  const radiusFor = latest =>
    mix(
      laneRadiusAt(timeline, geometry, latest, sourceIndex),
      laneRadiusAt(timeline, geometry, latest, targetIndex),
      travelAt(timeline, latest, sourceIndex)
    );

  // Lifted off the lane while in flight, so a range in transit is never mistaken
  // for one that has settled.
  const widthFor = latest =>
    geometry.width * (1 + 0.35 * Math.sin(travelAt(timeline, latest, sourceIndex) * Math.PI));

  /**
   * A batch belongs to the lane it is leaving until it leaves, and to the lane it
   * is joining once it arrives. Holding it at full brightness throughout meant a
   * dimmed lane still showed its about-to-move ranges lit, which pre-announced
   * every handover several turns early.
   */
  const opacityFor = latest =>
    mix(
      laneOpacityAt(timeline, latest, sourceIndex, false),
      laneOpacityAt(timeline, latest, targetIndex, true),
      travelAt(timeline, latest, sourceIndex)
    );

  return (
    <g>
      {/* The flare on arrival is decoration: it is allowed to still be decaying at
          a rest, which is what `data-ephemeral` tells the rest guard. */}
      <LaneRing
        layer={`flare:${source.id}`}
        ephemeral
        progress={progress}
        radiusFor={radiusFor}
        pattern={pattern}
        color={targetColor}
        width={geometry.width}
        widthFor={() => geometry.width * 2.6}
        opacityFor={latest => 0.35 * landingAt(timeline, latest, sourceIndex)}
      />
      <LaneRing
        layer={`travel:${source.id}`}
        progress={progress}
        radiusFor={radiusFor}
        pattern={pattern}
        color={color}
        width={geometry.width}
        widthFor={widthFor}
        opacityFor={opacityFor}
      />
    </g>
  );
}

/**
 * Treatment 6A: one lane per server, each carrying that server's own ranges.
 *
 * The claim it makes is the one that survives at scale: every server is
 * everywhere, and the ink in a lane is its share. Nothing is coloured by "who owns
 * this slice of the ring", so there is no point at which the picture states
 * something the data does not support.
 *
 * The scene begins and ends on the same single ring. In between it takes the ring
 * apart to show what it is made of, hands one server's worth of ranges over, and
 * puts it back — and because nothing ever moves around the ring, only across it,
 * every one of those steps can be followed by holding on to one arc.
 *
 * The timeline is handed in rather than built here. It used to be built in both
 * places, and the two promptly disagreed: the scene asked for a join that starts
 * from settled lanes and the artwork, holding its own copy, went on separating them
 * from scratch.
 */
export function FullScaleLanes({ model, progress, timeline }) {
  const { centreX, centreY } = LAYOUT;
  const { servers, remap, stolenFrom, beforeShares, shares } = model;
  const geometry = laneGeometry(servers.length);

  const lanes = servers.map((server, index) => ({
    ...server,
    index,
    pattern: buildDashPattern(laneRanges(model, server.id)),
    isJoining: remap ? server.id === remap.serverId : false,
  }));

  const joiningIndex = lanes.findIndex(lane => lane.isJoining);
  const seam = ringPoint({ ...LAYOUT, radius: LAYOUT.referenceRadius, position: 0 });

  const radiusFor = index => latest => laneRadiusAt(timeline, geometry, latest, index);

  /**
   * Shares follow the handover itself rather than settling afterwards, so a bar
   * moving is the same event as the ranges arriving. The newcomer's bar tracks how
   * much of the moved space has actually landed, weighted by size, which is why it
   * climbs in the same uneven steps the ring does.
   */
  const stolenTotal = stolenFrom.reduce(
    (sum, source) => sum + source.ranges.reduce((span, range) => span + (range.to - range.from), 0),
    0
  );
  const landedAt = latest =>
    stolenTotal === 0
      ? 1
      : stolenFrom.reduce((sum, source) => {
          const lane = lanes.find(entry => entry.id === source.id);
          const span = source.ranges.reduce((total, range) => total + (range.to - range.from), 0);
          return sum + span * travelAt(timeline, latest, lane.index);
        }, 0) / stolenTotal;

  const rows = servers.map(server => ({
    id: server.id,
    color: server.color,
    from: beforeShares.find(entry => entry.id === server.id)?.share ?? 0,
    to: shares.find(entry => entry.id === server.id)?.share ?? 0,
  }));

  const settleFor = (latest, rowIndex) => {
    if (!remap) return 1;
    if (rowIndex === joiningIndex) return landedAt(latest);
    return travelAt(timeline, latest, rowIndex);
  };

  return (
    <g>
      <circle
        data-layer="reference-ring"
        cx={centreX}
        cy={centreY}
        r={LAYOUT.referenceRadius}
        fill="none"
        stroke={palette.ring}
        strokeWidth="1.25"
        opacity="0.35"
      />
      {/* The seam is marked but not labelled. At this density the ring is being
          read as proportions rather than as addresses, and a hex value on it
          invites a viewer to look for a number they cannot use. Where positions
          are worth naming is at low density, which the scene does not yet have. */}
      <line
        data-layer="seam"
        x1={seam.x}
        y1={seam.y - 9}
        x2={seam.x}
        y2={seam.y + 9}
        stroke={palette.bright}
        strokeWidth="1.25"
        opacity="0.6"
      />

      {/* The empty track is half the statement: it shows how much of the ring a
          server does not own, so a lane reads as a proportion. It has nothing to
          say while the lanes are stacked on the shared ring, at either end. */}
      {lanes.map(lane => (
        <LaneRing
          key={`track-${lane.id}`}
          layer={`track:${lane.id}`}
          progress={progress}
          radiusFor={radiusFor(lane.index)}
          color={lane.color}
          width={geometry.width}
          opacityFor={latest =>
            0.09 *
            (lane.isJoining
              ? rangeProgress(latest, timeline.join.from, timeline.join.to)
              : separationAt(timeline, latest)) *
            trackFadeAt(timeline, latest, lane.index)
          }
        />
      ))}

      {lanes.map(lane => (
        <LaneRing
          key={`lane-${lane.id}`}
          layer={`lane:${lane.id}`}
          progress={progress}
          radiusFor={radiusFor(lane.index)}
          pattern={lane.pattern}
          color={lane.color}
          width={geometry.width}
          opacityFor={latest => laneOpacityAt(timeline, latest, lane.index, lane.isJoining)}
        />
      ))}

      {lanes.map(lane => (
        <LaneLabel
          key={`label-${lane.id}`}
          progress={progress}
          timeline={timeline}
          geometry={geometry}
          lane={lane}
        />
      ))}

      {stolenFrom.map(source => (
        <TravellingRanges
          key={`travel-${source.id}`}
          progress={progress}
          timeline={timeline}
          geometry={geometry}
          source={source}
          sourceIndex={lanes.find(lane => lane.id === source.id).index}
          targetIndex={joiningIndex}
          targetColor={lanes[joiningIndex].color}
        />
      ))}

      <ServerLoadPanel
        {...LAYOUT.panel}
        rows={rows}
        progress={progress}
        settleFor={settleFor}
        /**
         * The panel is faintly present from the first frame rather than fading up
         * from nothing. The ring is composed off-centre to leave room for it, so
         * an empty right-hand side does not read as space being reserved — it
         * reads as a ring that has been pushed out of true.
         */
        revealFor={latest =>
          mix(PANEL_PRESENCE, 1, rangeProgress(latest, timeline.panel.from, timeline.panel.to))
        }
        rowOpacityFor={(latest, rowIndex) => {
          if (!remap) return 1;
          // The newcomer's row is absent until it arrives, and then never dims: it
          // is what the closing highlight is highlighting.
          if (rowIndex === joiningIndex) return rosterAt(timeline, latest);
          return mix(1, 0.25, highlightAt(timeline, latest));
        }}
        rowShiftFor={(latest, rowIndex) =>
          rowIndex === joiningIndex && remap
            ? (1 - rosterAt(timeline, latest)) * ROSTER_SLIDE_FROM
            : 0
        }
        remap={remap}
        remapProgressFor={landedAt}
        remapRevealFor={latest =>
          timeline.handover
            ? rangeProgress(latest, timeline.handover.from, timeline.handover.from + 0.4)
            : 0
        }
      />

      {/* Under the panel's last line, in the column the numbers already own. */}
      <SceneAnnotation
        progress={progress}
        x={LAYOUT.panel.x}
        y={500}
        width={LAYOUT.panel.width}
        textFor={latest => annotationAt(timeline, latest)}
        presenceFor={latest => annotationPresenceAt(timeline, latest)}
      />
    </g>
  );
}

export default FullScaleLanes;
