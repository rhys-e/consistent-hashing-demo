import { LanesSeparateScene } from '../components/story-scenes/FullScaleScene';
import FullScaleScene from '../components/story-scenes/FullScaleScene';
import { buildLaneTimeline } from '../components/story-scenes/FullScaleLanes';

const SEPARATING = buildLaneTimeline(6, { hasRemap: false });

/**
 * Scene 6: what to draw when individual positions stop being readable. The lanes
 * treatment was chosen over the linearised strip, which is kept here as the
 * comparison the decision was made against.
 */
const meta = {
  title: 'Hash Ring/Guided Story/Scene 06 Lanes Separate',
  component: LanesSeparateScene,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    pinnedProgress: {
      description: 'Pins the scene to a moment on its timeline, in beats.',
      control: { type: 'range', min: 0, max: SEPARATING.end, step: 0.05 },
    },
    vnodesPerServer: { control: { type: 'range', min: 1, max: 800, step: 1 } },
    serverCount: { control: { type: 'range', min: 2, max: 6, step: 1 } },
  },
  args: { serverCount: 6, vnodesPerServer: 150 },
};

export default meta;

// pinnedProgress is deliberately absent rather than null: Storybook's range
// control only guards against undefined, and renders null as a crash.
export const Separating = {
  args: {},
};

/** The state the earlier scenes leave behind: one ring, coloured by owner. */
export const SharedRing = {
  args: { pinnedProgress: 0.6 },
};

export const MidSeparation = {
  args: { pinnedProgress: (SEPARATING.fanOut.from + SEPARATING.fanOut.to) / 2 },
};

export const Settled = {
  args: { pinnedProgress: SEPARATING.settled },
};

/** Where the argument for aggregation starts: too few positions to be even. */
export const LowDensity = {
  args: { vnodesPerServer: 3, pinnedProgress: SEPARATING.settled },
};

export const ProductionDensity = {
  args: { vnodesPerServer: 500, pinnedProgress: SEPARATING.settled },
};

/** Treatment 6C, kept static: the comparison the lanes were chosen against. */
export const StripTreatment = {
  render: args => <FullScaleScene {...args} treatment="strip" />,
  args: {},
};

export const StripWithRemap = {
  render: args => <FullScaleScene {...args} treatment="strip" showRemap />,
  args: {},
};
