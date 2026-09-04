import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import theme from '../../themes';
import { useScramble } from '../../story/useScramble';

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
  /**
   * The lead slide carries the page's `h1`, and every other slide an `h2`.
   * A plain element, not a `motion` one: the heading no longer animates.
   *
   * All fourteen slides are in the document at once, so the deck's headings are
   * the page's heading outline whether or not it was written as one. It had
   * fourteen `h2`s and no `h1` at all, which is a document with no title and seven
   * equal chapters. `lead` already marks the one slide that opens the story.
   */
  const Heading = lead ? 'h1' : 'h2';

  const words = [title, ...body].join(' ').split(/\s+/).length;

  useEffect(() => {
    if (!active || !onComplete) return undefined;

    const timer = setTimeout(onComplete, READ_LEAD_MS + words * READ_PER_WORD_MS);
    return () => clearTimeout(timer);
  }, [active, onComplete, words]);

  return (
    <div className="relative flex h-full w-full flex-col justify-center overflow-hidden bg-body-bg px-14 py-11 font-mono">
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-9">
        {/*
          The words and the performance of them are two different elements.

          A title arrives one glyph at a time out of noise, which is a thing to
          watch and not a thing to read. When the heading itself carried the
          animation, the `h1` held `*C}/}}-▞*C }#]-` for the first second of the
          page — which is what a screen reader announced, and what any renderer
          that cannot wait for the animation would come away with.

          So the heading holds the finished title and is reached by reading rather
          than by looking, and the glyphs are a decoration that says the same thing
          a moment later. This is not text hidden from a viewer to be shown to a
          crawler: it is the same sentence, and the animation resolves to it. What
          it does mean is that anything reading the markup gets the title whole,
          without having to render, wait, or guess when to stop waiting.

          The geometry is untouched: an invisible span still holds the height open
          and the glyphs are still laid over it, because that pair is what sets the
          space this title occupies. Only the heading has moved, from the animated
          element to a silent one. The title is therefore in the markup three times
          — as the spacer, as the heading, and as whatever the animation has
          resolved so far — which is the cost of leaving the layout alone.
        */}
        {/*
          The space above and below the title, stated rather than inherited.

          It used to come from `index.css`, which gives every `h2` a `mt-5 mb-3` —
          twenty pixels and twelve — and the heading was picking those up on its way
          past. Once the heading became a silent `sr-only` element the margins went
          with it and the block closed up by thirty-two pixels. The same numbers are
          here now, on a wrapper that has a reason to hold them.
        */}
        <div className="pb-3 pt-5">
          <div className="relative">
            <span aria-hidden="true" className={`invisible block ${heading}`}>
              {title}
            </span>
            <Heading className="sr-only">{title}</Heading>
            <motion.span
              aria-hidden="true"
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
            </motion.span>
          </div>
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
