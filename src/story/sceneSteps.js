import { pulseProgress, rangeProgress } from './easing';

/**
 * A scene's rest points: the moments it is worth stopping on.
 *
 * Scenes are continuous functions of one scalar, so any value is renderable. That
 * makes a scene scrubbable but not *navigable* — a viewer stepping through needs
 * to land where a movement has finished, not halfway through one.
 *
 * The definition that keeps this honest: **a step is the middle of a rest.** A
 * rest is an interval during which nothing moves — every effect that started has
 * finished, and the next has not begun. Landing in the middle of one rather than
 * on its edge means a step can never show a half-finished fade, and can never be
 * a composite of the end of one movement and the start of the next.
 *
 * Two things follow, and both matter more than they look:
 *
 * - Scene timelines are built from **durations laid end to end**, not from
 *   timestamps. Rests are then intervals the builder knows about rather than gaps
 *   an author has to notice, so retiming a movement cannot silently swallow one.
 * - Effects that are pure decoration — a glow on arrival, a pulse at the seam —
 *   are marked ephemeral and excluded, both from the rest and from the check that
 *   enforces it. A scene should not have to wait for its own glitter.
 *
 * `sceneRests.test.jsx` renders each scene either side of each step and asserts
 * nothing but ephemera moves, so this stays true rather than merely intended.
 */

/** Values within this of a step count as being on it, not before or after it. */
const EPSILON = 1e-3;

/** How long the narration overlay takes to arrive, and to get out of the way. */
const OVERLAY_FADE_IN = 0.3;
const OVERLAY_FADE_OUT = 0.45;

export function stepIndexAt(steps, progressValue) {
  let found = 0;

  steps.forEach((step, index) => {
    if (progressValue >= step.at - EPSILON) found = index;
  });

  return found;
}

/** Where a step forward lands, or null at the end of the scene. */
export function nextStepAt(steps, progressValue) {
  const upcoming = steps.find(step => step.at > progressValue + EPSILON);
  return upcoming ? upcoming.at : null;
}

/**
 * Where a step back lands, or null at the start.
 *
 * Stopping mid-movement and stepping back returns to the start of the movement
 * you are in, which is what makes "watch that again" one press rather than two.
 */
export function previousStepAt(steps, progressValue) {
  const earlier = [...steps].reverse().find(step => step.at < progressValue - EPSILON);
  return earlier ? earlier.at : null;
}

/**
 * A step in the middle of a rest interval, carrying the interval with it so the
 * guard test can check the whole of it rather than a single instant.
 */
export function stepAtRest(rest, label) {
  return { at: (rest.from + rest.to) / 2, label, rest };
}

/**
 * Builds a step list, dropping any that fall outside the scene and keeping them
 * ordered. Scenes assemble theirs from timeline constants, so this is where a
 * mistimed constant gets caught rather than at the end of a playthrough.
 */
export function buildSteps(steps, beatCount) {
  return steps
    .filter(step => step.at >= 0 && step.at <= beatCount + EPSILON)
    .sort((left, right) => left.at - right.at);
}

/**
 * How far up the narration overlay is, from 0 to 1.
 *
 * It fades in over the start of a narration rest and back out before the end, so
 * the artwork is fully itself again by the time the next movement begins. The
 * scene is already still for the whole of that window — the overlay is not
 * pausing anything, it is using a pause that was there to be used.
 */
/**
 * A live timeline exposes its lists as getters; a built one has already called them
 * and holds plain arrays. Both turn up here, so accept either.
 */
const listOf = value => (typeof value === 'function' ? value() : (value ?? []));

const holdingIn = (intervals, progressValue) =>
  listOf(intervals).find(rest => progressValue >= rest.from && progressValue <= rest.to);

const presenceIn = (intervals, progressValue) => {
  const holding = holdingIn(intervals, progressValue);
  if (!holding) return 0;

  return pulseProgress(
    progressValue,
    holding.from,
    // A note that opens the scene is already up when the scene starts. Fading it
    // in over the first moments leaves the artwork at full strength with nothing
    // said about it, which reads as the note arriving late rather than as the
    // scene beginning.
    holding.from === 0 ? holding.from : holding.from + OVERLAY_FADE_IN,
    holding.to - OVERLAY_FADE_OUT,
    holding.to
  );
};

export function narrationPresenceAt(timeline, progressValue) {
  return presenceIn(timeline.narrations, progressValue);
}

/**
 * How present the annotation column is: it comes up once and stays.
 *
 * Annotations are standing commentary, not a note that is put up and taken down —
 * an explanation of what is happening should still be there when the viewer looks
 * away from it and back. So there is one fade, at the first line, and after that
 * the words change underneath rather than the column blinking between them.
 *
 * They are deliberately absent from `narrations`, because that list is what dims
 * and blurs the artwork, and a line pointing at the picture must never be the
 * reason the picture is hidden.
 */
export function annotationPresenceAt(timeline, progressValue) {
  const [first] = listOf(timeline.annotations);
  if (!first) return 0;

  return rangeProgress(progressValue, first.from, first.from + OVERLAY_FADE_IN);
}

/** Whatever was last said, which stands until something else is. */
export function annotationAt(timeline, progressValue) {
  const standing = listOf(timeline.annotations).filter(entry => progressValue >= entry.from);
  return standing.length ? standing[standing.length - 1].text : null;
}

/**
 * How much of the current narration rest is left, as a fraction, or zero when the
 * scene is not holding for something to be read.
 */
export function remainingReadingAt(timeline, progressValue) {
  const holding = holdingIn(timeline.narrations, progressValue);
  if (!holding) return 0;

  return 1 - (progressValue - holding.from) / Math.max(1e-6, holding.to - holding.from);
}

/**
 * Lays durations end to end and remembers where the rests were.
 *
 * Scene timings used to be absolute beats, which meant every rest was a gap an
 * author had to keep clear by hand: lengthening one movement quietly ate the
 * quiet moment after it, and a step that used to be a still frame became a
 * half-finished one. Durations remove that failure mode by construction.
 */
export function createTimeline({ readingRest = 0 } = {}) {
  let cursor = 0;
  let unreadCaption = false;
  const rests = [];
  const captions = [];
  const narrations = [];
  const annotations = [];

  return {
    at: () => cursor,
    /** A movement. Returns its window and leaves the cursor at its end. */
    move(duration) {
      const from = cursor;
      cursor += duration;
      return { from, to: cursor };
    },
    /**
     * A moment when nothing moves, and therefore somewhere a viewer can stand.
     *
     * A rest that follows new narration is given the longer reading duration. A
     * caption is read during the movement it introduces, but arriving at the end
     * of that movement and being moved straight on gives no time to finish, and
     * the viewer loses either the sentence or the picture.
     */
    rest(duration, label) {
      const from = cursor;
      cursor += unreadCaption ? Math.max(duration, readingRest) : duration;
      unreadCaption = false;

      const interval = { from, to: cursor, label };
      rests.push(interval);
      return interval;
    },
    skip(duration) {
      cursor += duration;
    },
    /** Narration begins here, and runs until the next thing said. */
    say(text) {
      captions.push({ from: cursor, text });
      unreadCaption = true;
    },
    /**
     * New narration, and a rest to read it in before anything moves.
     *
     * Captions used to arrive with the movement they introduce, which put reading
     * and watching in competition and lost whichever the viewer did second — and
     * on the shorter phases the text was gone before it could be finished. Giving
     * the words their own step means the sentence lands, and then the picture
     * answers it.
     */
    narrate(text, duration = readingRest) {
      this.say(text);
      // Deliberately unlabelled: the note on screen *is* the readout for this rest,
      // and using the sentence as a step name would put the whole of it in a footer
      // sized for two words.
      const interval = this.rest(duration, null);
      narrations.push(interval);
      return interval;
    },
    /**
     * Standing commentary, beside the artwork rather than over it.
     *
     * `narrate` earns its scrim by running over a frame not yet worth looking at,
     * and pays for it with a rest of its own. Anywhere else the frame *is* the
     * explanation, so an annotation neither hides it nor stops it: it says one
     * thing at the moment it becomes true and leaves it standing until there is
     * something else to say.
     *
     * That is why it inserts no time. A line that stays up does not need a pause
     * to be read in — the movement it describes is the pause. Where stillness is
     * wanted anyway, ask for a `rest` and put the annotation before it.
     */
    annotate(text) {
      const interval = { from: cursor, text };
      annotations.push(interval);
      return interval;
    },
    rests: () => rests,
    captions: () => captions,
    narrations: () => narrations,
    annotations: () => annotations,
  };
}
