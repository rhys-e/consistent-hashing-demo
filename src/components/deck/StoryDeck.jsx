import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useMachine } from '@xstate/react';
import {
  acceptsNudge,
  deckMachine,
  isClosing,
  isCountingDown,
  isSettled as settledIn,
  isSteering,
} from '../../story/deckMachine';
import { hashFor, indexForHash, titleFor } from '../../story/slideUrl';
import DeckCountdown, { COUNTDOWN_SECONDS, ScrollHint } from './DeckCountdown';
import NarrationSlide from './NarrationSlide';

/**
 * Vertical slides. The story advances itself until the viewer takes over.
 * Animates between whole slides; `prefers-reduced-motion` shortens the travel.
 */

const SLIDE_TRANSITION = { duration: 1.05, ease: [0.65, 0, 0.35, 1] };
const REDUCED_SLIDE_TRANSITION = { duration: 0.25, ease: 'linear' };
/**
 * How long the ticks stay up after the mouse stops moving.
 *
 * Hiding them until the viewer takes over kept the composition clean and made the
 * one control that says "you can go somewhere else" impossible to find without
 * already knowing it was there. Moving the mouse now brings them back for a few
 * seconds, which is the affordance every video player uses for the same reason.
 *
 * Long enough to notice them and reach them, short enough that a still cursor
 * leaves the story alone. It does *not* count as taking over: a mouse crossing the
 * screen is not a decision, and the deck goes on advancing.
 */
const POINTER_IDLE_MS = 2600;
const SWIPE_THRESHOLD = 40;
/**
 * A tick, undoing what `index.css` does to every `button` on the way.
 *
 * That base rule is v1's chrome and it is loud: `px-4 py-2`, a lift and a dip to
 * 90% on hover, and a `::before` carrying a white gradient that sweeps across the
 * element. On a bordered control it reads as a button. On a 1px hairline it is
 * three animations nobody asked for, and it is most of what makes this hover feel
 * like too much.
 *
 * The padding did something worse than decorate. A 40px border-box with 16px each
 * side leaves 8px of content, so every width below clamped to 8px and the ticks
 * have all been the same length whatever they asked for — including the current
 * one, which is supposed to be the long one. Removing the padding is what makes
 * the design work rather than a change to it.
 */
const TICK_BUTTON =
  'group flex h-5 w-10 items-center justify-end p-0 ' +
  'before:hidden hover:translate-y-0 hover:opacity-100 active:translate-y-0';
/** Prefixes every history entry, so a back button offers legible choices. */
const SITE_TITLE = 'Consistent Hashing';

/**
 * Slide ticks. Hidden until the viewer takes over, but stay in the document so
 * focus can reveal them. Do not use `display: none` or `aria-hidden`.
 *
 * The pointer being *on* them counts as much as the pointer moving. Without it the
 * idle timer runs while the viewer is holding still to aim, and the ticks fade out
 * from under the cursor at the moment they are being used — the one moment they
 * are certainly wanted. Hover holds them up for as long as the pointer is there.
 *
 * They are also unclickable while faded out. A fully transparent nav that still
 * takes clicks is a strip down the side of the story where a click does something
 * invisible, and a stray one would jump the deck to a slide the viewer never saw.
 */
function DeckProgress({ slides, index, onSelect, shown }) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const visible = shown || focused || hovered;

  return (
    <motion.nav
      aria-label="Story slides"
      className={`fixed right-7 top-1/2 z-20 flex -translate-y-1/2 flex-col ${
        visible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4 }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      onPointerEnter={event => {
        if (event.pointerType === 'touch') return;
        setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      data-shown={visible ? 'true' : 'false'}
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
            className={TICK_BUTTON}
          >
            {/* Two states, not three: where you are, and everywhere else. Hover is
                an acknowledgement, not a fourth thing to look at, so brightness
                carries it and the length moves by four pixels.
                It stays the secondary colour. White is what says "you are here",
                and `bright` and `heading` are the same white, so a hovered tick
                painted in it would read as having already moved there. The current
                tick does not react at all: it is the one mark whose meaning does
                not depend on where the pointer is. */}
            <span
              className={`h-px transition-all duration-fast ${
                isCurrent
                  ? 'w-6 bg-ui-text-heading/80'
                  : 'w-3 bg-ui-text-secondary/35 group-hover:w-4 group-hover:bg-ui-text-secondary/75'
              }`}
            />
          </button>
        );
      })}
    </motion.nav>
  );
}

/**
 * Slide travel in layout pixels (`clientHeight`). `getBoundingClientRect` is the
 * visual box and undershoots when an ancestor is scaled. Untested: jsdom has no layout.
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

/**
 * Address bar, opt-in. Viewer moves push; automatic ones replace, so a playing
 * story does not fill history.
 */
function useSlideAddress({ slides, index, viaViewer, enabled, onNavigate }) {
  useEffect(() => {
    if (!enabled) return undefined;

    const handle = () => {
      const target = indexForHash(slides, window.location.hash);
      if (target !== null) onNavigate(target);
    };

    window.addEventListener('popstate', handle);
    return () => window.removeEventListener('popstate', handle);
  }, [enabled, onNavigate, slides]);

  useEffect(() => {
    if (!enabled) return;

    const slide = slides[index];
    const hash = hashFor(slide);
    document.title = titleFor(slide, SITE_TITLE);

    if (window.location.hash === hash) return;
    // `pushState` rather than assigning `location.hash`, which would fire a
    // `popstate` and send the deck an instruction it had just carried out.
    const write = viaViewer ? 'pushState' : 'replaceState';
    window.history[write](null, '', `${window.location.pathname}${window.location.search}${hash}`);
  }, [enabled, index, slides, viaViewer]);
}

/** Read once, before the machine starts, so a deep link opens where it points. */
export function openingIndex(slides, fallback = 0) {
  if (typeof window === 'undefined') return fallback;
  return indexForHash(slides, window.location.hash) ?? fallback;
}

export function StoryDeck({ slides, initialIndex = 0, urlSync = false }) {
  const [state, send] = useMachine(deckMachine, {
    input: {
      initialIndex,
      slideCount: slides.length,
      countdownMs: COUNTDOWN_SECONDS * 1000,
    },
  });
  const { index, engaged: isEngaged } = state.context;
  const isSettled = settledIn(state);

  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const slideHeight = useSlideHeight(containerRef);

  const isLast = index === slides.length - 1;

  const goTo = useCallback(next => send({ type: 'GOTO', index: next }), [send]);
  const engage = useCallback(() => send({ type: 'ENGAGE' }), [send]);

  /**
   * Whether a mouse has moved lately.
   *
   * Mouse only. A touch drag already moves the deck, which makes the viewer a
   * steerer and shows the ticks for good, and firing this on every touch point
   * would flash them on and off through a swipe.
   */
  const [pointerAwake, setPointerAwake] = useState(false);

  useEffect(() => {
    let timer = null;

    const handle = event => {
      if (event.pointerType && event.pointerType !== 'mouse') return;

      setPointerAwake(true);
      clearTimeout(timer);
      timer = setTimeout(() => setPointerAwake(false), POINTER_IDLE_MS);
    };

    window.addEventListener('pointermove', handle);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', handle);
    };
  }, []);

  useSlideAddress({
    slides,
    index,
    viaViewer: state.context.viaViewer,
    enabled: urlSync,
    onNavigate: goTo,
  });

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
      {/* Nothing until the deck has been measured.
          The stack is positioned by `y = -index * height`, so mounting before the
          height is known puts it at zero and then *animates* to where it should
          have been. On the opening slide that is invisible, because zero is the
          answer. On a link into the middle of the story it is a second of the deck
          scrolling past a viewer who asked to be somewhere in particular. */}
      {slideHeight ? (
        <motion.div
          onPointerDown={engage}
          className="h-full w-full will-change-transform"
          // Start where the first slide actually is, rather than animating to it.
          // Without this the stack mounts at zero and travels to its position, so
          // a link into the middle of the story plays the deck scrolling past on
          // the way to the slide somebody asked for.
          initial={false}
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
                  slide.render({ active, current: isCurrent, engaged: isEngaged, onComplete })
                ) : (
                  <NarrationSlide
                    title={slide.title}
                    lead={slide.lead}
                    current={isCurrent}
                    // The last moment of the slide, not the whole countdown: two
                    // things changing at once splits the viewer between them.
                    imminent={isCurrent && isClosing(state)}
                    body={slide.body}
                    active={active}
                    onComplete={onComplete}
                  />
                )}
              </section>
            );
          })}
        </motion.div>
      ) : null}

      {showCountdown ? (
        <DeckCountdown
          key={slides[index].key}
          seconds={COUNTDOWN_SECONDS}
          onElapsed={() => send({ type: 'COUNTDOWN_DONE' })}
        />
      ) : null}
      {isEngaged && !isLast ? <ScrollHint /> : null}

      <DeckProgress
        slides={slides}
        index={index}
        onSelect={goTo}
        shown={isSteering(state) || pointerAwake}
      />
    </div>
  );
}

export default StoryDeck;
