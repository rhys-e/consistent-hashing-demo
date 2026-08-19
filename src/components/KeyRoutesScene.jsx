import React from 'react';
import { STAGE } from '../story/stage';
import { useSceneTimeline } from '../story/useSceneTimeline';
import SceneFrame from './SceneFrame';
import SceneControls from './SceneControls';
import LookupRing, { LOOKUP_BEATS, LOOKUP_MODEL, LOOKUP_STEPS } from './LookupRing';

/**
 * Scene 2: a key belongs to the first server clockwise from it.
 * Ends on the frame Scene 3 opens on.
 */
export function KeyRoutesScene({
  secondsPerBeat,
  pinnedProgress = null,
  active = true,
  // Arriving, not merely inactive. See `useSceneTimeline`.
  current,
  engaged = false,
  onComplete,
}) {
  const timeline = useSceneTimeline({
    beatCount: LOOKUP_BEATS.end,
    steps: LOOKUP_STEPS,
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
        aria-label="Keys on a hash ring, then three servers taking positions on it. Each key travels clockwise to the first server it meets, and each server's ownership arc sweeps back to the position before it."
        className="h-full w-full"
      >
        <LookupRing model={LOOKUP_MODEL} progress={progress} timeline={LOOKUP_BEATS} />
      </svg>
    </SceneFrame>
  );
}

export default KeyRoutesScene;
