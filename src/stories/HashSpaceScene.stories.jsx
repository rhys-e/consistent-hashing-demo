import HashSpaceScene, { SCENE_STEPS } from '../components/story-scenes/HashSpaceScene';

const beatOf = label => SCENE_STEPS.find(step => step.label === label)?.at ?? 0;

/**
 * The opening scene: the hash space as a number line, and the same line wrapped
 * into a ring. It was two scenes; the bend only means anything because the line
 * before it and the ring after it are demonstrably the same object, and one scene
 * makes that structural rather than something a test has to keep true.
 */
const meta = {
  title: 'Hash Ring/Guided Story/Scene 00 Hash Space',
  component: HashSpaceScene,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    pinnedProgress: {
      description: 'Pins the scene to a moment on its timeline, in beats.',
      control: { type: 'range', min: 0, max: SCENE_STEPS[SCENE_STEPS.length - 1].at, step: 0.05 },
    },
    secondsPerBeat: { control: { type: 'range', min: 0.4, max: 4, step: 0.1 } },
    engaged: {
      description: 'The transport appears once a viewer takes control, or at the end.',
      control: { type: 'boolean' },
    },
  },
  args: { secondsPerBeat: 1.5, engaged: false },
};

export default meta;

// pinnedProgress is deliberately absent rather than null: Storybook's range
// control only guards against undefined, and renders null as a crash.
export const Animated = {
  args: {},
};

export const EmptyStage = {
  args: { pinnedProgress: beatOf('Empty stage') },
};

export const RailDrawn = {
  args: { pinnedProgress: beatOf('Rail drawn') },
};

export const ScannerActive = {
  args: { pinnedProgress: beatOf('Rail drawn') + 0.65 },
};

export const KeysLanded = {
  args: { pinnedProgress: beatOf('session:abc landed') },
};

/** Mid-bend: the rail is an arc and the keys have kept their spacing along it. */
export const HalfBent = {
  args: { pinnedProgress: beatOf('session:abc landed') + 1.3 },
};

export const RingClosed = {
  args: { pinnedProgress: beatOf('Ring closed') },
};
