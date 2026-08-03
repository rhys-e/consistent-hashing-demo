import React from 'react';
import { STAGE } from '../story/stage';
import { useSceneTimeline } from '../story/useSceneTimeline';
import SceneFrame from './SceneFrame';
import SceneControls from './SceneControls';
import RemovalRing, { REMOVAL_BEATS, REMOVAL_MODEL, REMOVAL_STEPS } from './RemovalRing';

/**
 * Scene 3: a server leaves.
 *
 * Both halves of the argument, in an order that matters. Only the departing
 * server's keys move — which is what the name "consistent hashing" promises — and
 * every one of them lands on the same neighbour, which is what virtual nodes are
 * for. Showing the payoff first means the problem arrives as a qualification
 * rather than as the headline.
 *
 * The scene opens by teaching the rule it then breaks: each arc sweeps *backwards*
 * from its server's position to the one before it, so "a server owns the range
 * ending at its position" is watched rather than read.
 */
export function ServerLeavesScene({
  secondsPerBeat,
  pinnedProgress = null,
  active = true,
  engaged = false,
  onComplete,
}) {
  const timeline = useSceneTimeline({
    beatCount: REMOVAL_BEATS.end,
    steps: REMOVAL_STEPS,
    secondsPerBeat,
    pinnedProgress,
    autoPlay: active,
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
