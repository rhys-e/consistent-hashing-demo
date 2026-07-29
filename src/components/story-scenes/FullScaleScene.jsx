import React from 'react';
import { STAGE } from '../../story/stage';
import { buildFullScaleModel } from '../../story/topology';
import FullScaleLanes from './FullScaleLanes';
import FullScaleStrip from './FullScaleStrip';
import SceneFrame from './SceneFrame';

const TREATMENTS = {
  lanes: {
    Artwork: FullScaleLanes,
    sceneLabel: 'Vnode_Density/6A',
    title: 'Every server is everywhere',
    caption:
      'One lane per server, each showing only its own ranges. The ink in a lane is the share it owns; no slice of the ring is coloured as though a single server held it.',
    remapCaption:
      'The joining server takes slivers from every lane. Nothing else moves, and the highlight is drawn in its own lane rather than over the ring.',
  },
  strip: {
    Artwork: FullScaleStrip,
    sceneLabel: 'Vnode_Density/6C',
    title: 'The ring, unrolled',
    caption:
      'The same ownership as the ring above, laid back out as the number line from Scene 0. At this density the boundaries are real but far too fine to read around the ring itself.',
    remapCaption:
      'Highlighted stripes are the ranges the joining server took over. They are drawn at a minimum width, because at this density a stolen range is a fraction of a pixel wide.',
  },
};

/**
 * Scene 6 has not been decided. The plan names per-server lanes and a linearised
 * strip as the two candidates worth building, so this renders either from the
 * same model and the same load panel, and both are exported as stories to be
 * compared rather than argued about.
 */
export function FullScaleScene({
  treatment = 'lanes',
  serverCount = 6,
  vnodesPerServer = 150,
  showRemap = false,
}) {
  const { Artwork, sceneLabel, title, caption, remapCaption } = TREATMENTS[treatment];
  const model = buildFullScaleModel({ serverCount, vnodesPerServer, joined: showRemap });

  return (
    <SceneFrame
      sceneNumber={showRemap ? '07' : '06'}
      sceneLabel={sceneLabel}
      title={showRemap ? 'A server joins' : title}
      caption={showRemap ? remapCaption : caption}
    >
      <svg
        viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={title}
        className="h-full w-full"
      >
        <Artwork model={model} showRemap={showRemap} />
      </svg>
    </SceneFrame>
  );
}

export default FullScaleScene;
