import React from 'react';
import { STAGE } from '../../story/stage';
import { useSceneTimeline } from '../../story/useSceneTimeline';
import SceneFrame from '../deck/SceneFrame';
import SceneControls from '../deck/SceneControls';
import DensityZoom, { ZOOM_BEATS, ZOOM_MODEL, ZOOM_STEPS } from '../ring/DensityZoom';

/**
 * Scene 5: magnify a section of the dense ring, then sweep. Ends on Scene 6's opening frame.
 */
export function ZoomDensityScene({
  secondsPerBeat,
  pinnedProgress = null,
  active = true,
  // Arriving, not merely inactive. See `useSceneTimeline`.
  current,
  engaged = false,
  onComplete,
}) {
  const timeline = useSceneTimeline({
    beatCount: ZOOM_BEATS.end,
    steps: ZOOM_STEPS,
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

  return (
    <SceneFrame
      active={active}
      actions={!isPinned && engaged ? <SceneControls timeline={timeline} enabled={active} /> : null}
    >
      <svg
        viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="A hash ring at production density, with a narrow window of it magnified into a strip showing many changes of owner, and the window sweeping around the ring."
        className="h-full w-full"
      >
        <DensityZoom model={ZOOM_MODEL} progress={progress} timeline={ZOOM_BEATS} />
      </svg>
    </SceneFrame>
  );
}

export default ZoomDensityScene;
