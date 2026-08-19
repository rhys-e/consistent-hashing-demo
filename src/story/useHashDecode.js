import { useEffect, useState } from 'react';
import { useMotionValueEvent } from 'motion/react';
import { rangeProgress } from './easing';

const GLYPHS = '0123456789ABCDEF';

/**
 * Deterministic given its inputs, so rendering stays pure and the churn is
 * driven by an explicit seed rather than by calling Math.random during render.
 */
function scrambleGlyph(index, seed) {
  const hashed = Math.imul(index + 1, 2654435761) ^ Math.imul(seed + 1, 40503);
  return GLYPHS[Math.abs(hashed) % GLYPHS.length];
}

/**
 * Reveals a hash value left to right across a window of the scene timeline,
 * scrambling the digits that have not resolved yet.
 *
 * This is the one part of a scene that cannot be a pure motion value, because it
 * mutates text rather than an attribute. It re-renders once per revealed digit
 * plus once per churn tick, rather than once per frame.
 */
export function useHashDecode({ hashValue, progress, from, to, churnMs = 55 }) {
  const digits = hashValue.replace(/^0x/i, '');

  const [revealedCount, setRevealedCount] = useState(() =>
    Math.round(rangeProgress(progress.get(), from, to) * digits.length)
  );
  const [churnSeed, setChurnSeed] = useState(0);

  useMotionValueEvent(progress, 'change', latest => {
    const next = Math.round(rangeProgress(latest, from, to) * digits.length);
    setRevealedCount(current => (current === next ? current : next));
  });

  const isDecoding = revealedCount > 0 && revealedCount < digits.length;

  useEffect(() => {
    if (!isDecoding) return undefined;

    const timer = setInterval(() => setChurnSeed(seed => seed + 1), churnMs);
    return () => clearInterval(timer);
  }, [churnMs, isDecoding]);

  if (revealedCount <= 0) return '';

  const decoded = digits
    .split('')
    .map((digit, index) => (index < revealedCount ? digit : scrambleGlyph(index, churnSeed)))
    .join('');

  return `0x${decoded}`;
}
