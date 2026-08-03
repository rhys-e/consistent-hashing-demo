import { ServerLeavesScene } from '../components/story-scenes/ServerLeavesScene';
import { REMOVAL_BEATS } from '../components/story-scenes/RemovalRing';

/**
 * Scene 3: three servers at one position each, and what happens when one leaves.
 *
 * The settled frame first. Everything the scene will animate is a pure function of
 * a beat value, so the composition is worth agreeing on before anything moves
 * through it.
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

export const EmptyRing = {
  args: { pinnedProgress: 0.2 },
};

/** Three positions, no ownership yet: the frame the sweep answers. */
export const MarkersPlaced = {
  args: { pinnedProgress: REMOVAL_BEATS.sweep.from },
};

/** Mid-sweep, which is the frame the rule lives in. */
export const Sweeping = {
  args: { pinnedProgress: (REMOVAL_BEATS.sweep.from + REMOVAL_BEATS.sweep.to) / 2 },
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
