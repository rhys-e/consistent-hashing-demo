import { useState } from 'react';
import { useMotionValueEvent } from 'motion/react';

/**
 * A number that follows the scene timeline but only re-renders when its formatted
 * text actually changes.
 *
 * Numbers are the one thing in these scenes that cannot be an animated attribute,
 * because they are text. Formatting first and comparing the result keeps a metric
 * counting up smoothly at whatever precision it is displayed to, rather than once
 * per frame — the same bargain `useHashDecode` makes.
 */
export function useAnimatedNumber({ progress, valueFor, format }) {
  const [text, setText] = useState(() => format(valueFor(progress.get())));

  useMotionValueEvent(progress, 'change', latest => {
    const next = format(valueFor(latest));
    setText(current => (current === next ? current : next));
  });

  return text;
}
