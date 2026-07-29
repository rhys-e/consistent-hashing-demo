import React from 'react';
import { motion, useTransform } from 'motion/react';
import { getArcHeight, getArcRadius, projectOffset, projectPosition } from '../../story/projection';
import { easeInOutCubic, mix, pulseProgress, rangeProgress } from '../../story/easing';
import { useSceneTimeline } from '../../story/useSceneTimeline';
import { decorateSampleKeys, toHashLabel } from '../../story/hashSpace';
import { STAGE } from '../../story/stage';
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
import SceneFrame from './SceneFrame';

const PREFIX = 'scene1';
const { width, height, centreY, anchorX } = STAGE;

/**
 * The rail grows as it curls, because a straight line of length L closes into a
 * ring only 0.318L across. Scaling keeps the ring a usable size on screen while
 * relative spacing between positions is preserved, which is what matters for
 * letting the viewer track individual keys through the bend.
 *
 * The straight length is shared with Scene 0 via STAGE so the two scenes render
 * at the same on-screen scale.
 */
const RAIL_LENGTH = STAGE.railLength;

const MORPH = { from: 0.4, to: 2.2 };
const SEAM = { from: 2.0, peakStart: 2.2, peakEnd: 2.4, to: 2.9 };
/** How far into the bend the ring's own atmosphere starts to resolve. */
const RING_PRESENCE = { from: 0.55, to: 1 };
const BEAT_COUNT = 3;

const POLAR_GRID = {
  spokeInner: 0.32,
  spokeOuter: 0.96,
  circles: [0.45, 0.72],
};

function morphAt(progressValue) {
  return easeInOutCubic(rangeProgress(progressValue, MORPH.from, MORPH.to));
}

/**
 * Every animated element in the scene reads its geometry from here, so the whole
 * composition bends coherently off a single scalar. At morph 0 this is exactly
 * Scene 0's rail, which is why the scene can open on the number line unchanged.
 */
function railStateFor(progressValue) {
  const bend = morphAt(progressValue);
  const length = mix(RAIL_LENGTH.straight, RAIL_LENGTH.closed, bend);
  const arcHeight = getArcHeight({ bend, length });

  return {
    bend,
    length,
    anchorX,
    anchorY: centreY - arcHeight / 2,
  };
}

const ringPresenceFor = progressValue =>
  rangeProgress(morphAt(progressValue), RING_PRESENCE.from, RING_PRESENCE.to);

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
    pulseProgress(latest, SEAM.from, SEAM.peakStart, SEAM.peakEnd, SEAM.to)
  );
  const radius = useTransform(progress, latest =>
    mix(8, 34, rangeProgress(latest, SEAM.from, SEAM.to))
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

export function RangeWrapsIntoRingScene({ pinnedProgress = null, secondsPerBeat = 2 }) {
  const { progress, replay } = useSceneTimeline({
    beatCount: BEAT_COUNT,
    secondsPerBeat,
    pinnedProgress,
  });
  const isPinned = pinnedProgress !== null && pinnedProgress !== undefined;

  const sceneKeys = decorateSampleKeys();

  const ringPresence = useTransform(progress, ringPresenceFor);
  const atmosphereRadius = useArcRadius(progress, 0.92);
  const atmosphereY = useArcCentreY(progress);

  // The rail's ends stop being ends once they meet, so the gradient that fades
  // them out resolves into the core colour as the seam closes.
  const railEndOpacity = useTransform(progress, latest => mix(0.25, 0.85, ringPresenceFor(latest)));
  const railEndColor = useTransform(ringPresence, [0, 1], [palette.railEdge, palette.railCore]);

  return (
    <SceneFrame
      sceneNumber="01"
      sceneLabel="Wrap"
      title="The range wraps into a ring"
      caption="The ring is the same number range, wrapped so the end connects back to the start."
      actions={
        !isPinned ? (
          <button
            type="button"
            onClick={replay}
            className="shrink-0 border border-cyber-border px-5 py-2.5 text-[11px] uppercase tracking-[0.35em] text-ui-text-secondary transition-colors duration-normal hover:text-ui-text-bright"
          >
            Replay
          </button>
        ) : null
      }
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="The hash space number line bending until its two ends meet, forming a ring while the sample keys keep their relative spacing."
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

        <RailScaffold progress={progress} railStateFor={railStateFor} />

        <BoundsLabel
          progress={progress}
          railStateFor={railStateFor}
          position={0}
          label={toHashLabel(0)}
        />
        <BoundsLabel
          progress={progress}
          railStateFor={railStateFor}
          position={1}
          label={toHashLabel(1)}
        />

        <RailPath
          prefix={PREFIX}
          progress={progress}
          railStateFor={railStateFor}
          haloFor={ringPresenceFor}
        />

        <SeamPulse progress={progress} />

        {sceneKeys.map(sampleKey => (
          <KeyAnnotation
            key={`annotation-${sampleKey.slug}`}
            progress={progress}
            railStateFor={railStateFor}
            sampleKey={sampleKey}
            hashText={sampleKey.hashLabel}
          />
        ))}

        {sceneKeys.map(sampleKey => (
          <KeyMarker
            key={`marker-${sampleKey.slug}`}
            progress={progress}
            railStateFor={railStateFor}
            sampleKey={sampleKey}
          />
        ))}
      </svg>
    </SceneFrame>
  );
}

export default RangeWrapsIntoRingScene;
