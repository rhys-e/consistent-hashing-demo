import React from 'react';
import { STAGE } from '../story/stage';
import { useSceneTimeline } from '../story/useSceneTimeline';
import SceneFrame from './SceneFrame';
import SceneControls from './SceneControls';
import DensityZoom, { ZOOM_BEATS, ZOOM_MODEL, ZOOM_STEPS } from './DensityZoom';

/**
 * Scene 5: what the dense ring is actually made of.
 *
 * A fiftieth of the ring is bracketed and unrolled into a strip, where a dozen or
 * two changes of owner become legible. Then the window sweeps, and the strip stays
 * exactly as mixed — which is the claim the full-scale scenes are built on, shown
 * rather than asserted.
 *
 * It ends on the dense ring it started from, which is the frame Scene 6 opens on.
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
