import FullScaleScene from '../components/story-scenes/FullScaleScene';

/**
 * The plan's highest-risk decision: what to draw when individual positions stop
 * being readable. 6A and 6C are the two candidates it names; these stories exist
 * to be looked at side by side, including with the Scene 7 highlight on, since
 * whichever treatment wins has to carry that too.
 */
const meta = {
  title: 'Hash Ring/Guided Story/Scene 6 Full Scale',
  component: FullScaleScene,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    treatment: {
      description: '6A lanes, or 6C linearised strip.',
      control: { type: 'inline-radio' },
      options: ['lanes', 'strip'],
    },
    vnodesPerServer: {
      control: { type: 'range', min: 1, max: 800, step: 1 },
    },
    serverCount: {
      control: { type: 'range', min: 2, max: 6, step: 1 },
    },
    showRemap: {
      description: 'Adds a seventh server and highlights what it took over.',
      control: { type: 'boolean' },
    },
  },
  args: {
    serverCount: 6,
    vnodesPerServer: 150,
    showRemap: false,
  },
};

export default meta;

export const LanesTreatment = {
  args: { treatment: 'lanes' },
};

export const StripTreatment = {
  args: { treatment: 'strip' },
};

/** Where the argument for aggregation starts: too few positions to be even. */
export const LanesAtLowDensity = {
  args: { treatment: 'lanes', vnodesPerServer: 3 },
};

export const StripAtLowDensity = {
  args: { treatment: 'strip', vnodesPerServer: 3 },
};

export const LanesAtProductionDensity = {
  args: { treatment: 'lanes', vnodesPerServer: 500 },
};

export const StripAtProductionDensity = {
  args: { treatment: 'strip', vnodesPerServer: 500 },
};

export const LanesWithRemap = {
  args: { treatment: 'lanes', showRemap: true },
};

export const StripWithRemap = {
  args: { treatment: 'strip', showRemap: true },
};
