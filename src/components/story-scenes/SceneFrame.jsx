import React from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { useScramble } from '../../story/useScramble';
import SceneNote from './SceneNote';

/**
 * Shared chrome for the guided story scenes.
 *
 * The scene fills whatever it is given as a three-row column, so the artwork
 * claims the space the narration and transport do not need. It sizes to `h-full`
 * rather than `h-screen` on purpose: inside a deck a scene occupies a slide, and a
 * scene that assumes the viewport instead overflows its slide by however much the
 * two differ.
 *
 * There is no scene title and no rule across the top. The narration slide that
 * precedes a scene has already named the chapter, so a title repeats it — and a
 * boxed frame on every scene puts a visible seam between slides that should read
 * as one continuous canvas.
 *
 * ## Where the words go
 *
 * Two modes, because this is the part that has been hardest to get right.
 *
 * `overlay` is the default: the artwork carries no text at all while it moves, and
 * an explanation arrives over a paused, softened scene at the moments the scene
 * holds for one. See `SceneNote`.
 *

 * `header` keeps the caption in the top left throughout, which is what a scene with
 * nothing to say at intervals — a static comparison, say — actually wants. It was
 * also the default for a while, and the reason it is not any more is worth
 * recording: a line of prose beside a moving picture gets read *or* watched, never
 * both, and the viewer loses whichever they come to second.
 */

function HeaderCaption({ caption, active }) {
  const resolved = useScramble({ text: caption ?? '', active, durationMs: 420 });

  return <p className="max-w-5xl text-lg leading-relaxed text-ui-text-secondary">{resolved}</p>;
}

export function SceneFrame({
  caption,
  captionMode = 'overlay',
  actions,
  active = true,
  progress,
  presenceFor,
  remainingFor,
  children,
}) {
  const asOverlay = captionMode === 'overlay' && Boolean(progress && presenceFor);
  // A scene with no timeline of its own — a static comparison — still has to be
  // able to render, so there is always something to transform from.
  const still = useMotionValue(0);

  // The artwork steps back and goes soft while a note is up, so only one of the two
  // is ever in focus.
  const presence = useTransform(progress ?? still, latest => (asOverlay ? presenceFor(latest) : 0));
  const artworkOpacity = useTransform(presence, latest => 1 - 0.78 * latest);
  const artworkBlur = useTransform(presence, latest => `blur(${(latest * 5).toFixed(2)}px)`);

  return (
    <div className="relative flex h-full flex-col bg-body-bg px-14 py-9 font-mono text-ui-text-primary">
      {/* No caption, no header: a scene that says nothing should not reserve a
          hundred pixels at the top to say it in. */}
      {!asOverlay && caption ? (
        <header className="h-24 shrink-0">
          <HeaderCaption caption={caption} active={active} />
        </header>
      ) : null}

      <motion.div
        className="flex min-h-0 flex-1 items-center justify-center py-4"
        style={asOverlay ? { opacity: artworkOpacity, filter: artworkBlur } : undefined}
      >
        {children}
      </motion.div>

      {/* No step readout here. The names the timeline uses for its rests are
          internal — `cache-03 hands over`, `Folding in` — and at montage pace they
          changed faster than they could be read, which is a caption competing with
          the picture for the sake of naming something the picture was already
          showing. */}
      <footer className="flex h-11 shrink-0 items-center justify-end">{actions}</footer>

      {asOverlay ? (
        <SceneNote
          progress={progress}
          text={caption ?? ''}
          presenceFor={presenceFor}
          remainingFor={remainingFor ?? (() => 0)}
        />
      ) : null}
    </div>
  );
}

export default SceneFrame;
