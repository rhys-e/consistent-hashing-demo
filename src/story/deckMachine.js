import { assign, setup } from 'xstate';

/**
 * The deck's discrete state, as a chart.
 *
 * Everything continuous stays out: a beat is a motion value and this machine
 * never sees one. What it owns is the handful of facts the deck actually
 * coordinates — which slide, whether it has arrived, whether the scene on it has
 * finished, and whether the viewer has taken over — and those were five booleans
 * and two refs spread across four effects before this existed.
 *
 * That arrangement is where every countdown bug came from, and the shape of the
 * bug was the same each time: two pieces of state that had to agree, and nothing
 * making them. `isSettled` started `false` and the opening slide is never
 * transitioned into, so nothing ever completed and the countdown was unreachable.
 * A pointer-down anywhere marked the viewer engaged, permanently suppressing it.
 * A reduced-motion duration of zero made a countdown elapse the instant it
 * mounted. None of those is expressible here: a slide that has not arrived is in
 * `settling`, and there is nowhere for it to also be counting down from.
 *
 * ## Two regions, because there are genuinely two things happening
 *
 * Navigation runs on its own; engagement is a one-way latch that runs alongside
 * it. Modelling them as one flat state would need a copy of every navigation
 * state for the engaged case, which is exactly the duplication the booleans were.
 *
 * ## The cooldown is a state, not a timestamp
 *
 * A trackpad flick arrives as a burst of wheel events with a momentum tail, so a
 * slide that has just arrived must refuse input briefly or one gesture moves two
 * slides. That was a stored timestamp compared against `event.timeStamp`; it is
 * now the `cooling` state, which cannot be got wrong and needs no clock.
 *
 * Keyboard and the progress ticks are deliberately *not* subject to it — they are
 * deliberate acts, not the tail of one. Hence two events: `NUDGE` for wheel and
 * touch, `GOTO`/`NEXT`/`PREV` for everything else.
 */

/** A finished slide is left alone for a moment before it starts counting down. */
export const SETTLE_DWELL_MS = 1500;
/** A slide is settled this long before another nudge counts. */
export const NUDGE_COOLDOWN_MS = 260;
/**
 * How long before the deck moves on the title breaks up.
 *
 * Late, and on its own. Firing it with the countdown bar put two changes on
 * screen at the same moment, and a viewer has to choose which to look at. This
 * way the bar states the fact for five seconds and the title takes a bow at the
 * end of them.
 */
export const CLOSING_MS = 1500;

const clamp = (value, count) => Math.min(count - 1, Math.max(0, value));

export const deckMachine = setup({
  types: {
    context: {},
    events: {},
    input: {},
  },
  guards: {
    /**
     * The deck only advances by itself while nobody has taken it over, and never
     * off the end. Both were `&&`s in a derived boolean; here they gate the one
     * transition that can start a countdown, so there is no second place to
     * forget them.
     */
    canAdvanceAlone: ({ context }) => !context.engaged && context.index < context.slideCount - 1,
    movesSomewhere: ({ context, event }) => targetOf(context, event) !== context.index,
  },
  actions: {
    /**
     * `viaViewer` records who moved the deck, which is not a detail the machine
     * needs but is the one thing an address bar cannot work out for itself.
     * A move somebody made is worth a history entry; the deck advancing on its
     * own is not, or the back button becomes a way to re-watch the story one
     * slide at a time rather than a way out.
     */
    goToTarget: assign({
      index: ({ context, event }) => targetOf(context, event),
      viaViewer: true,
      /**
       * Sticky, and separate from `engaged` on purpose.
       *
       * Moving the deck yourself is not the same as taking it over: a viewer who
       * presses the down arrow has nudged the story along and may well want it to
       * carry on by itself, which is why navigating deliberately does not stop the
       * countdown. But they have started steering, and from that moment the marks
       * down the edge are worth showing — where am I, and how much is left.
       *
       * `engaged` answers "should the deck stop driving". This answers "is anybody
       * else's hand on the wheel". They are different questions and were one flag
       * for exactly as long as nothing needed the second one.
       */
      steered: true,
    }),
    advance: assign({
      index: ({ context }) => clamp(context.index + 1, context.slideCount),
      viaViewer: false,
    }),
    engage: assign({ engaged: true }),
  },
  delays: {
    dwell: SETTLE_DWELL_MS,
    cooldown: NUDGE_COOLDOWN_MS,
    untilClosing: ({ context }) => Math.max(0, context.countdownMs - CLOSING_MS),
  },
}).createMachine({
  id: 'deck',
  context: ({ input }) => ({
    index: clamp(input?.initialIndex ?? 0, input?.slideCount ?? 1),
    slideCount: input?.slideCount ?? 1,
    engaged: false,
    steered: false,
    // Nobody has moved it yet, so the opening address replaces rather than pushes.
    viaViewer: false,
    countdownMs: input?.countdownMs ?? 5000,
  }),
  type: 'parallel',
  states: {
    navigation: {
      // The deck opens already arrived. The first slide is not transitioned into,
      // so a machine that started in `settling` would wait for an `ARRIVE` that
      // nothing is ever going to send.
      initial: 'cooling',
      states: {
        settling: {
          on: { ARRIVE: 'cooling' },
        },
        cooling: {
          after: { cooldown: 'ready' },
        },
        ready: {
          on: {
            SCENE_COMPLETE: { target: 'dwelling', guard: 'canAdvanceAlone' },
          },
        },
        dwelling: {
          after: { dwell: 'counting' },
          on: { ENGAGE: 'ready' },
        },
        counting: {
          initial: 'running',
          states: {
            running: {
              after: { untilClosing: 'closing' },
            },
            /** The last moment of a slide, and the only thing that reads it. */
            closing: {},
          },
          on: {
            COUNTDOWN_DONE: { target: 'settling', actions: 'advance' },
            ENGAGE: 'ready',
          },
        },
      },
      on: {
        GOTO: {
          target: '.settling',
          guard: 'movesSomewhere',
          actions: 'goToTarget',
        },
        NEXT: { target: '.settling', guard: 'movesSomewhere', actions: 'goToTarget' },
        PREV: { target: '.settling', guard: 'movesSomewhere', actions: 'goToTarget' },
      },
    },
    engagement: {
      initial: 'watching',
      states: {
        /**
         * One way. Handing control back after one slide would take it away again
         * on the next, and a viewer who has started stepping through has already
         * said what they want.
         */
        watching: {
          on: { ENGAGE: { target: 'engaged', actions: 'engage' } },
        },
        engaged: { type: 'final' },
      },
    },
  },
});

function targetOf(context, event) {
  const { index, slideCount } = context;
  if (event.type === 'GOTO') return clamp(event.index, slideCount);
  if (event.type === 'NEXT') return clamp(index + 1, slideCount);
  if (event.type === 'PREV') return clamp(index - 1, slideCount);
  return index;
}

/**
 * A slide is settled once it has arrived, which includes while it is cooling
 * down, dwelling, or counting.
 *
 * This is the fact the rest of the deck asks for — a scene plays when its slide
 * has settled — and deriving it here rather than at each call site is what stops
 * "settled" quietly meaning something slightly different in three places.
 */
export const isSettled = state => !state.matches({ navigation: 'settling' });
export const isCountingDown = state => state.matches({ navigation: 'counting' });

/**
 * Whether the viewer has had any hand in this, by taking over or by steering.
 *
 * What the deck's own controls read, as against `engaged`, which is what decides
 * whether it still advances on its own.
 */
export const isSteering = state => state.context.engaged || state.context.steered;
/** The last second and a half, when the slide takes its bow. */
export const isClosing = state => state.matches({ navigation: { counting: 'closing' } });

/**
 * Whether a nudge should be acted on: wheel and touch are refused while a slide
 * is arriving or in the moment after, so one gesture can only ever mean one
 * slide.
 */
export const acceptsNudge = state =>
  !state.matches({ navigation: 'settling' }) && !state.matches({ navigation: 'cooling' });
