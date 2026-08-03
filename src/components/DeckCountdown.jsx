import React from 'react';
import { motion } from 'motion/react';
import theme from '../themes';

/**
 * The last few seconds of a slide, drawn.
 *
 * A page that moves on its own without warning has taken something from the
 * viewer. The bar is the whole of the warning: it says something is about to
 * happen and roughly when, which is what makes taking over feel offered rather
 * than required.
 *
 * It runs along the very bottom of the viewport because that is the one edge
 * nothing else in the story uses, and it has to be legible without becoming a
 * second thing to watch. Two pixels with a soft bloom reads at a glance and
 * disappears when you are not looking for it; a hairline at low opacity, which is
 * what this was first, is simply invisible.
 *
 * ## Two reasons it was invisible, both worth remembering
 *
 * **Colour comes from the theme, not from utility classes.** `bg-<colour>/70` and
 * a `shadow-[...]` with commas in it both failed to appear in the compiled
 * stylesheet — one silently, the other because a comma inside an arbitrary value
 * stops the class scanner extracting it. An element whose whole job is to be seen
 * should not depend on a class surviving a build step; the SVG scenes already take
 * their colours from `themes` directly, and so does this.
 *
 * **It does not honour `prefers-reduced-motion`, deliberately.** It did, and that
 * was a bug rather than a courtesy: a zero duration meant the bar completed the
 * instant it mounted, so the deck advanced immediately and the warning the bar
 * exists to give never appeared at all. A countdown to something that will happen
 * on its own is information, and its duration *is* the information. A linear width
 * over several seconds is the gentlest motion available for saying so.
 */

export const COUNTDOWN_SECONDS = 6;

const BAR_HEIGHT = 2;
const heading = theme.colors.ui.text.heading;

export function DeckCountdown({ seconds = COUNTDOWN_SECONDS, onElapsed }) {
  return (
    <div
      data-testid="deck-countdown"
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20"
      style={{ height: BAR_HEIGHT, backgroundColor: `${heading}14` }}
    >
      <motion.div
        className="h-full origin-left"
        style={{ backgroundColor: `${heading}b3`, boxShadow: `0 0 10px ${heading}8c` }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: seconds, ease: 'linear' }}
        onAnimationComplete={onElapsed}
      />
    </div>
  );
}

/**
 * What replaces the countdown once a viewer has taken control: the deck has
 * stopped moving on its own, so it says how to move it.
 */
export function ScrollHint() {
  return (
    <motion.span
      data-testid="deck-scroll-hint"
      className="pointer-events-none fixed bottom-7 left-1/2 z-20 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.4em]"
      style={{ color: `${theme.colors.ui.text.secondary}99` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      Scroll ↓
    </motion.span>
  );
}

export default DeckCountdown;
