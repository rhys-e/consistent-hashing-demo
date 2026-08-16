import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../themes';
import { easeInOutCubic, easeOutCubic, mix, pulseProgress, rangeProgress } from '../story/easing';
import { buildDashPattern } from '../story/ringDash';
import { laneRanges } from '../story/topology';
import {
  annotationAt,
  annotationPresenceAt,
  buildSteps,
  createTimeline,
  stepAtRest,
} from '../story/sceneSteps';
import { ringPoint } from '../story/projection';
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

const OPENING = 1;
const FAN_OUT = 1.5;
const PANEL = 0.45;
const JOIN = 0.45;
/** Roster first, then the ring. The newcomer is a row before it is a lane. */
const ROSTER = { slide: 0.7, rest: 2 };
const ROSTER_SLIDE_FROM = 44;
/** First handover is slow enough to read; the rest are a montage. */
const TEACH = { cross: 0.25, hold: 0.6, flight: 0.85, rest: 0.55 };
const MONTAGE = { cross: 0.15, hold: 0.1, flight: 0.3, rest: 0.3 };
const handoverShape = index => (index === 0 ? TEACH : MONTAGE);
/** Hold the newcomer alone so the last handover has somewhere to land. */
const NEWCOMER = { hold: 1.8, restore: 0.45 };
const ASSEMBLED_REST = 0.7;
const MERGE = { move: 0.28, rest: 0.24 };
/** Highlight what moved, then restore so the untouched ring is the last frame. */
const HIGHLIGHT = { move: 0.55, restore: 0.8 };
const WHOLE_REST = 1.6;
const REST = 0.35;
const NEW_LANE_REST = 1.5;
const READING_REST = 5;
const CLOSING_REST = READING_REST;

/** A flare is an event. It peaks on contact and is gone before the pause is. */
const FLARE_DECAY = 0.18;

const LANE_OPACITY = { full: 0.92, dim: 0.14, highlighted: 0.12 };

function addJoin(timeline, laneCount, sources) {
  const roster = timeline.move(ROSTER.slide);
  timeline.annotate(
    'A seventh server joins. Each existing server gives up a few of its ranges to the newcomer.'
  );
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

  // Extra phase: the last outgoing lane's fade, so "handover after the last" is real.
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
  timeline.annotate(
    'Only these ranges changed hands. Most keys stayed put, and the load stays even, with no map to update.'
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
    assembled: assembledRest.to,
    merge: { from: mergeFrom, to: mergeTo, step: MERGE.move + MERGE.rest, move: MERGE.move },
    highlight,
    // Not `restore`: that name is the newcomer's fade-up; shadowing it retargets opacity.
    highlightRestore: restoreHighlight,
  };
}

/** `fromSettled` skips the fan-out. The join scene does not use it. */
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

/** Steps from the timeline's own rests. */
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

/** Laid out for the final count from frame one, so a join never nudges the others. */
function laneGeometry(laneCount) {
  const step = (LAYOUT.band.outer - LAYOUT.band.inner) / Math.max(1, laneCount);

  return {
    radiusOf: index => LAYOUT.band.outer - index * step,
    width: step * 0.56,
  };
}

/** Same curve for every lane. Inner lanes travel further, so gaps stay even. */
function separationAt(timeline, progressValue) {
  return easeOutCubic(rangeProgress(progressValue, timeline.fanOut.from, timeline.fanOut.to));
}

/** One handover as its four windows. */
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

/** Floor of the current handover: fade in, hold, fade out as the next takes over. */
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

/** Fold-back step index and progress. Inside-out, so the ring refills. */
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

/** Merge step where a lane shares a radius and its empty track stops being true. */
const laneMergeStep = (laneCount, laneIndex) => Math.max(0, laneCount - 2 - laneIndex);

/** Tracks fade one lane at a time, the fan-out reversed. */
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

/** Still ranges dim while moving ones cross, so holding still is visible. */
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

/** One name at a time, from `turnAt`: the source during handover, or the newcomer. */
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

/** Name outside its lane on the left midline, tracking radius. */
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

/** One dashed circle per server. Only `r` changes between ring and lane. */
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

/** Ranges crossing from a source lane to the newcomer. Colour changes on the way. */
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

  /** Dim with the source until it leaves; do not pre-announce the next handover. */
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

/** One lane per server. Timeline is passed in so the scene and artwork cannot disagree. */
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

  /** Shares follow the handover, so a bar moving is the ranges arriving. */
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
        // Only the numbers fade in. The panel around them is drawn from the first
        // frame — see `ServerLoadPanel`.
        revealFor={latest => rangeProgress(latest, timeline.panel.from, timeline.panel.to)}
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
        // Six servers are on the ring when the scene opens and seven when it ends,
        // so a mark fixed at a seventh calls all six of them overloaded for the
        // first third of the scene, when in fact their split is exactly even. The
        // mark moves with the roster, on the same window the newcomer's row slides
        // in on: the row appearing is the server existing.
        evenShare={1 / servers.length}
        evenShareFor={
          joiningIndex >= 0
            ? latest =>
                mix(1 / (servers.length - 1), 1 / servers.length, rosterAt(timeline, latest))
            : undefined
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
