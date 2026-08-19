/**
 * Ownership as a dash pattern on `pathLength="1"`. Same pattern at any radius;
 * only `r` changes. Never emit a zero-length dash or gap: SVG draws a spinning
 * disc. Phase lives in the dash offset so the array can start with a real dash.
 */

/**
 * Spans below this are dropped, and gaps below it are closed up.
 *
 * The model keeps such ranges, because they exist and they count towards a
 * server's share; the drawing declines to invent a mark for them.
 */
const MIN_VISIBLE = 1e-6;

/**
 * SVG starts a circle at three o'clock, which is position 0.75 in the story's
 * handedness, and a dash offset moves the pattern backwards from there.
 *
 * A straight path starts where it starts, so anything drawing one passes
 * `pathStart: 0` — the same pattern, measured from a different origin.
 */
export const CIRCLE_START = 0.75;
export const LINE_START = 0;

const PRECISION = 7;

/**
 * Merge ranges that touch, so a run of consecutive vnodes owned by one server
 * reads as the single span of ownership it is, and drop what is left over if it
 * is too small to draw.
 */
function coalesce(ranges) {
  const ordered = [...ranges].sort((left, right) => left.from - right.from);
  const spans = [];

  ordered.forEach(range => {
    const previous = spans[spans.length - 1];

    if (previous && range.from - previous.to <= MIN_VISIBLE) {
      previous.to = Math.max(previous.to, range.to);
      return;
    }

    spans.push({ from: range.from, to: Math.max(range.from, range.to) });
  });

  return spans.filter(span => span.to - span.from >= MIN_VISIBLE);
}

/** Distance from one position round to another, forwards, on a circle of length 1. */
export const forwards = (from, to) => (((to - from) % 1) + 1) % 1;

/**
 * Ownership as spans of `{ start, length }` around a circle.
 *
 * A range ending at the seam and one starting at it are a single span *across* it,
 * and treating them as two leaves a zero-length gap between them — the exact
 * degenerate entry that draws a disc. Only the server owning the seam has this,
 * which is why the artefact appeared on one lane at a time.
 */
function toSpans(ranges) {
  const merged = coalesce(ranges);
  const spans = merged.map(span => ({ start: span.from, length: span.to - span.from }));
  if (spans.length < 2) return spans;

  const head = spans[0];
  const tail = spans[spans.length - 1];
  const crossesSeam = head.start <= MIN_VISIBLE && tail.start + tail.length >= 1 - MIN_VISIBLE;

  if (!crossesSeam) return spans;

  return [{ start: tail.start, length: tail.length + head.length }, ...spans.slice(1, -1)];
}

/**
 * Dash pattern and offset for a set of non-overlapping ranges, or `null` for a
 * server that owns nothing — which is drawn by not drawing it, rather than by a
 * pattern that happens to render as nothing.
 *
 * The array alternates dash and gap, starting on the first span and closing with
 * the gap that wraps back round to it. Every entry is positive.
 */
export function buildDashPattern(ranges, { pathStart = CIRCLE_START } = {}) {
  const spans = toSpans(ranges);
  if (spans.length === 0) return null;

  // One span covering the whole circle is a solid ring, not a dashed one.
  if (spans.length === 1 && spans[0].length >= 1 - MIN_VISIBLE) {
    return { dashArray: null, dashOffset: 0 };
  }

  const pattern = [];

  spans.forEach((span, index) => {
    const next = spans[(index + 1) % spans.length];
    pattern.push(span.length);
    pattern.push(forwards(span.start + span.length, next.start));
  });

  return {
    dashArray: pattern.map(value => value.toFixed(PRECISION)).join(' '),
    // The phase lives here, so the array can begin with a real dash rather than a
    // zero-length one standing in for "start further along".
    dashOffset: forwards(spans[0].start, pathStart),
  };
}

/**
 * The ranges covering an arc of `length` ending at `endsAt`, split at the seam.
 *
 * Ownership runs *backwards* from a server's position to the one before it, so
 * this is the shape every arc in the story is drawn from — including a partial one
 * part-way through a sweep. Building the settled frame the same way as a moving
 * one is deliberate: a separate path for "finished" is a path that can disagree.
 */
export function arcRanges(endsAt, length) {
  if (length <= MIN_VISIBLE) return [];
  if (length >= 1 - MIN_VISIBLE) return [{ from: 0, to: 1 }];

  const wrap = value => ((value % 1) + 1) % 1;
  const from = wrap(endsAt - length);
  const to = wrap(endsAt);

  return (
    from < to
      ? [{ from, to }]
      : [
          { from, to: 1 },
          { from: 0, to },
        ]
  ).filter(range => range.to - range.from >= MIN_VISIBLE);
}

/**
 * The part of a set of ranges inside a window, rescaled so the window is 0 to 1.
 *
 * This is the whole of the magnifier. A stretch of the ring becomes a stretch of
 * anything else — a straight line, a wider arc — by being renormalised, so the
 * thing that draws it does not need to know it is looking at a detail.
 *
 * Every range is tried twice, once shifted a full turn, because a window near the
 * seam contains ranges from both ends of the space and neither offset alone finds
 * both. Ranges are already split at the seam by `buildRanges`, so no range needs
 * unwrapping itself — only relocating relative to the window.
 */
export function windowRanges(ranges, from, width) {
  if (width <= 0) return [];

  const start = ((from % 1) + 1) % 1;
  const end = start + width;
  const clipped = [];

  ranges.forEach(({ from: rangeFrom, to: rangeTo, ...rest }) => {
    [0, 1].forEach(turn => {
      const low = Math.max(start, rangeFrom + turn);
      const high = Math.min(end, rangeTo + turn);
      if (high - low <= MIN_VISIBLE) return;

      clipped.push({ ...rest, from: (low - start) / width, to: (high - start) / width });
    });
  });

  return clipped;
}
