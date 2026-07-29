import React from 'react';
import { motion, useTransform } from 'motion/react';
import { projectPosition } from '../../story/projection';
import { easeOutBack, easeOutCubic, mix, pulseProgress, rangeProgress } from '../../story/easing';
import { useSceneTimeline } from '../../story/useSceneTimeline';
import { useHashDecode } from '../../story/useHashDecode';
import { SAMPLE_KEYS, decorateSampleKeys, toHashLabel } from '../../story/hashSpace';
import { STAGE } from '../../story/stage';
import {
  BackdropGrid,
  BoundsLabel,
  HashSpaceDefs,
  KeyAnnotation,
  KeyMarker,
  RailPath,
  RailScaffold,
} from './HashSpaceLayers';
import SceneFrame from './SceneFrame';

const PREFIX = 'scene0';
const { width, height, centreY, anchorX } = STAGE;

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

const RAIL_BEATS = 1;
const BEAT_COUNT = RAIL_BEATS + SAMPLE_KEYS.length;

/**
 * The hash space is straight for the whole of this scene. Scene 1 supplies a
 * bending version of the same state to the same layers.
 */
const STRAIGHT_RAIL = {
  bend: 0,
  length: STAGE.railLength.straight,
  anchorX,
  anchorY: centreY,
};

const railStateFor = () => STRAIGHT_RAIL;

function railPoint(position) {
  return projectPosition({ position, ...STRAIGHT_RAIL });
}

function getSceneKeys() {
  return decorateSampleKeys().map((sampleKey, index) => ({
    ...sampleKey,
    x: railPoint(sampleKey.position).x,
    beatStart: RAIL_BEATS + index,
  }));
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

export function HashSpaceNumberLineScene({ pinnedProgress = null, secondsPerBeat = 1.6 }) {
  const { progress } = useSceneTimeline({
    beatCount: BEAT_COUNT,
    secondsPerBeat,
    pinnedProgress,
  });

  const sceneKeys = getSceneKeys();
  const scaffoldOpacityFor = latest => rangeProgress(latest, RAIL_BEATS * 0.55, RAIL_BEATS);

  return (
    <SceneFrame
      sceneNumber="00"
      sceneLabel="Hash_Space"
      title="Hash space is a number line"
      caption="A hash function turns each key into a position in a fixed number range."
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="A hash space drawn as a number line from zero to two to the power thirty two minus one, with sample keys hashing to fixed positions along it."
        className="h-full w-full"
      >
        <defs>
          <HashSpaceDefs prefix={PREFIX} />

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

        <RailScaffold
          progress={progress}
          railStateFor={railStateFor}
          opacityFor={scaffoldOpacityFor}
        />

        <BoundsLabel
          progress={progress}
          railStateFor={railStateFor}
          position={0}
          label={toHashLabel(0)}
          opacityFor={scaffoldOpacityFor}
        />
        <BoundsLabel
          progress={progress}
          railStateFor={railStateFor}
          position={1}
          label={toHashLabel(1)}
          opacityFor={scaffoldOpacityFor}
        />

        <RailPath
          prefix={PREFIX}
          progress={progress}
          railStateFor={railStateFor}
          drawnFor={latest => easeOutCubic(rangeProgress(latest, 0, RAIL_BEATS))}
        />

        {sceneKeys.map(sampleKey => (
          <ScannerBeam key={`beam-${sampleKey.slug}`} sampleKey={sampleKey} progress={progress} />
        ))}

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
      </svg>
    </SceneFrame>
  );
}

export default HashSpaceNumberLineScene;
