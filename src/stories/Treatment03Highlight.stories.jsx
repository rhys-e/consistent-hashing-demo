import { SpreadRing, SPREAD_BEATS, SPREAD_MODEL, SPREAD_TREATMENT } from '../components/SpreadRing';
import { STAGE } from '../story/stage';
import { useSceneTimeline } from '../story/useSceneTimeline';
import SceneFrame from '../components/SceneFrame';

/**
 * Scene 4's closing highlight: how to say *these are the pieces that moved*.
 *
 * **What it did.** Everything not remapped fell to a twelfth opacity while the
 * moved stretches stayed lit. That answers "which pieces moved" and answers a
 * second question nobody asked: at that depth the ring stops being a ring and
 * becomes six slivers floating in the dark. The scene's whole argument is a
 * *negative* — that the rest of the ring was untouched — and it cannot make that
 * argument with the rest of the ring taken away.
 *
 * **What it does now.** It dims to 0.45 rather than 0.12, and that is all. The
 * untouched ring stays legible as a ring while the moved stretches stay the
 * brighter thing, which is the whole of what the frame has to say.
 *
 * A second device was tried and dropped: a rail outside the band tracing the moved
 * stretches, so that the dim could be gentler still or disappear entirely. It
 * worked, and it was one thing too many — the scene already recolours those
 * stretches during the absorption, so naming them a third way was saying something
 * the frame had said twice.
 *
 * `PartialFade` is what ships. `FullFade` is what it replaced.
 */
const meta = {
  title: 'Hash Ring/Treatments/03 Closing Highlight',
  parameters: { layout: 'fullscreen' },
  argTypes: {
    pinnedProgress: { control: { type: 'range', min: 0, max: SPREAD_BEATS.end, step: 0.05 } },
  },
};

export default meta;

function Closing({ dim, at = SPREAD_BEATS.closing.from + 1 }) {
  const timeline = useSceneTimeline({ beatCount: SPREAD_BEATS.end, steps: [], pinnedProgress: at });

  return (
    <SceneFrame active>
      <svg
        viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="The ring after the failure, with the stretches that changed hands picked out."
        className="h-full w-full"
      >
        <SpreadRing
          model={SPREAD_MODEL}
          progress={timeline.progress}
          timeline={SPREAD_BEATS}
          treatment={{ ...SPREAD_TREATMENT, dim }}
        />
      </svg>
    </SceneFrame>
  );
}

/** What it did: everything else at a twelfth. The ring disappears. */
export const FullFade = { render: () => <Closing dim={0.12} /> };

/** **Ships.** Dimmed partway: the ring survives, the moved pieces stay brighter. */
export const PartialFade = { render: () => <Closing dim={0.45} /> };

/** A third of the way, in case 0.45 still takes too much of the ring. */
export const DeeperFade = { render: () => <Closing dim={0.3} /> };

/** Barely dimmed, in case 0.45 takes too little for the pieces to read. */
export const LightFade = { render: () => <Closing dim={0.65} /> };

/**
 * The frame after the highlight lets go, which is the one the scene rests on.
 * Whatever the highlight does, this has to come back to the whole ring — that is
 * the correction the restore exists to make.
 */
export const Restored = {
  render: () => <Closing dim={0.45} at={SPREAD_BEATS.whole} />,
};
