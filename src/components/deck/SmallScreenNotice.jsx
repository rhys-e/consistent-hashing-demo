import React, { useEffect, useState } from 'react';
import { STAGE } from '../../story/stage';

/**
 * What the frame takes before the stage gets any: `SceneFrame` is `px-14 py-9`
 * with a footer of `h-11` and an inner `py-4`.
 */
const CHROME = { width: 112, height: 148 };
const LEGIBLE = 0.8;

export const MIN_WIDTH = Math.round(STAGE.width * LEGIBLE + CHROME.width);
export const MIN_HEIGHT = Math.round(STAGE.height * LEGIBLE + CHROME.height);

/**
 * Both dimensions, because the stage scales to `meet` and the smaller one wins. A
 * phone turned sideways is wide enough and nothing like tall enough.
 */
export function fitsStage(width, height) {
  return width >= MIN_WIDTH && height >= MIN_HEIGHT;
}

/** Re-measured on resize, so turning a tablet answers for itself. */
export function useViewportFits() {
  const [fits, setFits] = useState(() =>
    typeof window === 'undefined' ? true : fitsStage(window.innerWidth, window.innerHeight)
  );

  useEffect(() => {
    const measure = () => setFits(fitsStage(window.innerWidth, window.innerHeight));

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  return fits;
}

const DISMISS =
  'rounded-sm border px-3 py-1 font-mono text-[12px] uppercase tracking-[0.18em] ' +
  'border-ui-border text-ui-text-secondary transition-colors ' +
  'hover:border-ui-text-bright hover:text-ui-text-bright';

export function SmallScreenNotice({ onDismiss }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="small-screen-title"
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-body-bg px-8 text-center font-mono"
    >
      <h1
        id="small-screen-title"
        className="text-lg uppercase tracking-[0.3em] text-ui-text-heading"
      >
        Made for a bigger screen
      </h1>

      <div className="max-w-md space-y-4 text-sm leading-relaxed text-ui-text-secondary">
        {/* Not "a phone": this also speaks up on a tablet held upright, and on a
            desktop window dragged small. It says what is true of all three. */}
        <p>
          This story draws a ring and the servers that own it side by side. A screen this size
          cannot show both at a size you can read.
        </p>
        <p>Open this page on a laptop or a desktop.</p>
      </div>

      <button type="button" onClick={onDismiss} className={DISMISS}>
        Show it anyway
      </button>
    </div>
  );
}

export default SmallScreenNotice;
