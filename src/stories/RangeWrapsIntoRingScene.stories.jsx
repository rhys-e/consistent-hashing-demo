import RangeWrapsIntoRingScene from '../components/story-scenes/RangeWrapsIntoRingScene';

const meta = {
  title: 'Hash Ring/Guided Story/Scene 1 Wrap Into Ring',
  component: RangeWrapsIntoRingScene,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    pinnedProgress: {
      description: 'Pins the scene to a moment on its timeline, in beats. Leave unset to play.',
      control: { type: 'range', min: 0, max: 3, step: 0.05 },
    },
    secondsPerBeat: {
      control: { type: 'range', min: 0.4, max: 5, step: 0.1 },
    },
  },
};

export default meta;

// pinnedProgress is deliberately absent rather than null: Storybook's range
// control only guards against undefined, and renders null as a crash.
export const Animated = {
  args: {
    secondsPerBeat: 2,
  },
};

// The scene opens on the frame Scene 0 ends on, drawn by the same layers at
// bend 0. `Scene 0 / Keys Landed` and this story should be indistinguishable.
export const StraightLine = {
  args: {
    pinnedProgress: 0.4,
  },
};

export const QuarterBent = {
  args: {
    pinnedProgress: 1.1,
  },
};

export const HalfBent = {
  args: {
    pinnedProgress: 1.5,
  },
};

export const RingClosed = {
  args: {
    pinnedProgress: 3,
  },
};
