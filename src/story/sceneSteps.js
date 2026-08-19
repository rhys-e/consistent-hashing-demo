import { pulseProgress, rangeProgress } from './easing';

/**
 * Rest points for a scene: a step is the middle of a rest, and a rest is an
 * interval where nothing but ephemera moves. Timelines are durations laid end to
 * end so retiming a movement cannot swallow the quiet after it.
 *
 * `sceneRests.test.jsx` renders either side of each step and asserts that.
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

/** Previous step, or null at the start. Mid-movement, this is the start of the current one. */
export function previousStepAt(steps, progressValue) {
  const earlier = [...steps].reverse().find(step => step.at < progressValue - EPSILON);
  return earlier ? earlier.at : null;
}

/** A step at the midpoint of a rest, carrying the interval for the rest guard. */
export function stepAtRest(rest, label) {
  return { at: (rest.from + rest.to) / 2, label, rest };
}

/** Ordered steps that fall inside the scene. */
export function buildSteps(steps, beatCount) {
  return steps
    .filter(step => step.at >= 0 && step.at <= beatCount + EPSILON)
    .sort((left, right) => left.at - right.at);
}

/** Live timelines expose lists as getters; built ones hold arrays. */
const listOf = value => (typeof value === 'function' ? value() : (value ?? []));

const holdingIn = (intervals, progressValue) =>
  listOf(intervals).find(rest => progressValue >= rest.from && progressValue <= rest.to);

const presenceIn = (intervals, progressValue) => {
  const holding = holdingIn(intervals, progressValue);
  if (!holding) return 0;

  return pulseProgress(
    progressValue,
    holding.from,
    // A note at beat zero is already up; fading it in reads as arriving late.
    holding.from === 0 ? holding.from : holding.from + OVERLAY_FADE_IN,
    holding.to - OVERLAY_FADE_OUT,
    holding.to
  );
};

export function narrationPresenceAt(timeline, progressValue) {
  return presenceIn(timeline.narrations, progressValue);
}

/**
 * Annotation column presence: one fade in, then it stays. Kept off `narrations`
 * so a line pointing at the picture never blurs it.
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

/** Lays durations end to end and records rests, captions, narrations, and annotations. */
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
    /** Stillness. After a new caption, uses at least `readingRest`. */
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
    /** Narration plus a rest to read it before anything moves. Unlabelled: the note is the readout. */
    narrate(text, duration = readingRest) {
      this.say(text);
      const interval = this.rest(duration, null);
      narrations.push(interval);
      return interval;
    },
    /** Standing commentary. Inserts no time; put a `rest` after it if the scene should hold. */
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
