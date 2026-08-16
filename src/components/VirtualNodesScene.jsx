import React from 'react';
import { STAGE } from '../story/stage';
import { useSceneTimeline } from '../story/useSceneTimeline';
import SceneFrame from './SceneFrame';
import SceneControls from './SceneControls';
import SpreadRing, { SPREAD_BEATS, SPREAD_MODEL, SPREAD_STEPS } from './SpreadRing';

/**
 * Scene 4: why one server needs many positions.
 *
 * Scene 3's failure, run again with the one thing changed that matters. Three
 * servers, one of them fails, its ranges are picked up by whoever follows them —
 * but each server now holds six positions rather than one, so what it lost comes
 * apart into six pieces and both survivors take about half. 64/36 becomes 52/48.
 *
 * It is also where the story stops following individual keys. Eighteen boundaries
 * is past the point where one can be tracked, and reading the ring as quantities is
 * exactly what the full-scale scenes assume.
 */
export function VirtualNodesScene({
  secondsPerBeat,
  pinnedProgress = null,
  active = true,
  engaged = false,
  onComplete,
  // How the dense ring is drawn. Threaded only so the alternatives can be put
  // side by side in Storybook; the default is the scene as it plays.
  treatment,
}) {
  const timeline = useSceneTimeline({
    beatCount: SPREAD_BEATS.end,
    steps: SPREAD_STEPS,
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
