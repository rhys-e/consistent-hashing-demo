import { DensityRampScene, rampFor } from '../components/scenes/DensityRampScene';

/**
 * Candidate bridges between Scene 4 and production scale.
 *
 * **The problem.** Scene 4 ends on three servers at ten positions each — thirty
 * marks, countable, each with its own arc. The next thing the viewer sees is Scene
 * 5, which is six *different* servers at a hundred and fifty positions each: nine
 * hundred ranges, no marks at all, and a cast that shares neither names nor
 * colours with the one before it. Four things change at the slide boundary and the
 * narration slide between them mentions one.
 *
 * **What makes a bridge possible.** A server's positions are `hash(id#0)` up to
 * `hash(id#n-1)`, so raising `n` *appends*. Of the sixty positions on the ring at
 * ten each, zero move at a hundred and fifty. The dense ring is not a different
 * ring — it is the same one with more boundaries between the ones already there,
 * and that can be drawn rather than asserted.
 *
 * **What is on screen.** The marks already placed hold still while each new
 * tranche grows in between them; ownership crossfades behind them, because
 * inserting a position genuinely hands a range to somebody else and two levels are
 * two answers rather than one answer at two resolutions. The marks thin as they
 * multiply and retire before the densest level, which is the notation change the
 * cut used to make silently.
 *
 * **The number is the biggest single piece, not the spread.** Spread is not
 * monotone at these sample sizes — six servers sit at 14.8 points at ten positions
 * each, 3.0 at thirty and 5.9 at a hundred and fifty — so a scene showing it at
 * every level would show its own argument failing halfway through. The biggest
 * piece falls 7.27% to 0.70% and is also the number that matters, because what
 * makes a failure spread out is that no one range is large enough to hurt.
 */
const meta = {
  title: 'Hash Ring/Bridges/01 Density Ramp',
  component: DensityRampScene,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    treatment: {
      control: { type: 'inline-radio' },
      options: ['fill-in', 'carry-over', 'through-window', 'multiply'],
    },
    pinnedProgress: { control: { type: 'range', min: 0, max: 40, step: 0.05 } },
  },
};

export default meta;

const at = (treatment, pick) => ({
  args: { treatment, pinnedProgress: pick(rampFor(treatment).beats) },
});

/**
 * **A. Fill in.** The ramp alone, on the six servers the following scenes use.
 * Opens at ten positions each, which is the density Scene 4 ends on, so the
 * notation matches even though the cast does not.
 *
 * The cheapest of the three, and the one that leaves the roster jump unbridged.
 */
export const FillIn = { args: { treatment: 'fill-in' } };

export const FillInOpening = at('fill-in', beats => beats.opening);
export const FillInMidArrival = at(
  'fill-in',
  beats => (beats.steps[0].arrive.from + beats.steps[0].arrive.to) / 2
);
export const FillInThirty = at('fill-in', beats => beats.steps[0].settled);
export const FillInDense = at('fill-in', beats => beats.closing);

/**
 * **B. Carry over.** Opens on Scene 4's two survivors — `cache-3` and `cache-5`,
 * green and purple, at ten positions each — holding *the same positions* Scene 4
 * left them on, because they keep their real ids and a position is a hash of one.
 * Four more servers arrive, and only then does the density ramp.
 *
 * Nothing is ever cut: the cast changes, then the density does. The cost is a
 * longer scene and a colour clash — the fourth arrival takes `virtualGold`, which
 * Scene 7's joining server wants. Worth settling if this is the one.
 */
export const CarryOver = { args: { treatment: 'carry-over' } };

export const CarryOverOpening = at('carry-over', beats => beats.opening);
export const CarryOverJoining = at('carry-over', beats => (beats.join.from + beats.join.to) / 2);
export const CarryOverSixServers = at('carry-over', beats => beats.join.to + 0.25);
export const CarryOverDense = at('carry-over', beats => beats.closing);

/**
 * **C. Through the window.** The ramp with Scene 5's magnified strip up from the
 * first frame, held on one section of ring while the density rises under it. The
 * strip goes from one or two changes of owner to a dozen or more without the
 * window moving, so the claim Scene 5 makes by sweeping is made here by *waiting*.
 *
 * It folds the bridge into Scene 5 rather than adding a slide, and it fills the
 * right-hand column from the first frame with something that is true and then
 * grows — which is the one principle the three rejected answers to that problem
 * never satisfied.
 */
export const ThroughWindow = { args: { treatment: 'through-window' } };

export const ThroughWindowOpening = at('through-window', beats => beats.opening);
export const ThroughWindowThirty = at('through-window', beats => beats.steps[0].settled);
export const ThroughWindowDense = at('through-window', beats => beats.closing);

/**
 * **D. Multiply.** Scene 4's own device, at the next order of magnitude.
 *
 * Opens on the exact frame Scene 4 shows before the failure — the same three
 * servers, the same ids, so the same thirty marks in the same thirty places. Then
 * twenty more positions per server are *dealt out* on tethers from the position
 * each server started with, which is the movement the viewer was taught one scene
 * earlier and has to relearn nothing to read. The dots collapse into ticks in a
 * beat of their own, and the last hundred and twenty per server wash in as ticks.
 *
 * The notation change is the point: it is made visibly, in its own moment, instead
 * of silently across a slide boundary.
 *
 * Two things to judge. It rewinds Scene 4's failure, which the narration slide
 * between them has to absorb — the deck already does this once, between Scenes 3
 * and 4, and for the same reason. And it does not fix the roster: three servers at
 * production density still hands on to six, so the cut moves rather than
 * disappearing. It moves to where it does least damage, since nothing at that
 * density is followable individually anyway.
 */
export const Multiply = { args: { treatment: 'multiply' } };

export const MultiplyOpening = at('multiply', beats => beats.opening);
export const MultiplyDealing = at(
  'multiply',
  beats =>
    beats.steps[0].arrive.from + (beats.steps[0].arrive.to - beats.steps[0].arrive.from) * 0.55
);
export const MultiplyThirtyAsDots = at('multiply', beats => beats.steps[0].settled);
export const MultiplyMorphing = at('multiply', beats => (beats.morph.from + beats.morph.to) / 2);
export const MultiplyAsTicks = at('multiply', beats => beats.morph.to + 0.25);
export const MultiplyDense = at('multiply', beats => beats.closing);
