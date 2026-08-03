import React from 'react';
import { motion, useTransform } from 'motion/react';
import { getArcHeight, getArcRadius, projectOffset, projectPosition } from '../story/projection';
import {
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  mix,
  pulseProgress,
  rangeProgress,
} from '../story/easing';
import { useSceneTimeline } from '../story/useSceneTimeline';
import {
  annotationAt,
  annotationPresenceAt,
  buildSteps,
  createTimeline,
  stepAtRest,
} from '../story/sceneSteps';
import { useHashDecode } from '../story/useHashDecode';
import { SAMPLE_KEYS, decorateSampleKeys, toHashLabel } from '../story/hashSpace';
import { STAGE } from '../story/stage';
import {
  BackdropGrid,
  BoundsLabel,
  HashSpaceDefs,
  KeyAnnotation,
  KeyMarker,
  RailPath,
  RailScaffold,
  palette,
} from './HashSpaceLayers';
import SceneControls from './SceneControls';
import SceneFrame from './SceneFrame';
import SceneAnnotation from './SceneAnnotation';

/**
 * The opening: a hash space drawn as a number line, and the same line wrapped
 * into a ring.
 *
 * These were two scenes, and keeping them apart cost more than it bought. The
 * bend only means anything because the line before it and the ring after it are
 * demonstrably the same object, which took a shared drawing layer and a test
 * asserting that one scene's last frame equalled the next one's first. Making it
 * one scene makes that structural: there is no seam to keep closed, because there
 * is no longer a join.
 *
 * Every element positions itself through one projection parameterised by how far
 * the rail has bent, so the whole composition — ticks, labels, keys, the seam —
 * follows from a single scalar running from "straight" to "closed".
 */

const PREFIX = 'hash-space';
const { width, height, centreY, anchorX } = STAGE;

/**
 * The rail grows as it curls, because a straight line of length L closes into a
 * ring only 0.318L across. Scaling keeps the ring a usable size on screen while
 * relative spacing between positions is preserved, which is what lets a viewer
 * track individual keys through the bend.
 */
const RAIL_LENGTH = STAGE.railLength;

const BEAM = { top: centreY - 162, bottom: centreY + 100, width: 14 };

/** Offsets within a single key's beat, in beat units. */
const KEY_BEAT = {
  beamIn: 0.18,
  beamHoldEnd: 0.62,
  beamOut: 0.82,
  annotationFrom: 0.08,
  annotationTo: 0.4,
  decodeFrom: 0.1,
  decodeTo: 0.58,
  settleFrom: 0.55,
  settleTo: 0.92,
};

const RAIL = { move: 1, rest: 0.35 };
const KEY = { move: 1, rest: 0.35 };
const MORPH = { move: 1.8 };
/** The pulse starts just before the ends meet and outlasts the bend. */
const SEAM = { lead: 0.2, peak: 0.2, tail: 0.7 };
const CLOSE_REST = 0.5;
/**
 * The card, held before the bend. Long enough to be read without hurrying, and
 * the bend that follows keeps it up for a while longer.
 */
const CARD_REST = 3;
/**
 * Top left, which is the only corner clear in *both* shapes.
 *
 * Bottom left looks free while the rail is straight and is not: `user:1842` is the
 * leftmost key, so the bend carries its label down into that corner. A card has to
 * be placed against the frame the scene ends on as well as the one it starts on,
 * or it collides with something that was nowhere near it when it was positioned.
 */
const CARD = { x: 60, y: 96, width: 250 };

/** How far into the bend the ring's own atmosphere starts to resolve. */
const RING_PRESENCE = { from: 0.55, to: 1 };

const POLAR_GRID = {
  spokeInner: 0.32,
  spokeOuter: 0.96,
  circles: [0.45, 0.72],
};

/**
 * The scene as durations laid end to end, so the quiet moments a viewer steps
 * between are part of the timing rather than whatever gap is left over.
 */
const TIMELINE = (() => {
  const timeline = createTimeline();

  const opening = timeline.rest(RAIL.rest, 'Empty stage');
  const rail = timeline.move(RAIL.move);
  const drawn = timeline.rest(RAIL.rest, 'Rail drawn');

  const keys = SAMPLE_KEYS.map(sampleKey => {
    const beatStart = timeline.at();
    timeline.skip(KEY.move);
    return { beatStart, rest: timeline.rest(KEY.rest, `${sampleKey.keyName} landed`) };
  });

  // Said while it is still a line, and the one thing three keys landing cannot
  // show: that landing there was not a choice and will not change. The bend then
  // has something to preserve.
  timeline.annotate("A key's hash is its position. The same key always lands in the same place.");
  const card = timeline.rest(CARD_REST, 'Positions fixed');

  const morph = timeline.move(MORPH.move);
  const seam = {
    from: morph.to - SEAM.lead,
    peakStart: morph.to,
    peakEnd: morph.to + SEAM.peak,
    to: morph.to + SEAM.tail,
  };

  // The pulse is decoration, but a step landing inside one shows a scene still
  // animating after the viewer has arrived, so the rest waits for it.
  timeline.skip(SEAM.tail);
  const closed = timeline.rest(CLOSE_REST, 'Ring closed');

  return {
    opening,
    rail,
    drawn,
    keys,
    card,
    morph,
    seam,
    closed,
    annotations: timeline.annotations(),
    end: timeline.at(),
  };
})();

const BEAT_COUNT = TIMELINE.end;

export const SCENE_STEPS = buildSteps(
  [
    stepAtRest(TIMELINE.opening, 'Empty stage'),
    stepAtRest(TIMELINE.drawn, 'Rail drawn'),
    ...TIMELINE.keys.map(key => stepAtRest(key.rest, key.rest.label)),
    stepAtRest(TIMELINE.card, TIMELINE.card.label),
    stepAtRest(TIMELINE.closed, 'Ring closed'),
  ],
  BEAT_COUNT
);

function morphAt(progressValue) {
  return easeInOutCubic(rangeProgress(progressValue, TIMELINE.morph.from, TIMELINE.morph.to));
}

/**
 * Every animated element reads its geometry from here, so the whole composition
 * bends coherently off one scalar. At morph 0 this is a plain horizontal rail,
 * which is why the first two thirds of the scene can be a number line without
 * anything knowing it is one.
 */
function railStateFor(progressValue) {
  const bend = morphAt(progressValue);
  const length = mix(RAIL_LENGTH.straight, RAIL_LENGTH.closed, bend);
  const arcHeight = getArcHeight({ bend, length });

  return { bend, length, anchorX, anchorY: centreY - arcHeight / 2 };
}

const ringPresenceFor = progressValue =>
  rangeProgress(morphAt(progressValue), RING_PRESENCE.from, RING_PRESENCE.to);

function railPoint(position) {
  return projectPosition({ position, ...railStateFor(0) });
}

function getSceneKeys() {
  return decorateSampleKeys().map((sampleKey, index) => ({
    ...sampleKey,
    x: railPoint(sampleKey.position).x,
    beatStart: TIMELINE.keys[index].beatStart,
  }));
}

/**
 * Spokes on the tick positions and a couple of concentric circles: the polar
 * equivalent of the cartesian grid behind the number line, resolving in as the
 * geometry it belongs to appears.
 */
function buildSpokesPath(railState) {
  const radius = getArcRadius(railState);
  if (!Number.isFinite(radius)) return '';

  const { count } = STAGE.ticks;
  const segments = [];

  for (let index = 0; index < count; index++) {
    const position = index / count;
    const inner = projectOffset({
      ...railState,
      position,
      offset: -radius * (1 - POLAR_GRID.spokeInner),
    });
    const outer = projectOffset({
      ...railState,
      position,
      offset: -radius * (1 - POLAR_GRID.spokeOuter),
    });

    segments.push(
      `M ${inner.x.toFixed(2)} ${inner.y.toFixed(2)} L ${outer.x.toFixed(2)} ${outer.y.toFixed(2)}`
    );
  }

  return segments.join(' ');
}

function useArcCentreY(progress) {
  return useTransform(progress, latest => {
    const railState = railStateFor(latest);
    const radius = getArcRadius(railState);
    return Number.isFinite(radius) ? railState.anchorY + radius : centreY;
  });
}

function useArcRadius(progress, fraction) {
  return useTransform(progress, latest => {
    const radius = getArcRadius(railStateFor(latest));
    return Number.isFinite(radius) ? radius * fraction : 0;
  });
}

function PolarGrid({ progress }) {
  const spokes = useTransform(progress, latest => buildSpokesPath(railStateFor(latest)));
  const opacity = useTransform(progress, ringPresenceFor);
  const centreOfArc = useArcCentreY(progress);
  const innerRadius = useArcRadius(progress, POLAR_GRID.circles[0]);
  const outerRadius = useArcRadius(progress, POLAR_GRID.circles[1]);

  return (
    <motion.g style={{ opacity }} stroke={palette.grid} fill="none" strokeWidth="0.75">
      <motion.path d={spokes} />
      <motion.circle cx={anchorX} cy={centreOfArc} r={innerRadius} />
      <motion.circle cx={anchorX} cy={centreOfArc} r={outerRadius} />
    </motion.g>
  );
}

function SeamPulse({ progress }) {
  const opacity = useTransform(progress, latest =>
    pulseProgress(
      latest,
      TIMELINE.seam.from,
      TIMELINE.seam.peakStart,
      TIMELINE.seam.peakEnd,
      TIMELINE.seam.to
    )
  );
  const radius = useTransform(progress, latest =>
    mix(8, 34, rangeProgress(latest, TIMELINE.seam.from, TIMELINE.seam.to))
  );
  const x = useTransform(
    progress,
    latest => projectPosition({ position: 0, ...railStateFor(latest) }).x
  );
  const y = useTransform(
    progress,
    latest => projectPosition({ position: 0, ...railStateFor(latest) }).y
  );

  return (
    <motion.circle
      data-ephemeral="true"
      cx={x}
      cy={y}
      r={radius}
      style={{ opacity }}
      fill="none"
      stroke={palette.bright}
      strokeWidth="1.25"
    />
  );
}

function ScannerBeam({ sampleKey, progress }) {
  const { top, width: beamWidth } = BEAM;
  const railY = centreY;
  const { x, color, beatStart } = sampleKey;

  const opacity = useTransform(progress, latest =>
    pulseProgress(
      latest,
      beatStart,
      beatStart + KEY_BEAT.beamIn,
      beatStart + KEY_BEAT.beamHoldEnd,
      beatStart + KEY_BEAT.beamOut
    )
  );

  // The shaft and head stop at the rail, so the beam reads as delivering a key
  // to a position rather than sweeping through empty space below it.
  const shaftProgress = useTransform(progress, latest =>
    easeOutCubic(rangeProgress(latest, beatStart, beatStart + KEY_BEAT.beamIn))
  );
  const shaftEnd = useTransform(shaftProgress, latest => mix(top, railY, latest));
  const headY = shaftEnd;

  const headOpacity = useTransform(progress, latest =>
    pulseProgress(
      latest,
      beatStart,
      beatStart + KEY_BEAT.beamIn * 0.45,
      beatStart + KEY_BEAT.beamIn,
      beatStart + KEY_BEAT.beamIn + 0.18
    )
  );

  const contact = useTransform(progress, latest =>
    pulseProgress(
      latest,
      beatStart + KEY_BEAT.beamIn * 0.7,
      beatStart + KEY_BEAT.beamIn,
      beatStart + KEY_BEAT.settleFrom,
      beatStart + KEY_BEAT.settleTo
    )
  );
  const contactWidth = useTransform(contact, latest => mix(4, 22, latest));

  return (
    <motion.g style={{ opacity }}>
      {/* Soft bloom is blurred so the sides fall off; the bright core stays crisp
          outside that filter. The vertical mask peaks intensity at the rail. */}
      <g mask={`url(#${PREFIX}-beam-mask)`}>
        <g filter={`url(#${PREFIX}-beam-bloom)`}>
          <motion.line
            x1={x}
            y1={top}
            x2={x}
            y2={shaftEnd}
            stroke={color}
            strokeWidth={beamWidth * 2.2}
            strokeLinecap="round"
            opacity="0.22"
          />
          <motion.line
            x1={x}
            y1={top}
            x2={x}
            y2={shaftEnd}
            stroke={color}
            strokeWidth={beamWidth}
            strokeLinecap="round"
            opacity="0.35"
          />
        </g>
        <motion.line
          x1={x}
          y1={top}
          x2={x}
          y2={shaftEnd}
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          opacity="0.95"
        />
      </g>

      <motion.g style={{ opacity: contact }}>
        <motion.ellipse cx={x} cy={railY} rx={contactWidth} ry="4" fill={color} opacity="0.2" />
        <motion.ellipse cx={x} cy={railY} rx={contactWidth} ry="1.25" fill={color} opacity="0.9" />
      </motion.g>

      <motion.g style={{ opacity: headOpacity }}>
        <motion.circle cx={x} cy={headY} r="9" fill={color} opacity="0.14" />
        <motion.circle cx={x} cy={headY} r="3.2" fill={color} />
      </motion.g>
    </motion.g>
  );
}

/** Transient ring under the beam, gone by the time the key has settled. */
function ArrivalPulse({ sampleKey, progress }) {
  const { x, color, beatStart } = sampleKey;

  const opacity = useTransform(progress, latest =>
    pulseProgress(
      latest,
      beatStart + 0.05,
      beatStart + KEY_BEAT.beamIn,
      beatStart + KEY_BEAT.settleFrom,
      beatStart + KEY_BEAT.settleTo
    )
  );

  return (
    <motion.g style={{ opacity }}>
      <circle cx={x} cy={centreY} r="12" fill={color} opacity="0.08" />
      <circle
        cx={x}
        cy={centreY}
        r="6.5"
        fill="none"
        stroke={color}
        strokeWidth="1.25"
        opacity="0.85"
      />
    </motion.g>
  );
}

function DecodingAnnotation({ sampleKey, progress }) {
  const { beatStart } = sampleKey;

  const hashText = useHashDecode({
    hashValue: sampleKey.hashLabel,
    progress,
    from: beatStart + KEY_BEAT.decodeFrom,
    to: beatStart + KEY_BEAT.decodeTo,
  });

  return (
    <KeyAnnotation
      progress={progress}
      railStateFor={railStateFor}
      sampleKey={sampleKey}
      hashText={hashText}
      opacityFor={latest =>
        rangeProgress(
          latest,
          beatStart + KEY_BEAT.annotationFrom,
          beatStart + KEY_BEAT.annotationTo
        )
      }
      stemFor={latest =>
        easeOutCubic(
          rangeProgress(
            latest,
            beatStart + KEY_BEAT.annotationFrom,
            beatStart + KEY_BEAT.settleFrom
          )
        )
      }
    />
  );
}

export function HashSpaceScene({
  pinnedProgress = null,
  secondsPerBeat = 1.5,
  active = true,
  engaged = false,
  onComplete,
}) {
  const timeline = useSceneTimeline({
    beatCount: BEAT_COUNT,
    steps: SCENE_STEPS,
    secondsPerBeat,
    pinnedProgress,
    autoPlay: active,
  });
  const { progress, status } = timeline;
  const isPinned = pinnedProgress !== null && pinnedProgress !== undefined;

  React.useEffect(() => {
    if (status === 'ended') onComplete?.();
  }, [onComplete, status]);

  const sceneKeys = getSceneKeys();
  const ringPresence = useTransform(progress, ringPresenceFor);
  const atmosphereRadius = useArcRadius(progress, 0.92);
  const atmosphereY = useArcCentreY(progress);

  // The rail's ends stop being ends once they meet, so the gradient that fades
  // them out resolves into the core colour as the seam closes.
  const railEndOpacity = useTransform(progress, latest => mix(0.25, 0.85, ringPresenceFor(latest)));
  const railEndColor = useTransform(ringPresence, [0, 1], [palette.railEdge, palette.railCore]);

  // Hands off until the viewer takes over — and only then. Revealing the transport
  // when a scene finishes put it on screen at the exact moment the deck was about
  // to move on, which is clutter arriving too late to be useful.
  const showControls = !isPinned && engaged;

  return (
    <SceneFrame
      active={active}
      actions={showControls ? <SceneControls timeline={timeline} enabled={active} /> : null}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="A hash space drawn as a number line from zero to two to the power thirty two minus one, with sample keys hashing to fixed positions, then bending until its two ends meet and it becomes a ring."
        className="h-full w-full"
      >
        <defs>
          <HashSpaceDefs
            prefix={PREFIX}
            railEndColor={railEndColor}
            railEndOpacity={railEndOpacity}
          />

          <radialGradient id={`${PREFIX}-atmosphere`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.railEdge} stopOpacity="0.18" />
            <stop offset="55%" stopColor={palette.railEdge} stopOpacity="0.06" />
            <stop offset="100%" stopColor={palette.railEdge} stopOpacity="0" />
          </radialGradient>

          {/* Brightest at the rail contact so the shaft reads as aiming at a
              point, not as a uniformly lit column. */}
          <linearGradient id={`${PREFIX}-beam-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="18%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="62%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          <mask
            id={`${PREFIX}-beam-mask`}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={width}
            height={height}
          >
            <rect
              x="0"
              y={BEAM.top}
              width={width}
              height={BEAM.bottom - BEAM.top}
              fill={`url(#${PREFIX}-beam-fade)`}
            />
          </mask>

          <filter
            id={`${PREFIX}-beam-bloom`}
            filterUnits="userSpaceOnUse"
            x="0"
            y={BEAM.top - 20}
            width={width}
            height={BEAM.bottom - BEAM.top + 40}
          >
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        <BackdropGrid prefix={PREFIX} />

        <motion.circle
          cx={anchorX}
          cy={atmosphereY}
          r={atmosphereRadius}
          fill={`url(#${PREFIX}-atmosphere)`}
          style={{ opacity: ringPresence }}
        />

        <PolarGrid progress={progress} />

        <RailScaffold
          progress={progress}
          railStateFor={railStateFor}
          opacityFor={latest =>
            rangeProgress(latest, mix(TIMELINE.rail.from, TIMELINE.rail.to, 0.55), TIMELINE.rail.to)
          }
        />

        <BoundsLabel
          progress={progress}
          railStateFor={railStateFor}
          position={0}
          label={toHashLabel(0)}
          opacityFor={latest =>
            rangeProgress(latest, mix(TIMELINE.rail.from, TIMELINE.rail.to, 0.55), TIMELINE.rail.to)
          }
        />
        <BoundsLabel
          progress={progress}
          railStateFor={railStateFor}
          position={1}
          label={toHashLabel(1)}
          opacityFor={latest =>
            rangeProgress(latest, mix(TIMELINE.rail.from, TIMELINE.rail.to, 0.55), TIMELINE.rail.to)
          }
        />

        <RailPath
          prefix={PREFIX}
          progress={progress}
          railStateFor={railStateFor}
          drawnFor={latest =>
            easeOutCubic(rangeProgress(latest, TIMELINE.rail.from, TIMELINE.rail.to))
          }
          haloFor={ringPresenceFor}
        />

        {sceneKeys.map(sampleKey => (
          <ScannerBeam key={`beam-${sampleKey.slug}`} sampleKey={sampleKey} progress={progress} />
        ))}

        <SeamPulse progress={progress} />

        {sceneKeys.map(sampleKey => (
          <DecodingAnnotation
            key={`annotation-${sampleKey.slug}`}
            sampleKey={sampleKey}
            progress={progress}
          />
        ))}

        {sceneKeys.map(sampleKey => (
          <ArrivalPulse
            key={`arrival-${sampleKey.slug}`}
            sampleKey={sampleKey}
            progress={progress}
          />
        ))}

        {sceneKeys.map(sampleKey => (
          <KeyMarker
            key={`marker-${sampleKey.slug}`}
            progress={progress}
            railStateFor={railStateFor}
            sampleKey={sampleKey}
            scaleFor={latest =>
              easeOutBack(
                rangeProgress(
                  latest,
                  sampleKey.beatStart + KEY_BEAT.settleFrom,
                  sampleKey.beatStart + KEY_BEAT.settleTo
                )
              )
            }
          />
        ))}

        <SceneAnnotation
          progress={progress}
          x={CARD.x}
          y={CARD.y}
          width={CARD.width}
          textFor={latest => annotationAt(TIMELINE, latest)}
          presenceFor={latest => annotationPresenceAt(TIMELINE, latest)}
        />
      </svg>
    </SceneFrame>
  );
}

export default HashSpaceScene;
