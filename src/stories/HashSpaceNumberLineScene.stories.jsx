import HashSpaceNumberLineScene from '../components/story-scenes/HashSpaceNumberLineScene';

const meta = {
  title: 'Hash Ring/Guided Story/Scene 0 Hash Space',
  component: HashSpaceNumberLineScene,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    pinnedProgress: {
      description: 'Pins the scene to a moment on its timeline, in beats. Leave unset to play.',
      control: { type: 'range', min: 0, max: 4, step: 0.05 },
    },
    secondsPerBeat: {
      control: { type: 'range', min: 0.4, max: 4, step: 0.1 },
    },
  },
};

export default meta;

// pinnedProgress is deliberately absent rather than null: Storybook's range
// control only guards against undefined, and renders null as a crash.
export const Animated = {
  args: {
    secondsPerBeat: 1.6,
  },
};

export const RailDrawn = {
  args: {
    pinnedProgress: 1,
  },
};

export const ScannerActive = {
  args: {
    pinnedProgress: 1.35,
  },
};

export const KeysLanded = {
  args: {
    pinnedProgress: 4,
  },
};
