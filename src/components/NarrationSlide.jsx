import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import theme from '../themes';
import { useScramble } from '../story/useScramble';

/**
 * A chapter heading, given its own slide.
 *
 * One component for every slide of prose, in two sizes. The opening slide names
 * the subject and is set larger and centred; the rest are the same slide left
 * aligned. Keeping them one component is what stops the column width, the type
 * scale and the timing drifting apart between chapters.
 *
 * There is no part number or section label above the title any more. The label
 * said what the title said — `Spread` over `Give each server many positions` —
 * the ticks down the edge of the deck already show how far through the story a
 * viewer is, and the numbering had been rewritten twice as scenes were inserted,
 * which is a fair sign it was tracking a structure the story never committed to.
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
 * The title fades up as it resolves, rather than being on screen while it waits.
 *
 * A slide that arrives carrying a frozen row of block glyphs looks broken, not
 * loading — noise only reads as something resolving while it is actually moving.
 * So nothing is there until the slide has landed, and then one thing happens: the
 * title arrives out of nothing and settles into itself.
 */
const TITLE_IN = { duration: 0.3, ease: 'linear' };
/**
 * The paragraphs start before the title has finished, on purpose.
 *
 * Waiting for it costs half a second on top of a transition that is already a
 * second long, and buys a beat of an empty slide nobody asked for. Overlapping
 * them means the block is complete about three quarters of a second after the
 * slide lands, and the title is still the first thing to appear and the first to
 * settle — which is all the order has to establish.
 */
const BODY_DELAY = 0.3;
const BODY_STAGGER = 0.12;

/**
 * The title breaks up for a third of a second when the deck starts counting down.
 *
 * Sliced rather than shaken: the title tears along two horizontal lines and the
 * halves separate into red and blue for a few frames. A whole word wobbling reads
 * as an error, where bands tearing along straight lines read as a signal — which
 * is what this is. It fires when the countdown bar appears, so the two say the
 * same thing in two registers, and neither fires once a viewer has taken over,
 * because then nothing is about to happen.
 *
 * The bands themselves are in `index.css`: they are pseudo-elements reading
 * `data-text`, which keeps one copy of the title in the document.
 */

/**
 * Roughly a skim rather than a careful read: the slide is offering to move on,
 * not insisting, and anyone who wants longer takes control and it stops asking.
 */
const READ_LEAD_MS = 800;
const READ_PER_WORD_MS = 130;

function Body({ paragraph, index, active, arriving }) {
  return (
    <motion.p
      /**
       * Deliberately *not* balanced. `text-wrap: balance` shortens lines to even
       * them up, so each paragraph settles at whatever width suits it and the
       * right edge of the column moves from one paragraph to the next. A fixed
       * measure with every paragraph long enough to fill it is what makes the
       * block read as one column.
       */
      className="text-xl leading-relaxed text-ui-text-primary"
      // The decision, not the frame the animation happens to be on. Motion writes
      // opacity from a ticker, so in a test there is nothing to read but this.
      data-shown={active || !arriving ? 'true' : 'false'}
      initial={{ opacity: 0, y: 12 }}
      /**
       * Hidden only on the way in. A slide being carried *out* keeps what it had —
       * clearing it as it leaves plays the arrival backwards on a slide the viewer
       * has finished with, which is a second thing moving during a movement that
       * was already saying everything.
       */
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
  /**
   * Whether this is the slide being travelled to, which is not the same question
   * as whether it has arrived.
   *
   * A slide is inactive for the whole of the deck's transition, at either end of
   * it, and until the transition was slowed down the two were indistinguishable.
   * They are opposites: one is a slide with nothing on it yet, the other a slide
   * with everything on it still.
   *
   * Defaults to `active`, so a slide rendered on its own is never "arriving" and
   * behaves exactly as it did.
   */
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
  /**
   * Smaller than it wants to be, because of the scramble.
   *
   * The heading face is proportional, so a block glyph is not the width of the
   * letter it stands in for. The invisible copy holds the box open, but the
   * resolving copy can still wrap inside it where the finished title does not —
   * a title set to the edge of its column visibly reflows as it settles. Titles
   * are kept to four words and the type a size down, which leaves room for the
   * widest glyph run to be wrong about its width and still fit on one line.
   */
  const heading = `font-orbitron ${lead ? 'text-5xl' : 'text-4xl'} font-normal uppercase leading-tight tracking-[0.16em]`;

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

      {/* Left aligned on every slide, including the first.
          A centred opening and left-aligned chapters are two typographic systems
          in one deck, and the reader notices the switch rather than the emphasis.
          `lead` now changes one thing: the size of the title. */}
      {/* One width for the whole block.
          The container used to be `max-w-5xl` with the paragraphs at `max-w-3xl`
          inside it, so the text sat left of a wider centred box and the slide read
          as off-centre. Titles are short enough to live in the narrower measure. */}
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-9">
        {/* The finished title, invisible, holds the box open; the resolving one
            is laid over it. The heading face is proportional, so a block glyph is
            not the width of the letter it stands in for — left to itself the
            title rewraps as it resolves and shoves the paragraphs down the page. */}
        <div className="relative">
          <h2 aria-hidden="true" className={`invisible ${heading}`}>
            {title}
          </h2>
          <motion.h2
            className={`glitch-title absolute inset-0 ${heading} text-ui-text-heading`}
            data-text={resolvedTitle}
            data-glitching={imminent ? 'true' : 'false'}
            data-shown={arriving ? 'false' : 'true'}
            // No `initial`: a slide being carried out is already showing its title
            // and must not fade it up again on the way past.
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

        {/* The paragraphs are a block of their own, closer to each other than to
            the title. Short sentences read as a list rather than as prose when
            every gap on the slide is the same size. */}
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
