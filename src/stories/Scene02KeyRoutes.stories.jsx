import { KeyRoutesScene } from '../components/KeyRoutesScene';
import { LOOKUP_BEATS } from '../components/LookupRing';

/**
 * Scene 2: the lookup rule, in isolation.
 *
 * The scene that turns a position into a range — the one step every later scene
 * assumes and none of them shows.
 */
const meta = {
  title: 'Hash Ring/Guided Story/Scene 02 Key Routes',
  component: KeyRoutesScene,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    pinnedProgress: {
      control: { type: 'range', min: 0, max: LOOKUP_BEATS.end, step: 0.05 },
    },
  },
};

export default meta;

export const Playing = { args: {} };

/** Keys on the ring, as the opening scene left them. */
export const KeysOnTheRing = {
  args: { pinnedProgress: LOOKUP_BEATS.arrive.from - 0.2 },
};

/** Servers arriving, and the keys standing aside to let the band mean ownership. */
export const ServersArrive = {
  args: { pinnedProgress: (LOOKUP_BEATS.stepIn.from + LOOKUP_BEATS.stepIn.to) / 2 },
};

export const Routing = {
  args: { pinnedProgress: LOOKUP_BEATS.routes.get('user:1842').from + 1.2 },
};

export const Sweeping = {
  args: { pinnedProgress: (LOOKUP_BEATS.sweep.from + LOOKUP_BEATS.sweep.to) / 2 },
};

export const Settled = {
  args: { pinnedProgress: LOOKUP_BEATS.settled },
};
