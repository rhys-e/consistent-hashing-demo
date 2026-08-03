import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useMachine } from '@xstate/react';
import {
  acceptsNudge,
  deckMachine,
  isCountingDown,
  isSettled as settledIn,
} from '../../story/deckMachine';
import DeckCountdown, { COUNTDOWN_SECONDS, ScrollHint } from './DeckCountdown';
import NarrationSlide from './NarrationSlide';

/**
 * The story as vertical slides, alternating narration and scene.
 *
 * The problem this solves is not layout, it is pressure. Holding one continuous
 * visual thread across every scene means each scene's composition is dictated by
 * whatever the previous one ended on — the full-scale scene needs the ring
 * off-centre to make room for its share panel, the opening leaves it centred, and
 * there is no honest animation between those two facts. A slide of narration
 * between them absorbs the discontinuity, and costs nothing, because a cut after a
 * full stop is not a cut.
 *
 * **This is a tool for chapter breaks, not a uniform pattern.** Where a seamless
 * transition is possible it is always better, which is why the number line and the
 * ring it bends into are one scene on one slide rather than two.
 *
 * ## Hands off until you take over
 *
 * The default is that the story runs itself: each slide plays, a thin bar counts
 * down the last few seconds, and the deck moves on. Nothing is on screen but the
 * story. Touch anything — a click, or a scene's own keys — and the deck stops
 * advancing for good, shows the scene transport, and waits. Watching and studying
 * are different activities, and the interface for the second is clutter during the
 * first.
 *
 * ## Why this drives itself rather than scrolling
 *
 * A viewer is on one slide or the next, never suspended between them, so the deck
 * animates between whole slides instead of snapping a free scroll. That is a
 * deliberate trade: scroll snapping gets keyboard, trackpad and assistive
 * technology for free, and taking the transition over means owing all of it back.
 * Arrow and page keys, Home and End, touch, and progress ticks that are real
 * buttons are that debt being paid; `prefers-reduced-motion` cuts instead of
 * sliding.
 */

/**
 * Long and symmetric, so a slide change reads as being carried down a page rather
 * than cut to. An ease-out alone starts at full speed, which lands as a jump no
 * matter how long it runs.
 */
const SLIDE_TRANSITION = { duration: 1.05, ease: [0.65, 0, 0.35, 1] };
/**
 * Reduced motion asks for less movement, not for none. Cutting instantly between
 * slides is the harshest possible transition, and it was what this did — the
 * setting turned a considered movement into a jump.
 */
const REDUCED_SLIDE_TRANSITION = { duration: 0.25, ease: 'linear' };
const SWIPE_THRESHOLD = 40;

/**
 * Ticks down the right-hand edge: how many slides there are, which one this is,
 * and a way to reach any of them.
 *
 * Hairlines rather than pills. The deck is the thing being looked at, and a
 * column of filled dots down the edge of a dark composition reads as part of it.
 * The generous hit area is padding, so the mark stays thin without being fiddly.
 */
function DeckProgress({ slides, index, onSelect }) {
  return (
    <nav
      aria-label="Story slides"
      className="fixed right-7 top-1/2 z-20 flex -translate-y-1/2 flex-col"
    >
      {slides.map((slide, slideIndex) => {
        const isCurrent = slideIndex === index;

        return (
          <button
            key={slide.key}
            type="button"
            onClick={() => onSelect(slideIndex)}
            aria-current={isCurrent ? 'true' : undefined}
            aria-label={slide.title ?? slide.key}
            className="group flex h-4 w-10 items-center justify-end"
          >
            <span
              className={`h-px transition-all duration-normal ${
                isCurrent
                  ? 'w-7 bg-ui-text-heading/80'
                  : 'w-3 bg-ui-text-secondary/35 group-hover:w-5 group-hover:bg-ui-text-secondary/70'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Slide travel is measured in *layout* pixels.
 *
 * This took three attempts, and the third one is the point. A percentage resolves
 * against the moving element's own box, which is only the slide height if every
 * slide is exactly as tall as the deck — so that went. `getBoundingClientRect()`
 * replaced it, and was still wrong, for a reason that is easy to miss: it reports
 * the *visual* box, after any transform on an ancestor. Storybook's preview can be
 * scaled, and a scaled measurement is smaller than the height the browser actually
 * laid the slides out at, so every slide undershoots by the same fraction — and a
 * constant error per slide accumulates into a deck that sits visibly too low by
 * the time you are a few slides in.
 *
 * `clientHeight` is the layout box, which is the space the transform is expressed
 * in, so the two agree. Observed as well as measured, so a resize keeps it true.
 *
 * Not covered by a test, deliberately: jsdom has no layout, so `clientHeight` is
 * always zero there and only the fallback would ever run. A test that cannot
 * observe the property it guards is worse than none, because it reads as coverage.
 */
function useSlideHeight(ref) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const measure = () => setHeight(element.clientHeight || window.innerHeight);
    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return height;
}

export function StoryDeck({ slides, initialIndex = 0 }) {
  const [state, send] = useMachine(deckMachine, {
    input: { initialIndex, slideCount: slides.length },
  });
  const { index, engaged: isEngaged } = state.context;
  const isSettled = settledIn(state);

  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const slideHeight = useSlideHeight(containerRef);

  const isLast = index === slides.length - 1;

  const goTo = useCallback(next => send({ type: 'GOTO', index: next }), [send]);
  const engage = useCallback(() => send({ type: 'ENGAGE' }), [send]);

  useEffect(() => {
    const handle = event => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable]')
      ) {
        return;
      }

      const move = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[event.key];

      if (move) {
        event.preventDefault();
        goTo(index + move);
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goTo(slides.length - 1);
      } else if (['ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(event.key)) {
        // A scene's own keys: using them is taking control of the scene.
        engage();
      }
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [engage, goTo, index, slides.length]);

  /**
   * Any wheel gesture moves exactly one slide.
   *
   * Thresholding the travel meant a gentle scroll did nothing at all while a firm
   * one sometimes counted twice — unresponsive and unpredictable in the same
   * breath. Acting on the first event of a gesture and then refusing everything
   * until the slide has settled makes one flick mean one slide at any strength,
   * and the cooldown after settling is what swallows a trackpad's momentum tail.
   */
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const handle = event => {
      event.preventDefault();
      if (!acceptsNudge(state) || Math.abs(event.deltaY) < 1) return;

      send({ type: event.deltaY > 0 ? 'NEXT' : 'PREV' });
    };

    element.addEventListener('wheel', handle, { passive: false });
    return () => element.removeEventListener('wheel', handle);
  }, [send, state]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    let startY = null;

    const start = event => {
      startY = event.touches[0]?.clientY ?? null;
    };
    const end = event => {
      if (startY === null || !acceptsNudge(state)) return;
      const travel = startY - (event.changedTouches[0]?.clientY ?? startY);
      if (Math.abs(travel) > SWIPE_THRESHOLD) send({ type: travel > 0 ? 'NEXT' : 'PREV' });
      startY = null;
    };

    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchend', end, { passive: true });
    return () => {
      element.removeEventListener('touchstart', start);
      element.removeEventListener('touchend', end);
    };
  }, [send, state]);

  const showCountdown = isCountingDown(state);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-body-bg">
      <motion.div
        onPointerDown={engage}
        className="h-full w-full will-change-transform"
        animate={{ y: -index * slideHeight }}
        transition={reduceMotion ? REDUCED_SLIDE_TRANSITION : SLIDE_TRANSITION}
        onAnimationComplete={() => send({ type: 'ARRIVE' })}
      >
        {slides.map((slide, slideIndex) => {
          const isCurrent = slideIndex === index;
          const active = isSettled && isCurrent;
          const onComplete = isCurrent ? () => send({ type: 'SCENE_COMPLETE' }) : undefined;

          return (
            // `my-0` is load-bearing: a base style in `index.css` gives every
            // `section` a 1.5rem vertical margin, which added 3rem to each slide
            // and pushed the whole deck progressively further down. `overflow-hidden`
            // keeps a slide's content inside its own slide, so a scene that
            // overruns cannot appear under the top of the next one.
            <section
              key={slide.key}
              className="my-0 h-full w-full overflow-hidden"
              aria-hidden={!isCurrent}
            >
              {slide.kind === 'scene' ? (
                // A scene plays once its slide has arrived and settled, and resets
                // when it leaves, so coming back to one finds it at its beginning
                // rather than part-way through the transition that brought it in.
                slide.render({ active, engaged: isEngaged, onComplete })
              ) : (
                <NarrationSlide
                  number={slide.number}
                  label={slide.label}
                  title={slide.title}
                  body={slide.body}
                  active={active}
                  onComplete={onComplete}
                />
              )}
            </section>
          );
        })}
      </motion.div>

      {showCountdown ? (
        <DeckCountdown
          key={slides[index].key}
          seconds={COUNTDOWN_SECONDS}
          onElapsed={() => send({ type: 'COUNTDOWN_DONE' })}
        />
      ) : null}
      {isEngaged && !isLast ? <ScrollHint /> : null}

      <DeckProgress slides={slides} index={index} onSelect={goTo} />
    </div>
  );
}

export default StoryDeck;
