import { useState } from 'react';
import { useMotionValueEvent } from 'motion/react';

/**
 * The line of narration belonging to the current beat.
 *
 * A scene that changes shape needs to say what it is doing while it does it, but
 * a caption is text and text cannot be an animated attribute. Selecting from a
 * fixed list by beat costs one render per caption change rather than one per
 * frame, and keeps the narration in the same timeline as the motion it describes.
 *
 * `captions` is ordered by `from`, in beats.
 */
export function useBeatCaption(progress, captions) {
  const indexFor = value => {
    let found = 0;
    captions.forEach((caption, index) => {
      if (value >= caption.from) found = index;
    });
    return found;
  };

  const [index, setIndex] = useState(() => indexFor(progress.get()));

  useMotionValueEvent(progress, 'change', latest => {
    const next = indexFor(latest);
    setIndex(current => (current === next ? current : next));
  });

  // A scene with nothing to say is a scene, not a mistake: the full-scale view
  // lost its only caption when the story stopped needing it, and indexing an
  // empty list here took the scene down with it.
  return captions[Math.min(index, captions.length - 1)]?.text ?? null;
}
