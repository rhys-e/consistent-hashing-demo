import React from 'react';
import { STAGE } from '../story/stage';
import { useSceneTimeline } from '../story/useSceneTimeline';
import SceneFrame from './SceneFrame';
import SceneControls from './SceneControls';
import SpreadRing, { SPREAD_BEATS, SPREAD_MODEL, SPREAD_STEPS } from './SpreadRing';

/**
 * Scene 4: Scene 3's failure with six positions per server, so the load splits.
 */
export function VirtualNodesScene({
  secondsPerBeat,
  pinnedProgress = null,
  active = true,
  // Arriving, not merely inactive. See `useSceneTimeline`.
  current,
  engaged = false,
  onComplete,
  // Storybook only; the default is the scene as it plays.
  treatment,
}) {
  const timeline = useSceneTimeline({
    beatCount: SPREAD_BEATS.end,
    steps: SPREAD_STEPS,
    secondsPerBeat,
    pinnedProgress,
    autoPlay: active,
    arriving: current,
  });
  const { progress, status } = timeline;
  const isPinned = pinnedProgress !== null && pinnedProgress !== undefined;

  React.useEffect(() => {
    if (status === 'ended') onComplete?.();
  }, [onComplete, status]);

  const showControls = !isPinned && engaged;

  return (
    <SceneFrame
      active={active}
      actions={showControls ? <SceneControls timeline={timeline} enabled={active} /> : null}
    >
      <svg
        viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Three servers on a hash ring, each splitting from one position into six. One server then fails, and its ranges are absorbed in several pieces by both of the others rather than all by one."
        className="h-full w-full"
      >
        <SpreadRing
          model={SPREAD_MODEL}
          progress={progress}
          timeline={SPREAD_BEATS}
          treatment={treatment}
        />
      </svg>
    </SceneFrame>
  );
}

export default VirtualNodesScene;
