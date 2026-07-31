import { useEffect, useState } from 'react';

const GLYPHS = '▚▞█▓▒░01ABCDEF/\\<>{}[]#*+=-';

/**
 * Deterministic given its inputs, so a render never depends on `Math.random`.
 */
function scrambleGlyph(index, tick) {
  const hashed = Math.imul(index + 1, 2654435761) ^ Math.imul(tick + 1, 40503);
  return GLYPHS[Math.abs(hashed) % GLYPHS.length];
}

/**
 * Text that resolves out of noise, left to right.
 *
 * The same device as the hash decode in Scene 0, which is the moment in this
 * story that most looks like the thing it is describing — a value being read out
 * of a machine rather than typed by a person. Reusing it on the narration slides
 * is what keeps them part of the same object as the scenes, instead of a
 * stylesheet's idea of a title card.
 *
 * Spaces are never scrambled, so the shape of the sentence is legible before its
 * letters are, and the text never reflows as it resolves.
 */
export function useScramble({ text, active = true, characterMs = 26, durationMs, churnMs = 45 }) {
  // A caption resolves in a fixed time regardless of length; a title resolves at a
  // fixed rate per character, because its length is the point.
  const perCharacter = durationMs
    ? Math.max(4, durationMs / Math.max(1, text.length))
    : characterMs;
  const [revealed, setRevealed] = useState(active ? 0 : text.length);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) {
      setRevealed(text.length);
      return undefined;
    }

    setRevealed(0);
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      setRevealed(count);
      if (count >= text.length) clearInterval(timer);
    }, perCharacter);

    return () => clearInterval(timer);
  }, [active, perCharacter, text]);

  const isResolving = active && revealed < text.length;

  useEffect(() => {
    if (!isResolving) return undefined;

    const timer = setInterval(() => setTick(current => current + 1), churnMs);
    return () => clearInterval(timer);
  }, [churnMs, isResolving]);

  if (revealed >= text.length) return text;

  return text
    .split('')
    .map((character, index) => {
      if (index < revealed || character === ' ') return character;
      return scrambleGlyph(index, tick);
    })
    .join('');
}
