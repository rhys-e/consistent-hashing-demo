import React from 'react';
import { animate, useMotionValue } from 'motion/react';
import { STAGE } from '../story/stage';
import {
  buildSandbox,
  initialSandbox,
  POSITION_STEPS,
  SANDBOX_LIMITS,
  sandboxReducer,
} from '../story/sandbox';
import SceneFrame from './SceneFrame';
import SandboxRing from './SandboxRing';

/**
 * Scene 8: the story's claims, with the numbers unlocked.
 *
 * Everything before this is fixed — three servers, or six becoming seven, at
 * counts chosen to make a point. Here the counts are the viewer's, and the two
 * readouts are the two things the story spent nine slides establishing: how far
 * from even the split is, and how much of the ring moves when the topology
 * changes.
 *
 * It is the one scene not driven by a beat. A timeline is how you tell somebody
 * something; this is how they ask.
 */

/** Long enough to see ownership change hands, short enough to feel like a click. */
const SETTLE = { duration: 0.55, ease: [0.65, 0, 0.35, 1] };

/**
 * Split into a base and two states rather than an override appended to the base.
 *
 * Tailwind resolves two utilities for the same property by their order in the
 * *stylesheet*, not by their order in the attribute, so `border-ui-border` and
 * `border-ui-text-bright` on the same element is a coin toss — and the selected
 * position silently looked identical to the other five.
 */
const CONTROL =
  'rounded-sm border px-3 py-1 font-mono text-[12px] uppercase tracking-[0.18em] ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-30';
const IDLE =
  'border-ui-border text-ui-text-secondary hover:border-ui-text-bright hover:text-ui-text-bright';
const CHOSEN = 'border-ui-text-bright bg-ui-panel-bg text-ui-text-bright';

function Field({ label, children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-ui-text-secondary">
        {label}
      </span>
      {children}
    </div>
  );
}

export function SandboxScene({ active = true }) {
  const [state, dispatch] = React.useReducer(sandboxReducer, undefined, initialSandbox);
  const sandbox = React.useMemo(() => buildSandbox(state), [state]);

  /**
   * One value carries every transition. It is set to zero on each change and run
   * to one, which the bars read as "settle to the new number" and the two rings
   * read in opposite directions.
   */
  const settle = useMotionValue(1);
  React.useEffect(() => {
    if (!sandbox.previous) return undefined;
    settle.set(0);
    const controls = animate(settle, 1, SETTLE);
    return () => controls.stop();
  }, [sandbox, settle]);

  const { serverCount, vnodesPerServer } = state;

  return (
    <SceneFrame active={active}>
      <div className="flex h-full w-full flex-col">
        <svg
          viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`A hash ring shared between ${serverCount} servers at ${vnodesPerServer} positions each.`}
          className="min-h-0 w-full flex-1"
        >
          <SandboxRing sandbox={sandbox} settle={settle} />
        </svg>

        <div // Wide gaps between groups, and it wraps rather than tightening them.
          // Squeezed onto one line at narrow widths the groups run together and
          // "+" sits against "POSITIONS EACH", which is harder to read than a
          // button on a second row.
          className="flex shrink-0 flex-wrap items-center gap-x-10 gap-y-4 pt-2"
        >
          <Field label="Servers">
            <button
              type="button"
              className={`${CONTROL} ${IDLE}`}
              onClick={() => dispatch({ type: 'DROP_SERVER' })}
              disabled={serverCount <= SANDBOX_LIMITS.minServers}
              aria-label="Remove a server"
            >
              −
            </button>
            <span className="w-6 text-center font-mono text-[13px] text-ui-text-bright">
              {serverCount}
            </span>
            <button
              type="button"
              className={`${CONTROL} ${IDLE}`}
              onClick={() => dispatch({ type: 'ADD_SERVER' })}
              disabled={serverCount >= SANDBOX_LIMITS.maxServers}
              aria-label="Add a server"
            >
              +
            </button>
          </Field>

          <Field label="Positions each">
            <div className="flex gap-1.5">
              {POSITION_STEPS.map(value => (
                <button
                  key={value}
                  type="button"
                  className={`${CONTROL} ${value === vnodesPerServer ? CHOSEN : IDLE}`}
                  aria-pressed={value === vnodesPerServer}
                  onClick={() => dispatch({ type: 'SET_POSITIONS', value })}
                >
                  {value}
                </button>
              ))}
            </div>
          </Field>

          <button
            type="button"
            // Inline rather than pushed right: `ml-auto` makes it the first thing
            // to wrap onto a second row when the window narrows, which puts a
            // single button on a line of its own under the other two groups.
            className={`${CONTROL} ${IDLE}`}
            onClick={() => dispatch({ type: 'RESET' })}
          >
            Reset
          </button>
        </div>
      </div>
    </SceneFrame>
  );
}

export default SandboxScene;
