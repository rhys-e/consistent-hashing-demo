import { useCallback, useEffect, useRef } from 'react';
import { animate, useMotionValue } from 'motion/react';

/**
 * Owns a scene's continuous time as a single scalar measured in beats, so a
 * scene animates by mapping windows of that scalar onto element properties.
 *
 * The timeline itself runs linearly; easing belongs to the individual elements.
 * Keeping it to one value is what makes replay and interruption trivial, and it
 * lets a scene be pinned to any moment for visual review without playing it.
 *
 * Discrete state (which scene is showing, whether the story is paused) is not
 * this hook's concern and is expected to live in the story machine.
 */
export function useSceneTimeline({ beatCount, secondsPerBeat = 1.4, pinnedProgress = null }) {
  const isPinned = pinnedProgress !== null && pinnedProgress !== undefined;
  const progress = useMotionValue(isPinned ? pinnedProgress : 0);
  const playbackRef = useRef(null);

  const stop = useCallback(() => {
    playbackRef.current?.stop();
    playbackRef.current = null;
  }, []);

  const play = useCallback(() => {
    stop();
    playbackRef.current = animate(progress, beatCount, {
      duration: Math.max(0.001, (beatCount - progress.get()) * secondsPerBeat),
      ease: 'linear',
    });
  }, [beatCount, progress, secondsPerBeat, stop]);

  const replay = useCallback(() => {
    stop();
    progress.set(0);
    playbackRef.current = animate(progress, beatCount, {
      duration: beatCount * secondsPerBeat,
      ease: 'linear',
    });
  }, [beatCount, progress, secondsPerBeat, stop]);

  const seek = useCallback(
    value => {
      stop();
      progress.set(value);
    },
    [progress, stop]
  );

  useEffect(() => {
    if (isPinned) {
      stop();
      progress.set(pinnedProgress);
      return undefined;
    }

    progress.set(0);
    playbackRef.current = animate(progress, beatCount, {
      duration: beatCount * secondsPerBeat,
      ease: 'linear',
    });

    return stop;
  }, [beatCount, isPinned, pinnedProgress, progress, secondsPerBeat, stop]);

  return { progress, play, replay, seek, stop };
}
