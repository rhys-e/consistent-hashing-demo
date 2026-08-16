import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import theme from '../themes';
import { useScramble } from '../story/useScramble';

/**
 * A chapter heading on its own slide. `lead` only changes title size.
 */

const RESOLVE = { duration: 0.5, ease: [0.16, 1, 0.3, 1] };
const TITLE_IN = { duration: 0.3, ease: 'linear' };
const BODY_DELAY = 0.3;
const BODY_STAGGER = 0.12;
const READ_LEAD_MS = 800;
const READ_PER_WORD_MS = 130;

function Body({ paragraph, index, active, arriving }) {
  return (
    <motion.p
      className="text-xl leading-relaxed text-ui-text-primary"
      data-shown={active || !arriving ? 'true' : 'false'}
      initial={{ opacity: 0, y: 12 }}
      animate={active || !arriving ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ ...RESOLVE, delay: active ? BODY_DELAY + index * BODY_STAGGER : 0 }}
    >
      {paragraph}
    </motion.p>
  );
}

export function NarrationSlide({
  title,
  body = [],
  lead = false,
  active = true,
  /** The slide being travelled to. Defaults to `active` so a solo render is never "arriving". */
  current,
  imminent = false,
  onComplete,
}) {
  const arriving = (current ?? active) && !active;
  const resolvedTitle = useScramble({
    text: title,
    active,
    idle: arriving ? 'noise' : 'resolved',
  });
  const heading = `font-orbitron ${lead ? 'text-5xl' : 'text-4xl'} font-normal uppercase leading-tight tracking-[0.16em]`;

  const words = [title, ...body].join(' ').split(/\s+/).length;

  useEffect(() => {
    if (!active || !onComplete) return undefined;

    const timer = setTimeout(onComplete, READ_LEAD_MS + words * READ_PER_WORD_MS);
    return () => clearTimeout(timer);
  }, [active, onComplete, words]);

  return (
    <div className="relative flex h-full w-full flex-col justify-center overflow-hidden bg-body-bg px-14 py-11 font-mono">
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

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-9">
        <div className="relative">
          <h2 aria-hidden="true" className={`invisible ${heading}`}>
            {title}
          </h2>
          <motion.h2
            className={`glitch-title absolute inset-0 ${heading} text-ui-text-heading`}
            data-text={resolvedTitle}
            data-glitching={imminent ? 'true' : 'false'}
            data-shown={arriving ? 'false' : 'true'}
            initial={false}
            animate={{ opacity: arriving ? 0 : 1 }}
            transition={arriving ? { duration: 0 } : TITLE_IN}
            style={{
              '--glitch-a': theme.colors.primary.cyberBlue,
              '--glitch-b': theme.colors.primary.neoRed,
            }}
          >
            {resolvedTitle}
          </motion.h2>
        </div>

        <div className="flex flex-col gap-5">
          {body.map((paragraph, index) => (
            <Body
              key={paragraph}
              paragraph={paragraph}
              index={index}
              active={active}
              arriving={arriving}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default NarrationSlide;
