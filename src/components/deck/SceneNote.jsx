import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../../themes';
import { useScramble } from '../../story/useScramble';

/**
 * A line over a paused scene: artwork dims, the note comes forward, then the
 * scene resumes. Uses a rest that already exists; it does not pause anything.
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
