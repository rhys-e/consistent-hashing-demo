import React, { useEffect } from 'react';
import { SCENE_EVENT, canStepWhile, primaryActionFor } from '../story/scenePlayer';

/**
 * Transport for a scene.
 *
 * A scene that has finished playing has nothing to offer but a replay, which asks
 * the viewer to sit through the whole thing again to see the one moment they
 * missed. Stepping is the answer, and because the timeline is a single scalar,
 * stepping back genuinely rewinds the scene rather than cutting to an earlier
 * still.
 *
 * Nothing in here moves. Back and Next sit together because they are one control
 * used twice; the primary is a different kind of action and goes last, at a fixed
 * width so that Play becoming Reset does not shift the row under the cursor.
 */

const BUTTON =
  'shrink-0 border border-cyber-border px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-ui-text-secondary transition-colors duration-normal hover:text-ui-text-bright disabled:cursor-default disabled:opacity-30 disabled:hover:text-ui-text-secondary';
const PRIMARY = `${BUTTON} w-[6.5rem] text-center`;

const PRIMARY_LABEL = {
  [SCENE_EVENT.play]: 'Play',
  [SCENE_EVENT.reset]: 'Reset',
};

function useTransportKeys({ onPrimary, onNext, onPrevious, enabled }) {
  useEffect(() => {
    if (!enabled) return undefined;

    const handle = event => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable]')
      ) {
        return;
      }

      if (event.key === 'ArrowRight') onNext();
      else if (event.key === 'ArrowLeft') onPrevious();
      else if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        onPrimary();
      } else return;
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [enabled, onNext, onPrevious, onPrimary]);
}

export function SceneControls({ timeline, enabled = true }) {
  const { status, stepIndex, stepCount, canStepBack, canStepForward } = timeline;

  const isAtStart = stepIndex === 0;
  const primary = primaryActionFor(status, isAtStart);
  const stepping = canStepWhile(status);

  const onPrimary = () => (primary === SCENE_EVENT.reset ? timeline.reset() : timeline.play());
  const onNext = () => stepping && timeline.next();
  const onPrevious = () => stepping && timeline.previous();

  // A deck has every scene mounted at once; only the one on screen may answer.
  useTransportKeys({ onPrimary, onNext, onPrevious, enabled });

  return (
    <div className="flex shrink-0 items-center gap-3">
      <span className="mr-1 text-[11px] uppercase tracking-[0.28em] text-ui-text-secondary/60">
        {`${String(stepIndex + 1).padStart(2, '0')} / ${String(stepCount).padStart(2, '0')}`}
      </span>
      <button
        type="button"
        className={BUTTON}
        onClick={onPrevious}
        disabled={!stepping || !canStepBack}
        aria-label="Previous step"
      >
        Back
      </button>
      <button
        type="button"
        className={BUTTON}
        onClick={onNext}
        disabled={!stepping || !canStepForward}
        aria-label="Next step"
      >
        Next
      </button>
      <button type="button" className={PRIMARY} onClick={onPrimary}>
        {PRIMARY_LABEL[primary]}
      </button>
    </div>
  );
}

export default SceneControls;
