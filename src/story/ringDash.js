/**
 * Ownership ranges expressed as a dash pattern rather than as arc paths.
 *
 * A circle with `pathLength="1"` measures its own circumference as 1, so a dash
 * array written in position units means the same thing at any radius. That is
 * what makes the full-scale scene animate at all: a server's ranges are computed
 * once, and moving them between the shared ring and their own lane is a change to
 * one number, `r`, rather than several thousand rebuilt path coordinates.
 *
 * It also makes the claim structurally: the arcs on the single ring and the arcs
 * in a lane are not two drawings of the same data, they are the same drawing.
 *
 * ## Never emit a zero-length dash or gap
 *
 * This is the rule the whole module is arranged around, and it was learned twice.
 * A renderer handed a degenerate segment has no tangent to orient the stroke by,
 * and draws a disc the width of the stroke instead — a mark orders of magnitude
 * larger than the range it stands for, which spins as the geometry moves because
 * its orientation is undefined.
 *
 * The first cause was real but rare: two vnodes hashing within a hair of each
 * other. The second was self-inflicted and systematic. An SVG dash array begins
 * with a dash, so a pattern whose first range does not start at the seam used to
 * open with a zero-length one — and the server that *does* own the seam closed
 * with a zero-length gap instead. Both sat exactly at the seam, which is why the
 * artefact always appeared at the bottom of the ring.
 *
 * The phase now lives in the dash *offset*, which is what it is for, so the array
 * can begin with a real dash and close with a single gap that wraps around.
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
 */
const CIRCLE_START = 0.75;

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
export function buildDashPattern(ranges) {
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
    dashOffset: forwards(spans[0].start, CIRCLE_START),
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
