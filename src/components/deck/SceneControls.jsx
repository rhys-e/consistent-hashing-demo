import React, { useEffect } from 'react';

/**
 * Replay the scene. Space bar does the same.
 *
 * `replay` rather than `reset`, which is what this called and is a different thing:
 * `reset` stops playback and puts the beat back to zero, and nothing starts it
 * again. The button rewound the scene and left it sitting on its first frame.
 *
 * `useSceneTimeline` has both because both are wanted — a scene leaving the screen
 * resets, a viewer asking for it again replays — and the one this needs is the one
 * that plays.
 */

const BUTTON =
  'shrink-0 border border-cyber-border px-4 py-2 text-[11px] uppercase tracking-[0.28em] ' +
  'text-ui-text-secondary transition-colors duration-normal hover:text-ui-text-bright ' +
  'disabled:cursor-default disabled:opacity-30 disabled:hover:text-ui-text-secondary';

export function SceneControls({ timeline, enabled = true }) {
  const replay = React.useCallback(() => timeline.replay(), [timeline]);

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
