import React, { useState } from 'react';
import DeckCountdown, { ScrollHint } from '../components/story-scenes/DeckCountdown';
import NarrationSlide from '../components/story-scenes/NarrationSlide';

/**
 * The countdown on its own, because it was invisible for two rounds and neither
 * round could be checked without watching a whole deck play through to reach it.
 *
 * It is a fixed element pinned to the bottom of the viewport, so it renders at the
 * bottom of the preview whatever is behind it. `Restart` replays it without
 * reloading, which is the thing a story of a five-second animation actually needs.
 */
const meta = {
  title: 'Hash Ring/Guided Story/Deck Countdown',
  component: DeckCountdown,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    seconds: {
      description: 'How long the bar takes to run out.',
      control: { type: 'range', min: 0.5, max: 12, step: 0.5 },
    },
  },
  args: { seconds: 6 },
};

export default meta;

const SLIDE = {
  number: 'Part two',
  label: 'Scale',
  title: 'Now do it a thousand times',
  body: [
    'Everything so far has been small enough to point at. Real deployments give every server hundreds of positions, and at that density you cannot look at a ring and say who owns what.',
  ],
};

function Harness({ children, note }) {
  const [run, setRun] = useState(0);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-body-bg">
      <NarrationSlide {...SLIDE} key={`slide-${run}`} />

      <div className="absolute left-1/2 top-8 z-30 flex -translate-x-1/2 items-center gap-4">
        <button
          type="button"
          onClick={() => setRun(current => current + 1)}
          className="border border-cyber-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.28em] text-ui-text-secondary transition-colors duration-normal hover:text-ui-text-bright"
        >
          Restart
        </button>
        {note ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ui-text-secondary/60">
            {note}
          </span>
        ) : null}
      </div>

      {children(run)}
    </div>
  );
}

/** What a viewer gets a few seconds before the deck moves on by itself. */
export const CountingDown = {
  render: args => (
    <Harness note="Bar runs along the bottom edge">
      {run => <DeckCountdown key={run} {...args} />}
    </Harness>
  ),
};

/** Short, for checking the shape of it without waiting. */
export const Fast = {
  args: { seconds: 1.5 },
  render: args => <Harness>{run => <DeckCountdown key={run} {...args} />}</Harness>,
};

/**
 * Long, for judging whether it is calm enough to ignore while reading.
 */
export const Slow = {
  args: { seconds: 12 },
  render: args => <Harness>{run => <DeckCountdown key={run} {...args} />}</Harness>,
};

/** What replaces it once a viewer has taken control of the deck. */
export const EngagedHint = {
  render: () => <Harness note="Countdown replaced by the hint">{() => <ScrollHint />}</Harness>,
};
