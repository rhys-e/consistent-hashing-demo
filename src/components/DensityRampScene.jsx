import React from 'react';
import { STAGE } from '../story/stage';
import { useSceneTimeline } from '../story/useSceneTimeline';
import { CARRY_OVER_MODEL, MULTIPLY_MODEL, RAMP_MODEL } from '../story/densityRamp';
import SceneFrame from './SceneFrame';
import SceneControls from './SceneControls';
import DensityRamp, { buildRampSteps, buildRampTimeline } from './DensityRamp';

/**
 * The candidate bridge between Scene 4 and production scale, not yet in the deck.
 *
 * Scene 4 leaves the viewer on thirty countable positions and Scene 5 opens on
 * nine hundred. Between them is a narration slide that *states* the difference,
 * and nothing that shows it — so the density change arrives as a cut, and the one
 * thing the viewer most needs to believe about it (that the dense ring is the
 * sparse one with more in it, not a different ring) is the thing they are asked to
 * take on trust.
 *
 * Three stagings of the same argument, built from one component so that what is
 * being compared is the staging rather than three separately-tuned pictures.
 */

/** Built once per treatment: a timeline is a pure function of the model. */
const BUILT = {
  'fill-in': { model: RAMP_MODEL, treatment: 'fill-in' },
  'carry-over': { model: CARRY_OVER_MODEL, treatment: 'carry-over' },
  'through-window': { model: RAMP_MODEL, treatment: 'through-window' },
  multiply: { model: MULTIPLY_MODEL, treatment: 'multiply' },
};

const timelines = new Map(
  Object.entries(BUILT).map(([name, { model, treatment }]) => {
    const beats = buildRampTimeline(model, { treatment });
    return [name, { model, beats, steps: buildRampSteps(beats) }];
  })
);

export const rampFor = name => timelines.get(name);

export function DensityRampScene({
  treatment = 'fill-in',
  secondsPerBeat = 1.3,
  pinnedProgress = null,
  active = true,
  engaged = false,
  onComplete,
}) {
  const { model, beats, steps } = timelines.get(treatment) ?? timelines.get('fill-in');

  const timeline = useSceneTimeline({
    beatCount: beats.end,
    steps,
    secondsPerBeat,
    pinnedProgress,
    autoPlay: active,
  });
  const { progress, status } = timeline;
  const isPinned = pinnedProgress !== null && pinnedProgress !== undefined;

  React.useEffect(() => {
    if (status === 'ended') onComplete?.();
  }, [onComplete, status]);

  return (
    <SceneFrame
      active={active}
      actions={!isPinned && engaged ? <SceneControls timeline={timeline} enabled={active} /> : null}
    >
      <svg
        viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="A hash ring whose servers gain more and more positions, with every position already on the ring staying exactly where it was."
        className="h-full w-full"
      >
        <DensityRamp model={model} progress={progress} timeline={beats} />
      </svg>
    </SceneFrame>
  );
}

export default DensityRampScene;
