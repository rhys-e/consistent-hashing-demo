import { VirtualNodesScene } from '../components/scenes/VirtualNodesScene';
import { SPREAD_BEATS } from '../components/ring/SpreadRing';
import { ServerLeavesScene } from '../components/scenes/ServerLeavesScene';
import { REMOVAL_BEATS } from '../components/ring/RemovalRing';

/**
 * The ring's two marks at ten positions each: a flat arc, and the same dot as
 * everywhere else.
 *
 * **Flat arcs, in all three ring scenes.** The head-bright fade is gone rather than
 * switched off partway through Scene 4. It reads beautifully on three arcs and
 * cannot survive thirty — a fade needs room to be a gradient, and in fifty pixels
 * it is an edge, so the dark tail of one arc against the bright head of the next
 * reads as a gap. Scaling how far it falls to the room available was tried and was
 * worse again: one rule, but arcs at every alpha between a quarter and solid on the
 * same ring. What the fade stated is stated by movement instead, and always was —
 * Scene 2 sweeps each arc backwards from its server to the position before it.
 *
 * **One dot, at one size.** It was shrunk to a third here to buy room, and the room
 * does not exist to be bought. Thirty full-size dots overlap in thirteen of their
 * thirty neighbouring pairs, and both ways round that were tried are closed:
 *
 * - *A better distribution.* For thirty points on a ring this size, the chance that
 *   no two land within a dot's width is `(1 − 30·17/1457)²⁹` ≈ **one in 265,000**,
 *   confirmed against a 20,000-draw simulation. Sixteen candidate vnode key formats
 *   were measured and none reached even a 10px minimum gap — and `{id}#{i}`, the one
 *   already in use, was the best of the sixteen on every other count the scenes
 *   need. The clumping is not bad luck. It is what a hash does.
 * - *Fewer positions.* Twelve dots clear each other in one draw in five, which is
 *   the first count where it is even plausible. But ten is the only count from one
 *   to twelve whose **starting** balance matches the one-position ring's — 4.0
 *   points of spread against 4.6, where four positions each gives 22.4 — and both
 *   levels starting from the same balance is what makes this a comparison rather
 *   than two unrelated rings.
 *
 * So the clumps stay, and they are not noise: two positions on top of each other is
 * why the shares read 35.6 / 31.6 / 32.9 rather than a third each, which is exactly
 * what the panel beside them is measuring.
 */
const meta = {
  title: 'Hash Ring/Treatments/01 Arc Shading',
  component: VirtualNodesScene,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    pinnedProgress: { control: { type: 'range', min: 0, max: SPREAD_BEATS.end, step: 0.05 } },
  },
};

export default meta;

const SETTLED = SPREAD_BEATS.settled;

/** What ships: full-size dots, flat arcs, clumps and all. */
export const Settled = { args: { pinnedProgress: SETTLED } };

/** The two smaller sizes, kept only so the trade can be re-checked by eye. */
export const DotsThreeQuarters = {
  args: { pinnedProgress: SETTLED, treatment: { dotScale: 0.75 } },
};
export const DotsShrunk = { args: { pinnedProgress: SETTLED, treatment: { dotScale: 0.34 } } };

/** After the absorption, where two servers hold everything in many pieces. */
export const Absorbed = { args: { pinnedProgress: SPREAD_BEATS.absorbed } };

/** Mid-split, where the ten positions per server are arriving on their tethers. */
export const Splitting = {
  args: { pinnedProgress: (SPREAD_BEATS.split.from + SPREAD_BEATS.split.to) / 2 },
};

export const Playing = { args: {} };

/**
 * One position each, which is the picture all of this is measured against — and
 * which the flattening changes. This is the frame that paid for the consistency.
 */
export const Scene3 = {
  render: () => <ServerLeavesScene pinnedProgress={REMOVAL_BEATS.settled} />,
};
