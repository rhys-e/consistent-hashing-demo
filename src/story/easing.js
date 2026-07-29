export const clamp01 = value => Math.min(1, Math.max(0, value));

/**
 * Maps an absolute scene-timeline value into a local 0..1 for one window of it,
 * so every animated element can describe itself as "I happen between these two
 * beats" without knowing anything about the timeline as a whole.
 */
export function rangeProgress(value, from, to) {
  const span = to - from;
  if (span <= 0) return value >= to ? 1 : 0;
  return clamp01((value - from) / span);
}

/**
 * Ramps up and back down across a window, for things that appear and then leave.
 */
export function pulseProgress(value, from, peakStart, peakEnd, to) {
  if (value <= from || value >= to) return 0;
  if (value < peakStart) return rangeProgress(value, from, peakStart);
  if (value > peakEnd) return 1 - rangeProgress(value, peakEnd, to);
  return 1;
}

export const easeOutCubic = t => 1 - (1 - t) ** 3;

export const easeInOutCubic = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

export function easeOutBack(t, overshoot = 1.70158) {
  return 1 + (overshoot + 1) * (t - 1) ** 3 + overshoot * (t - 1) ** 2;
}

export const mix = (from, to, t) => from + (to - from) * t;
