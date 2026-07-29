import React from 'react';

/**
 * Shared chrome for the guided story scenes.
 *
 * The scene fills the viewport as a three-row column so the artwork claims
 * whatever space the header and caption do not need. Sizing the SVG against the
 * viewport rather than a fixed max width is what keeps the visuals imposing on a
 * large display while still degrading gracefully on a short one.
 */
export function SceneFrame({ sceneNumber, sceneLabel, title, caption, actions, children }) {
  return (
    <div className="flex h-screen flex-col bg-body-bg px-14 py-11 font-mono text-ui-text-primary">
      <header className="shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-xs uppercase tracking-[0.5em] text-ui-text-secondary">
            Scene {sceneNumber}
          </span>
          <span className="flex-1 border-t border-cyber-border" />
          <span className="text-xs uppercase tracking-[0.5em] text-ui-text-secondary">
            {sceneLabel}
          </span>
        </div>
        <h1 className="mt-8 font-orbitron text-4xl font-normal uppercase tracking-[0.22em] text-ui-text-heading">
          {title}
        </h1>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center py-5">{children}</div>

      <footer className="flex h-[5.5rem] shrink-0 items-end justify-between gap-10">
        {/* Caption and actions share a fixed footer height so every scene leaves
            the same vertical budget for the SVG. Without that, a wrapping caption
            or a replay button changes the meet-scale and the rail jumps size. */}
        <p className="max-w-3xl text-lg leading-loose text-ui-text-secondary">{caption}</p>
        <div className="flex h-11 shrink-0 items-center justify-end">{actions}</div>
      </footer>
    </div>
  );
}

export default SceneFrame;
