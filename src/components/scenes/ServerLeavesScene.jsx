import React from 'react';
import { STAGE } from '../../story/stage';
import { useSceneTimeline } from '../../story/useSceneTimeline';
import SceneFrame from '../deck/SceneFrame';
import SceneControls from '../deck/SceneControls';
import RemovalRing, { REMOVAL_BEATS, REMOVAL_MODEL, REMOVAL_STEPS } from '../ring/RemovalRing';

/**
 * Scene 3: a server leaves. Only its keys move, and they all land on one neighbour.
 */
export function ServerLeavesScene({
  secondsPerBeat,
  pinnedProgress = null,
  active = true,
  // Arriving, not merely inactive. See `useSceneTimeline`.
  current,
  engaged = false,
  onComplete,
}) {
  const timeline = useSceneTimeline({
    beatCount: REMOVAL_BEATS.end,
    steps: REMOVAL_STEPS,
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
        aria-label="Three servers on a hash ring, each owning the range that ends at its own position, with sample keys coloured by their owner."
        className="h-full w-full"
      >
        <RemovalRing model={REMOVAL_MODEL} progress={progress} timeline={REMOVAL_BEATS} />
      </svg>
    </SceneFrame>
  );
}

export default ServerLeavesScene;
