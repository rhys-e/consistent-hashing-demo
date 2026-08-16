import React, { useEffect } from 'react';

/**
 * Transport for a scene: one button, and the space bar.
 *
 * It used to offer Back and Next as well, on the reasoning that a scene which has
 * finished has nothing to give but a replay, and stepping lets somebody return to
 * the one moment they missed. The reasoning holds and the control did not. A step
 * is only meaningful at a rest, the rests are unevenly spaced, and pressing Next
 * twice in a row lands somewhere the viewer has no way to predict — so the thing
 * that reads as a scrubber behaves like a chapter list nobody has seen.
 *
 * What is left is the one action that is always unambiguous: put the scene back to
 * its beginning. The timeline still keeps its steps, because that is what
 * `sceneRests` checks the scenes against — they are the scene's structure, not
 * only a control surface.
 */

const BUTTON =
  'shrink-0 border border-cyber-border px-4 py-2 text-[11px] uppercase tracking-[0.28em] ' +
  'text-ui-text-secondary transition-colors duration-normal hover:text-ui-text-bright ' +
  'disabled:cursor-default disabled:opacity-30 disabled:hover:text-ui-text-secondary';

export function SceneControls({ timeline, enabled = true }) {
  const replay = React.useCallback(() => timeline.reset(), [timeline]);

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
      if (event.key !== ' ' && event.key !== 'Spacebar') return;

      event.preventDefault();
      replay();
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [enabled, replay]);

  return (
    <div className="flex items-center gap-3">
      <button type="button" className={BUTTON} onClick={replay} disabled={!enabled}>
        Replay
      </button>
    </div>
  );
}

export default SceneControls;
