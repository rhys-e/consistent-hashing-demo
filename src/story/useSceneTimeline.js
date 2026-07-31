import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, useMotionValue, useMotionValueEvent } from 'motion/react';
import { nextStepAt, previousStepAt, stepIndexAt } from './sceneSteps';
import { SCENE_EVENT, SCENE_STATUS, nextStatus } from './scenePlayer';

/**
 * Owns a scene's continuous time as a single scalar measured in beats, so a
 * scene animates by mapping windows of that scalar onto element properties.
 *
 * The timeline itself runs linearly; easing belongs to the individual elements.
 * Keeping it to one value is what makes replay and interruption trivial, and it
 * lets a scene be pinned to any moment for visual review without playing it.
 *
 * It is also what makes the scene *navigable*. Because every element is a pure
 * function of the beat value, running the scalar backwards runs the scene
 * backwards — so stepping back through a movement costs nothing beyond animating
 * to a smaller number, and no scene needs to know it is happening.
 *
 * Discrete state (which scene is showing, whether the story is paused) is not
 * this hook's concern and is expected to live in the story machine.
 */
export function useSceneTimeline({
  beatCount,
  steps = [],
  secondsPerBeat = 1.4,
  pinnedProgress = null,
  autoPlay = true,
}) {
  const isPinned = pinnedProgress !== null && pinnedProgress !== undefined;
  const progress = useMotionValue(isPinned ? pinnedProgress : 0);
  const playbackRef = useRef(null);

  const [status, setStatus] = useState(isPinned ? SCENE_STATUS.paused : SCENE_STATUS.idle);
  const [stepIndex, setStepIndex] = useState(() => stepIndexAt(steps, progress.get()));

  /** Every status change goes through the table, so the vocabulary stays one thing. */
  const send = useCallback(event => setStatus(current => nextStatus(current, event)), []);

  useMotionValueEvent(progress, 'change', latest => {
    const next = stepIndexAt(steps, latest);
    setStepIndex(current => (current === next ? current : next));
  });

  const stop = useCallback(() => {
    playbackRef.current?.stop();
    playbackRef.current = null;
  }, []);

  /**
   * Playback is always "travel to a beat at the scene's pace", whether that is
   * the end of the scene, the next rest point, or a rest point behind us. Timing
   * by distance keeps a single step and a full play at the same speed.
   */
  const runTo = useCallback(
    (target, event) => {
      stop();
      const distance = Math.abs(target - progress.get());
      send(event);

      playbackRef.current = animate(progress, target, {
        duration: Math.max(0.001, distance * secondsPerBeat),
        ease: 'linear',
        onComplete: () => {
          playbackRef.current = null;
          send({ type: SCENE_EVENT.arrive, atEnd: target >= beatCount });
        },
      });
    },
    [beatCount, progress, secondsPerBeat, send, stop]
  );

  const play = useCallback(() => runTo(beatCount, { type: SCENE_EVENT.play }), [beatCount, runTo]);

  const pause = useCallback(() => {
    stop();
    send({ type: SCENE_EVENT.pause });
  }, [send, stop]);

  const reset = useCallback(() => {
    stop();
    progress.set(0);
    send({ type: SCENE_EVENT.reset });
  }, [progress, send, stop]);

  const replay = useCallback(() => {
    stop();
    progress.set(0);
    runTo(beatCount, { type: SCENE_EVENT.play });
  }, [beatCount, progress, runTo, stop]);

  const next = useCallback(() => {
    const target = nextStepAt(steps, progress.get());
    if (target === null) return;
    runTo(target, { type: SCENE_EVENT.stepForward });
  }, [progress, runTo, steps]);

  const previous = useCallback(() => {
    const target = previousStepAt(steps, progress.get());
    if (target === null) return;
    runTo(target, { type: SCENE_EVENT.stepBack });
  }, [progress, runTo, steps]);

  const seek = useCallback(
    value => {
      stop();
      progress.set(value);
      send({ type: SCENE_EVENT.seek, atEnd: value >= beatCount });
    },
    [beatCount, progress, send, stop]
  );

  useEffect(() => {
    if (isPinned) {
      stop();
      progress.set(pinnedProgress);
      send({ type: SCENE_EVENT.seek, atEnd: pinnedProgress >= beatCount });
      return undefined;
    }

    progress.set(0);
    if (autoPlay) play();
    else send({ type: SCENE_EVENT.reset });

    return stop;
  }, [autoPlay, beatCount, isPinned, play, pinnedProgress, progress, send, stop]);

  return {
    progress,
    status,
    stepIndex,
    stepCount: steps.length,
    // Derived from the step index rather than the live beat, so the transport
    // re-renders with them: the beat is a motion value and does not.
    canStepBack: stepIndex > 0,
    canStepForward: stepIndex < steps.length - 1,
    play,
    pause,
    reset,
    replay,
    next,
    previous,
    seek,
    stop,
  };
}
