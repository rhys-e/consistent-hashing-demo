import { VirtualNodesScene } from '../components/VirtualNodesScene';
import { SPREAD_BEATS } from '../components/SpreadRing';

/**
 * Scene 4: the same failure, at ten positions per server instead of one.
 *
 * The comparison against Scene 3 is the point, so everything except the density is
 * deliberately identical — same cast, same server failing, same sweep.
 */
const meta = {
  title: 'Hash Ring/Guided Story/Scene 04 Virtual Nodes',
  component: VirtualNodesScene,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    pinnedProgress: {
      control: { type: 'range', min: 0, max: SPREAD_BEATS.end, step: 0.05 },
    },
  },
};

export default meta;

export const Playing = { args: {} };

/** One position each: the frame Scene 3 works from. */
export const OnePositionEach = {
  args: { pinnedProgress: SPREAD_BEATS.split.from - 0.2 },
};

export const Splitting = {
  args: { pinnedProgress: (SPREAD_BEATS.split.from + SPREAD_BEATS.split.to) / 2 },
};

export const TenPositionsEach = {
  args: { pinnedProgress: SPREAD_BEATS.settled },
};

/** Many small gaps rather than one large one. */
export const NobodyOwnsThem = {
  args: { pinnedProgress: SPREAD_BEATS.orphaned.from + 1.2 },
};

export const WhatItCost = {
  args: { pinnedProgress: SPREAD_BEATS.closing.from + 1 },
};
