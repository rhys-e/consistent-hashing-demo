import { ServerLeavesScene } from '../components/scenes/ServerLeavesScene';
import { REMOVAL_BEATS } from '../components/ring/RemovalRing';

/**
 * Scene 3: three servers at one position each, and what happens when one leaves.
 *
 * It opens assembled, on the frame Scene 2 ends on. There is no establishing
 * sequence to review here any more — the markers landing and the arcs sweeping are
 * Scene 2's stories, and this scene is the second half of one movement rather than
 * a second run at the whole of it.
 */
const meta = {
  title: 'Hash Ring/Guided Story/Scene 03 Server Leaves',
  component: ServerLeavesScene,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    pinnedProgress: {
      control: { type: 'range', min: 0, max: REMOVAL_BEATS.end, step: 0.05 },
    },
  },
};

export default meta;

export const Playing = {
  args: {},
};

/** The first frame, which has to be the frame Scene 2 left on screen. */
export const Opening = {
  args: { pinnedProgress: 0 },
};

export const Settled = {
  args: { pinnedProgress: REMOVAL_BEATS.settled },
};

/** The one frame in the story where a stretch of the ring has no owner at all. */
export const NobodyOwnsIt = {
  args: { pinnedProgress: REMOVAL_BEATS.orphaned.from + 0.65 },
};

/** Mid-absorption: the arc's leading edge is what recolours the keys. */
export const Absorbing = {
  args: { pinnedProgress: (REMOVAL_BEATS.absorb.from + REMOVAL_BEATS.absorb.to) / 2 },
};

export const WhatItCost = {
  args: { pinnedProgress: REMOVAL_BEATS.closing.from + 1 },
};
