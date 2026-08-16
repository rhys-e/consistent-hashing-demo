import { SpreadRing, buildSpreadTimeline } from '../components/SpreadRing';
import { buildSpreadModel } from '../story/topology';
import { SCATTER, placedPositions } from '../story/placedRing';
import { STAGE } from '../story/stage';
import { useSceneTimeline } from '../story/useSceneTimeline';
import SceneFrame from '../components/SceneFrame';

/**
 * Scene 4's positions: hashed against placed, and why the count could then change.
 *
 * **The problem.** Full-size dots overlap on a hashed ring, and re-rolling does not
 * help. 52,800 candidate casts and vnode key formats were measured — ten name
 * families × every triple from 1..16 × which departs × ten formats — and none got
 * the collisions below seven. For thirty points thrown at a ring this size a tight
 * pair is the *expected* outcome, not bad luck.
 *
 * **What changed.** The positions are placed instead: slots laid evenly across each
 * arc between the three real hashed anchors, then jittered within the room each has
 * above a minimum gap. `PlacedSix` is what the deck now draws.
 *
 * | | dots | min gap | ratio | collisions | shares | spread |
 * | --- | --- | --- | --- | --- | --- | --- |
 * | hashed, 10 each *(was)* | 30 | 1px | 205:1 | **12** | 35.6 / 31.6 / 32.9 | 4.0 |
 * | hashed, 6 each | 18 | 7px | 36:1 | **4** | 35.9 / 23.9 / 40.1 | **16.2** |
 * | placed, 6 each *(ships)* | 18 | 51px | 2.2:1 | **0** | 34.9 / 34.4 / 30.7 | 4.2 |
 *
 * **And why the count was stuck at ten.** Look at the middle row. Hashed, six is a
 * bad ring — it starts sixteen points from even against the one-position ring's
 * four and a half, so a viewer would have two changes to account for and would
 * credit the wrong one. Ten was the only count from one to twelve that a hash left
 * near even, which is why the scene was carrying thirty dots. Placing the positions
 * builds the evenness instead of drawing for it, and the count becomes a free
 * choice: six gives eighteen dots, a minimum gap of three dot widths, and a
 * *stronger* argument — the bigger survivor takes half of what was lost, in six
 * pieces.
 *
 * **What placing costs.** These are not where `cache-3#4` hashes to. The scene never
 * claims they are: what it claims is that a server holding many positions has its
 * failure absorbed by several neighbours rather than one, which is a fact about
 * counting, not about this sample. Names and hash values have already left the ring
 * by the time the split runs. Two things are kept in exchange — the three `#0`
 * anchors are real hashes, so Scene 4 still opens on Scene 3's frame, and the
 * spacing stays irregular enough not to read as arranged, since perfectly even
 * positions would be a worse lie than the clumping.
 */
const meta = {
  title: 'Hash Ring/Treatments/02 Distribution',
  parameters: { layout: 'fullscreen' },
};

export default meta;

const hashedAt = perServer => buildSpreadModel({ levels: [1, perServer] });
const placedAt = (perServer, jitter = SCATTER.loose) =>
  buildSpreadModel({
    levels: [1, perServer],
    positionFor: placedPositions({ perServer, jitter }),
  });

const MODELS = {
  hashedTen: hashedAt(10),
  hashedSix: hashedAt(6),
  tidy: placedAt(6, SCATTER.tidy),
  natural: placedAt(6, SCATTER.natural),
  five: placedAt(5),
  six: placedAt(6),
  seven: placedAt(7),
};

/** Scene 4's own component and timeline, pinned, so only the positions differ. */
function Ring({ which, at = 'settled' }) {
  const model = MODELS[which];
  const beats = buildSpreadTimeline(model);
  const timeline = useSceneTimeline({
    beatCount: beats.end,
    steps: [],
    pinnedProgress: at === 'settled' ? beats.settled : beats[at],
  });

  return (
    <SceneFrame active>
      <svg
        viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Three servers at ten positions each, ${which} placement.`}
        className="h-full w-full"
      >
        <SpreadRing model={model} progress={timeline.progress} timeline={beats} />
      </svg>
    </SceneFrame>
  );
}

/** What the scene drew before any of this: thirty dots, twelve of them colliding. */
export const HashedTen = { render: () => <Ring which="hashedTen" /> };

/** Six, hashed. Fewer collisions, but the ring starts sixteen points from even. */
export const HashedSix = { render: () => <Ring which="hashedSix" /> };

/** **What ships.** Six, placed, loosest scatter: eighteen dots, none touching. */
export const PlacedSix = { render: () => <Ring which="six" /> };

/** The two calmer scatters, kept so the trade can be re-checked by eye. */
export const PlacedTidy = { render: () => <Ring which="tidy" /> };
export const PlacedNatural = { render: () => <Ring which="natural" /> };

/** Either side of six, in case the count wants moving again. */
export const PlacedFive = { render: () => <Ring which="five" /> };
export const PlacedSeven = { render: () => <Ring which="seven" /> };

/** After the absorption, where the pieces the failure broke into are visible. */
export const HashedTenAbsorbed = { render: () => <Ring which="hashedTen" at="absorbed" /> };
export const PlacedSixAbsorbed = { render: () => <Ring which="six" at="absorbed" /> };
