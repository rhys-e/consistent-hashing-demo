import HashSpaceScene, { HASH_SPACE_BEATS, SCENE_STEPS } from '../components/HashSpaceScene';

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

/**
 * Mid-clear: everything the slide used to say what it had to say is going at once —
 * the two bounds labels, the standing commentary, and the three named keys with
 * their hash values.
 *
 * One number, not five. Taking the writing away first and the keys one at a time
 * makes the ending a sequence to follow, on a slide whose argument finished a beat
 * ago; together it is the slide letting go.
 */
export const ClearingUp = {
  args: { pinnedProgress: HASH_SPACE_BEATS.clear.from + 0.75 },
};

/**
 * The ring on its own, which is the beat the clearing lands on and a step the story
 * stops at. Nothing on it, nothing around it, and nothing arriving yet.
 */
export const TheRingAlone = {
  args: { pinnedProgress: beatOf('The ring alone') },
};

/**
 * The closing frame, where the ring is doing something rather than sitting there.
 *
 * The three named keys have gone and keys keep landing and leaving in their place,
 * on their own clock rather than on the scene's beat — which is what lets it carry
 * on while the slide is being taken off the screen, and is the difference between
 * a diagram of a ring and a ring that was running before you arrived.
 *
 * Pinned, so this is one frame of it. Play `Animated` to watch it run.
 */
export const KeysKeepArriving = {
  // The traffic runs on wall time rather than on the beat, so a pinned frame needs
  // its clock held too — a quarter turn in, where the layer has filled to the three
  // or four it settles at.
  args: { pinnedProgress: beatOf('Keys keep arriving'), pinnedTurns: 0.25 },
};

/**
 * The first few seconds of the layer, where they come in one at a time.
 *
 * A pool of eighteen with each on the ring for a fifth of a turn settles at three
 * or four, but they used to reach that in one frame: every key whose window
 * contained the starting instant appeared together. The clock counts turns rather
 * than resetting, and a key has not started until the clock has come round to it,
 * so the first turn deals them out about a second apart.
 */
export const TrafficArriving = {
  args: { pinnedProgress: beatOf('Keys keep arriving'), pinnedTurns: 0.06 },
};
