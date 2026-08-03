import React, { useEffect, useMemo } from 'react';
import { STAGE } from '../story/stage';
import { buildFullScaleModel } from '../story/topology';
import { useSceneTimeline } from '../story/useSceneTimeline';
import { useBeatCaption } from '../story/useBeatCaption';
import { narrationPresenceAt, remainingReadingAt } from '../story/sceneSteps';
import FullScaleLanes, { buildLaneSteps, buildLaneTimeline } from './FullScaleLanes';
import FullScaleStrip from './FullScaleStrip';
import SceneControls from './SceneControls';
import SceneFrame from './SceneFrame';

const STRIP_TREATMENT = {
  title: 'The ring, unrolled',
  caption:
    'The same ownership as the ring above, laid back out as the number line from Scene 0. At this density the boundaries are real but far too fine to read around the ring itself.',
  remapCaption:
    'Highlighted stripes are the ranges the joining server took over. The marker rail above the strip carries where they are; the stripes themselves keep their true width.',
};

function LanesScene({
  model,
  showRemap,
  pinnedProgress,
  secondsPerBeat,
  active,
  engaged,
  onComplete,
}) {
  const laneCount = model.servers.length;
  const laneTimeline = useMemo(
    () => buildLaneTimeline(laneCount, { hasRemap: showRemap }),
    [laneCount, showRemap]
  );
  const steps = useMemo(
    () => buildLaneSteps(laneTimeline, model.servers),
    [laneTimeline, model.servers]
  );

  const timeline = useSceneTimeline({
    beatCount: laneTimeline.end,
    steps,
    secondsPerBeat,
    pinnedProgress,
    autoPlay: active,
  });
  const { progress, status } = timeline;
  const isPinned = pinnedProgress !== null && pinnedProgress !== undefined;
  const caption = useBeatCaption(progress, laneTimeline.captions);

  useEffect(() => {
    if (status === 'ended') onComplete?.();
  }, [onComplete, status]);

  // Hands off until the viewer takes over — and only then. Revealing the transport
  // when a scene finishes put it on screen at the exact moment the deck was about
  // to move on, which is clutter arriving too late to be useful.
  const showControls = !isPinned && engaged;

  return (
    <SceneFrame
      caption={caption}
      active={active}
      progress={progress}
      presenceFor={latest => narrationPresenceAt(laneTimeline, latest)}
      remainingFor={latest => remainingReadingAt(laneTimeline, latest)}
      actions={showControls ? <SceneControls timeline={timeline} enabled={active} /> : null}
    >
      <svg
        viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="One ring coloured by owner separating into one lane per server, each lane showing only that server's ranges."
        className="h-full w-full"
      >
        <FullScaleLanes model={model} progress={progress} timeline={laneTimeline} />
      </svg>
    </SceneFrame>
  );
}

function StripScene({ model, showRemap, active = true }) {
  return (
    <SceneFrame
      caption={showRemap ? STRIP_TREATMENT.remapCaption : STRIP_TREATMENT.caption}
      captionMode="header"
      active={active}
    >
      <svg
        viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={STRIP_TREATMENT.title}
        className="h-full w-full"
      >
        <FullScaleStrip model={model} showRemap={showRemap} />
      </svg>
    </SceneFrame>
  );
}

/**
 * Scene 6, in both treatments the plan named.
 *
 * 6A is now the animated candidate, because the risk it carries is not whether
 * the still frame is honest — it is whether a viewer can follow one ring becoming
 * seven without losing the thread. 6C stays as the static comparison that decision
 * was made against.
 */
export function FullScaleScene({
  treatment = 'lanes',
  serverCount = 6,
  vnodesPerServer = 150,
  showRemap = false,
  pinnedProgress = null,
  secondsPerBeat = 1.15,
  active = true,
  engaged = false,
  onComplete,
}) {
  const model = buildFullScaleModel({ serverCount, vnodesPerServer, joined: showRemap });

  if (treatment === 'strip') {
    return <StripScene model={model} showRemap={showRemap} active={active} />;
  }

  return (
    <LanesScene
      model={model}
      showRemap={showRemap}
      pinnedProgress={pinnedProgress}
      secondsPerBeat={secondsPerBeat}
      active={active}
      engaged={engaged}
      onComplete={onComplete}
    />
  );
}

/**
 * Scene 6 and Scene 7 are one implementation and two scenes.
 *
 * They share every layer, every timing rule and one model, so keeping them as one
 * component is right; but they are separate beats of the story with separate
 * arguments, and the deck reaches them separately. These are the names the story
 * uses, so nothing outside this file has to know that `showRemap` is the seam
 * between two scenes.
 */
export function LanesSeparateScene(props) {
  return <FullScaleScene {...props} showRemap={false} />;
}

export function ServerJoinsScene(props) {
  return <FullScaleScene {...props} showRemap />;
}

export default FullScaleScene;
