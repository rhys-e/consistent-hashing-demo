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
import SmallScreenNotice, { useViewportFits } from './SmallScreenNotice';

/** Self-advancing vertical slides that yield control after viewer interaction. */

const SLIDE_TRANSITION = { duration: 1.05, ease: [0.65, 0, 0.35, 1] };
const REDUCED_SLIDE_TRANSITION = { duration: 0.25, ease: 'linear' };
/** Keep navigation visible briefly after mouse movement without taking control. */
const POINTER_IDLE_MS = 2600;
const SWIPE_THRESHOLD = 40;
/** Neutralise global button chrome so tick widths and hover styles remain local. */
const TICK_BUTTON =
  'group flex h-5 w-10 items-center justify-end p-0 ' +
  'before:hidden hover:translate-y-0 hover:opacity-100 active:translate-y-0';
/** Prefixes every history entry, so a back button offers legible choices. */
const SITE_TITLE = 'Consistent Hashing';

/**
 * Keep hidden ticks focusable, reveal them on focus or hover, and disable pointer
 * events while they are transparent.
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
            {/* White marks the current slide; hover only strengthens secondary ticks. */}
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

/** Measure slide travel in layout pixels; visual bounds shrink under ancestor scaling. */
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

/** Viewer navigation pushes history; automatic navigation replaces the current entry. */
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

  /** Touch gestures already engage the deck, so only mouse movement wakes the ticks. */
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
        // Scene-specific keys still count as taking control.
        engage();
      }
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [engage, goTo, index, slides.length]);

  /** Accept one wheel event per settled slide; the machine absorbs momentum events. */
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

  /** Small-screen dismissal lasts only for the current page session. */
  const fits = useViewportFits();
  const [ignoredSize, setIgnoredSize] = useState(false);

  const showCountdown = isCountingDown(state);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-body-bg">
      {/* Wait for height so deep links mount at their final offset. */}
      {slideHeight ? (
        <motion.div
          onPointerDown={engage}
          className="h-full w-full will-change-transform"
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
              // Override global section margins and contain each slide's content.
              <section
                key={slide.key}
                className="my-0 h-full w-full overflow-hidden"
                aria-hidden={!isCurrent}
              >
                {slide.kind === 'scene' ? (
                  // Scenes play only when settled and reset while off-screen.
                  slide.render({ active, current: isCurrent, engaged: isEngaged, onComplete })
                ) : (
                  <NarrationSlide
                    title={slide.title}
                    lead={slide.lead}
                    current={isCurrent}
                    // Signal only the final countdown state.
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

      {/* Render last so the notice overlays the deck. */}
      {!fits && !ignoredSize ? <SmallScreenNotice onDismiss={() => setIgnoredSize(true)} /> : null}
    </div>
  );
}

export default StoryDeck;
