import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../../themes';
import { useScramble } from '../../story/useScramble';

/**
 * An explanation, delivered over a paused scene.
 *
 * A caption sitting beside a running animation asks to be read and watched at the
 * same time, and loses whichever the viewer does second. A narration slide fixes
 * that by separating them completely, but a hard cut is too much for a remark made
 * partway through a movement — it breaks the thread the movement is building.
 *
 * This is the middle setting: the scene holds, the artwork steps back and goes
 * soft, the note comes forward, and then it leaves and the movement resumes. A
 * director's commentary rather than a chapter heading. Nothing is competing,
 * because only one of the two is in focus at a time, and nothing is cut, because
 * the scene the viewer comes back to is the one they left.
 *
 * The scene was already still for the whole of this window — narration rests exist
 * so a line can be read. The note does not pause anything; it uses a pause.
 *
 * **Style.** Corner brackets rather than a panel, because a full box reads as a
 * dialog — something to dismiss — where brackets read as a reticle, something
 * being pointed at. The text resolves out of noise like every other value in the
 * story, and the rule underneath runs down so a fast reader knows the scene is
 * coming back rather than waiting on them.
 */

const CORNER = 'pointer-events-none absolute h-4 w-4 border-ui-text-heading/40';

function Brackets() {
  return (
    <>
      <span className={`${CORNER} -left-5 -top-5 border-l border-t`} />
      <span className={`${CORNER} -right-5 -top-5 border-r border-t`} />
      <span className={`${CORNER} -bottom-5 -left-5 border-b border-l`} />
      <span className={`${CORNER} -bottom-5 -right-5 border-b border-r`} />
    </>
  );
}

export function SceneNote({ progress, text, presenceFor, remainingFor }) {
  const presence = useTransform(progress, presenceFor);
  const remaining = useTransform(progress, remainingFor);
  // Rising slightly as it arrives, so it reads as coming forward rather than
  // switching on.
  const lift = useTransform(presence, latest => (1 - latest) * 10);
  const resolved = useScramble({ text, durationMs: 500 });

  return (
    <motion.div
      data-testid="scene-note"
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-14"
      style={{ opacity: presence }}
      aria-live="polite"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundColor: `${theme.colors.ui.background}c4`,
          backdropFilter: 'blur(2.5px)',
        }}
      />

      <motion.div className="relative max-w-2xl" style={{ y: lift }}>
        <Brackets />
        <p className="text-center font-mono text-xl leading-relaxed text-ui-text-primary">
          {resolved}
        </p>
        <motion.div
          aria-hidden="true"
          className="mx-auto mt-6 h-px w-24 origin-center"
          style={{
            scaleX: remaining,
            backgroundColor: `${theme.colors.ui.text.heading}66`,
          }}
        />
      </motion.div>
    </motion.div>
  );
}

export default SceneNote;
