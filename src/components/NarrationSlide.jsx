import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useScramble } from '../story/useScramble';

/**
 * A chapter heading, given its own slide.
 *
 * Prose and animation both want the viewer's whole attention, so each gets a
 * slide of its own: the macro argument is read without a moving picture beside
 * it, and the scene that follows is then watched with only the few words it still
 * needs.
 *
 * The restraint that matters here is that a slide of text has no *information*
 * to animate, so anything moving on it is decoration and can only be justified by
 * tone. It gets three things and stops: the title resolves out of noise, the
 * paragraphs arrive in order, and a rule draws itself across the top. All of them
 * are over inside a second, and none of them repeats — a caption that keeps
 * moving is a caption competing with the sentence it is displaying.
 */

const RESOLVE = { duration: 0.5, ease: [0.16, 1, 0.3, 1] };
/**
 * Roughly a skim rather than a careful read: the slide is offering to move on,
 * not insisting, and anyone who wants longer takes control and it stops asking.
 */
const READ_LEAD_MS = 800;
const READ_PER_WORD_MS = 130;

function Body({ paragraph, index, active }) {
  return (
    <motion.p
      className="max-w-3xl text-xl leading-relaxed text-ui-text-primary"
      initial={{ opacity: 0, y: 12 }}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ ...RESOLVE, delay: active ? 0.45 + index * 0.14 : 0 }}
    >
      {paragraph}
    </motion.p>
  );
}

export function NarrationSlide({ number, label, title, body = [], active = true, onComplete }) {
  const resolvedTitle = useScramble({ text: title, active });

  const words = [title, ...body].join(' ').split(/\s+/).length;

  useEffect(() => {
    if (!active || !onComplete) return undefined;

    const timer = setTimeout(onComplete, READ_LEAD_MS + words * READ_PER_WORD_MS);
    return () => clearTimeout(timer);
  }, [active, onComplete, words]);

  return (
    <div className="relative flex h-full w-full flex-col justify-center overflow-hidden bg-body-bg px-14 py-11 font-mono">
      {/* A wash of the same grid the scenes draw on, so the narration sits on the
          same surface rather than on a blank page between them. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(255 255 255 / 3%) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 3%) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 72%)',
        }}
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-9">
        <div className="flex items-center gap-6 text-xs uppercase tracking-[0.5em] text-ui-text-secondary">
          <span>{number}</span>
          <motion.span
            className="bg-cyber-border h-px flex-1 origin-left"
            initial={{ scaleX: 0 }}
            animate={active ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
          <span>{label}</span>
        </div>

        {/* The finished title, invisible, holds the box open; the resolving one
            is laid over it. The heading face is proportional, so a block glyph is
            not the width of the letter it stands in for — left to itself the
            title rewraps as it resolves and shoves the paragraphs down the page. */}
        <div className="relative">
          <h2
            aria-hidden="true"
            className="invisible font-orbitron text-5xl font-normal uppercase leading-tight tracking-[0.16em]"
          >
            {title}
          </h2>
          <h2 className="absolute inset-0 font-orbitron text-5xl font-normal uppercase leading-tight tracking-[0.16em] text-ui-text-heading">
            {resolvedTitle}
          </h2>
        </div>

        {body.map((paragraph, index) => (
          <Body key={paragraph} paragraph={paragraph} index={index} active={active} />
        ))}
      </div>
    </div>
  );
}

export default NarrationSlide;
