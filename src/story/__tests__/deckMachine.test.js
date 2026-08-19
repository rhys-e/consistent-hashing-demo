import { createActor } from 'xstate';
import {
  acceptsNudge,
  deckMachine,
  isCountingDown,
  isSettled,
  isSteering,
  NUDGE_COOLDOWN_MS,
  SETTLE_DWELL_MS,
} from '../deckMachine';

const start = (slideCount = 3, initialIndex = 0) => {
  const actor = createActor(deckMachine, { input: { slideCount, initialIndex } });
  actor.start();
  return actor;
};

const wait = ms => jest.advanceTimersByTime(ms);
const settle = actor => {
  actor.send({ type: 'ARRIVE' });
  wait(NUDGE_COOLDOWN_MS);
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('the deck machine', () => {
  /**
   * The opening slide is never transitioned into, so a deck that begins by waiting
   * for an arrival waits forever. That exact bug made the countdown unreachable
   * for three rounds, and it is a starting state rather than a special case.
   */
  it('opens already arrived', () => {
    expect(isSettled(start().getSnapshot())).toBe(true);
  });

  it('is not settled while a slide is on its way in', () => {
    const actor = start();
    actor.send({ type: 'NEXT' });

    expect(isSettled(actor.getSnapshot())).toBe(false);
    actor.send({ type: 'ARRIVE' });
    expect(isSettled(actor.getSnapshot())).toBe(true);
  });

  it('stops at the ends rather than wrapping', () => {
    const actor = start(3, 0);
    actor.send({ type: 'PREV' });
    expect(actor.getSnapshot().context.index).toBe(0);

    actor.send({ type: 'GOTO', index: 99 });
    expect(actor.getSnapshot().context.index).toBe(2);
  });

  /**
   * A trackpad flick is one gesture arriving as a burst of events with a momentum
   * tail. Refusing input for a moment after arrival is what makes one flick mean
   * one slide; keyboard and ticks are deliberate acts and are never refused.
   */
  it('refuses a nudge while arriving and just after, but never a keypress', () => {
    const actor = start();
    actor.send({ type: 'NEXT' });
    expect(acceptsNudge(actor.getSnapshot())).toBe(false);

    actor.send({ type: 'ARRIVE' });
    expect(acceptsNudge(actor.getSnapshot())).toBe(false);
    // A key still works throughout, which is the whole point of the two events.
    expect(isSettled(actor.getSnapshot())).toBe(true);

    wait(NUDGE_COOLDOWN_MS);
    expect(acceptsNudge(actor.getSnapshot())).toBe(true);
  });

  it('counts down only after the scene finishes and the dwell passes', () => {
    const actor = start();
    settle(actor);

    expect(isCountingDown(actor.getSnapshot())).toBe(false);
    actor.send({ type: 'SCENE_COMPLETE' });
    expect(isCountingDown(actor.getSnapshot())).toBe(false);

    wait(SETTLE_DWELL_MS);
    expect(isCountingDown(actor.getSnapshot())).toBe(true);
  });

  it('never counts down on the last slide, which has nowhere to go', () => {
    const actor = start(3, 2);
    settle(actor);
    actor.send({ type: 'SCENE_COMPLETE' });
    wait(SETTLE_DWELL_MS * 2);

    expect(isCountingDown(actor.getSnapshot())).toBe(false);
  });

  /**
   * Engagement is a one-way latch, and it has to reach across into navigation:
   * a viewer who takes control mid-countdown must not then be moved on. Two
   * regions is what lets that be one transition rather than a condition repeated
   * in every navigation state.
   */
  it('stops advancing for good once the viewer takes over', () => {
    const actor = start();
    settle(actor);
    actor.send({ type: 'SCENE_COMPLETE' });
    wait(SETTLE_DWELL_MS);
    expect(isCountingDown(actor.getSnapshot())).toBe(true);

    actor.send({ type: 'ENGAGE' });
    expect(isCountingDown(actor.getSnapshot())).toBe(false);

    // And it does not come back, on this slide or the next.
    wait(SETTLE_DWELL_MS * 2);
    expect(isCountingDown(actor.getSnapshot())).toBe(false);

    actor.send({ type: 'NEXT' });
    settle(actor);
    actor.send({ type: 'SCENE_COMPLETE' });
    wait(SETTLE_DWELL_MS * 2);
    expect(isCountingDown(actor.getSnapshot())).toBe(false);
    expect(actor.getSnapshot().context.engaged).toBe(true);
  });

  /**
   * Moving while a scene has already reported itself finished must not carry that
   * over to the next slide, or the deck would count down on a slide nobody has
   * watched. The state is the memory, so there is nothing to reset.
   */
  it('forgets that a scene finished once the deck moves on', () => {
    const actor = start();
    settle(actor);
    actor.send({ type: 'SCENE_COMPLETE' });

    actor.send({ type: 'NEXT' });
    settle(actor);
    wait(SETTLE_DWELL_MS * 2);

    expect(isCountingDown(actor.getSnapshot())).toBe(false);
  });

  it('advances when the countdown elapses', () => {
    const actor = start();
    settle(actor);
    actor.send({ type: 'SCENE_COMPLETE' });
    wait(SETTLE_DWELL_MS);
    actor.send({ type: 'COUNTDOWN_DONE' });

    expect(actor.getSnapshot().context.index).toBe(1);
    expect(isSettled(actor.getSnapshot())).toBe(false);
  });

  /**
   * Two questions that were one flag for as long as nothing needed the second.
   *
   * `engaged` decides whether the deck still advances on its own. `steered` says
   * whether anybody else's hand has been on the wheel, which is what the marks
   * down the edge read — a viewer who presses the down arrow has nudged the story
   * along and may well want it to carry on by itself, but they have started
   * navigating and from that moment it is worth showing them where they are.
   */
  it('separates steering the deck from taking it over', () => {
    const actor = createActor(deckMachine, { input: { slideCount: 4 } }).start();

    expect(actor.getSnapshot().context.steered).toBe(false);
    expect(isSteering(actor.getSnapshot())).toBe(false);

    actor.send({ type: 'GOTO', index: 2 });

    // Steering, but not taken over: the deck may still advance on its own.
    expect(isSteering(actor.getSnapshot())).toBe(true);
    expect(actor.getSnapshot().context.engaged).toBe(false);
  });

  /** And taking it over counts as steering, without anything having moved. */
  it('counts taking over as steering', () => {
    const actor = createActor(deckMachine, { input: { slideCount: 4 } }).start();
    actor.send({ type: 'ENGAGE' });

    expect(isSteering(actor.getSnapshot())).toBe(true);
    expect(actor.getSnapshot().context.index).toBe(0);
  });
});
