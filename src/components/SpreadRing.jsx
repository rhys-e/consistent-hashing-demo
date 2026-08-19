import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../themes';
import { easeInOutCubic, easeOutCubic, mix, pulseProgress, rangeProgress } from '../story/easing';
import { ringPoint } from '../story/projection';
import {
  annotationAt,
  annotationPresenceAt,
  buildSteps,
  createTimeline,
  stepAtRest,
} from '../story/sceneSteps';
import { buildSpreadModel, REMOVAL_KEYS } from '../story/topology';
import { PLACED_SPREAD } from '../story/placedRing';
import { hashPosition } from '../story/ringModel';
import { LAYOUT, KeyMark, OwnershipArc, ServerMarker } from './RingParts';
import ServerLoadPanel from './ServerLoadPanel';
import SceneAnnotation from './SceneAnnotation';

/**
 * Scene 3 again, with six positions per server. Keys leave during the split:
 * eighteen boundaries is too many to follow individually.
 */
const OPENING = 3;
const SPLIT = { move: 2.6, stagger: 0.12, tether: 0.9 };
const KEYS_OUT = { move: 1 };
const PANEL = 0.5;
const FAIL = { waver: 2, drop: 1.4 };
const ORPHANED_REST = 2.4;
const ABSORB = { move: 3.4 };
/** Highlight what moved, then restore so the untouched ring is the last frame. */
const HIGHLIGHT = { move: 0.9, restore: 0.8 };
/** The last frame of the scene: the ring entire, and mostly where it was. */
const WHOLE_REST = 1.6;
/** Long enough that a step lands clear of the movement either side of it. */
const REST = 0.5;
const READING_REST = 5;

function staggered({ from, to, count, each }, index) {
  const step = count > 1 ? (to - from - each) / (count - 1) : 0;
  const start = from + index * step;

  return { from: start, to: start + each };
}

export function buildSpreadTimeline(model) {
  const timeline = createTimeline({ readingRest: READING_REST });
  const [, dense] = model.levels;
  const extras = dense.before.topology.vnodes.length - model.servers.length;

  timeline.annotate('This time each server gets six positions around the ring, not one.');
  const opening = timeline.rest(OPENING, 'One position each');

  const split = {
    ...timeline.move(SPLIT.move + SPLIT.stagger * (extras - 1)),
    count: extras,
    each: SPLIT.move,
  };
  const keysOut = { from: split.from, to: split.from + KEYS_OUT.move };
  timeline.rest(REST, 'Six positions each');

  const panel = timeline.move(PANEL);
  const settled = timeline.rest(REST, 'Shares shown');

  const waver = timeline.move(FAIL.waver);
  const drop = timeline.move(FAIL.drop);
  const orphaned = timeline.rest(ORPHANED_REST, 'Nobody owns them');

  const absorb = timeline.move(ABSORB.move);
  const absorbed = timeline.rest(REST, 'Absorbed');

  const highlight = timeline.move(HIGHLIGHT.move);
  timeline.annotate(
    'Last time one neighbour took all of it. This time the extra positions split the load, and each neighbour took about half.'
  );
  const closing = timeline.rest(READING_REST, 'What it cost');

  const restore = timeline.move(HIGHLIGHT.restore);
  const whole = timeline.rest(WHOLE_REST, 'Everything else held');

  return {
    opening,
    split,
    keysOut,
    panel,
    settled: (settled.from + settled.to) / 2,
    waver,
    drop,
    orphaned,
    absorb,
    absorbed: (absorbed.from + absorbed.to) / 2,
    highlight,
    closing,
    restore,
    whole: (whole.from + whole.to) / 2,
    rests: timeline.rests(),
    captions: timeline.captions(),
    narrations: timeline.narrations(),
    annotations: timeline.annotations(),
    end: timeline.at(),
  };
}

/** Positions placed, not hashed. See `placedRing`. */
export const SPREAD_MODEL = buildSpreadModel(PLACED_SPREAD);
export const SPREAD_BEATS = buildSpreadTimeline(SPREAD_MODEL);

export function buildSpreadSteps(timeline) {
  return buildSteps(
    timeline.rests.filter(entry => entry.label).map(entry => stepAtRest(entry, entry.label)),
    timeline.end
  );
}

export const SPREAD_STEPS = buildSpreadSteps(SPREAD_BEATS);

/** How far the split has run, from one position per server to ten. */
const splitAt = (timeline, progressValue) =>
  easeInOutCubic(rangeProgress(progressValue, timeline.split.from, timeline.split.to));

/** A single extra position arriving, in the order they were dealt out. */
const extraAt = (timeline, progressValue, index) => {
  const window = staggered(timeline.split, index);
  return easeOutCubic(rangeProgress(progressValue, window.from, window.to));
};

const droppedAt = (timeline, progressValue) =>
  easeInOutCubic(rangeProgress(progressValue, timeline.drop.from, timeline.drop.to));

const waverAt = (timeline, progressValue) =>
  rangeProgress(progressValue, timeline.waver.from, timeline.waver.to);

const absorbAt = (timeline, progressValue) =>
  easeInOutCubic(rangeProgress(progressValue, timeline.absorb.from, timeline.absorb.to));

const panelAt = (timeline, progressValue) =>
  rangeProgress(progressValue, timeline.panel.from, timeline.panel.to);

const highlightAt = (timeline, progressValue) =>
  pulseProgress(
    progressValue,
    timeline.highlight.from,
    timeline.highlight.to,
    timeline.restore.from,
    timeline.restore.to
  );

/**
 * The line from a server's first position to one of its new ones.
 *
 * Present only while the position is arriving, which is what makes ten marks in
 * one colour read as *one server holding ten places* rather than as ten servers.
 * It is decoration, and marked as such: the scene must not wait for it.
 */
function Tether({ progress, timeline, from, to, color, index }) {
  const start = ringPoint({ ...LAYOUT, radius: LAYOUT.radius, position: from });
  const end = ringPoint({ ...LAYOUT, radius: LAYOUT.radius, position: to });

  const opacity = useTransform(progress, latest => {
    const arrived = extraAt(timeline, latest, index);
    return arrived > 0 && arrived < 1 ? 0.35 * (1 - arrived) : 0;
  });

  return (
    <motion.line
      data-ephemeral="true"
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke={color}
      strokeWidth="1"
      style={{ opacity }}
    />
  );
}

/**
 * Scene 4: the same failure, with six positions per server instead of one.
 */
/**
 * How big a position's dot is at ten per server.
 *
 * It is the same dot as everywhere else, and getting there took ruling out both of
 * the ways round the crowding. Thirty full-size dots on this ring do overlap —
 * thirteen of the thirty neighbouring pairs touch, and two positions are 1.1px
 * apart — and the overlap cannot be designed away:
 *
 * **A hash will not give a clear ring.** For thirty points thrown at a ring of this
 * circumference, the chance that no two land closer together than a dot is wide is
 * `(1 - 30*17/1457)^29`, about **one in 265,000** — confirmed against a twenty
 * thousand draw simulation. Overlap is not this sample being unlucky, it is the
 * expected outcome. Sixteen candidate vnode key formats were measured and none
 * reached even a ten pixel minimum gap; `{id}#{i}`, the one in use, was also the
 * best of them on every other count the scenes need.
 *
 * **Fewer positions will not do it either.** Twelve dots clear each other in one
 * draw in five, which is the first count where it is even plausible — but ten is
 * the only count between one and twelve whose *starting* balance matches the
 * one-position ring's, and both levels starting from the same balance is what makes
 * the scene a comparison rather than two unrelated rings.
 *
 * So the dot stays the size the story taught it at, and the clumps stay. They are
 * not noise in the picture: they are the reason the shares are 35.6 / 31.6 / 32.9
 * rather than a third each, which is the number the panel beside them is showing.
 */
export const SPREAD_TREATMENT = { dotScale: 1, dim: 0.45 };

export function SpreadRing({ model, progress, timeline, treatment = SPREAD_TREATMENT }) {
  const { centreX, centreY, radius } = LAYOUT;
  const [sparse, dense] = model.levels;
  const colors = new Map(model.servers.map(server => [server.id, server.color]));
  const seam = ringPoint({ ...LAYOUT, radius, position: 0 });
  const seamOut = ringPoint({ ...LAYOUT, radius: radius + 24, position: 0 });

  const departing = model.removedId;
  const firstOf = new Map(model.servers.map(server => [server.id, `${server.id}#0`]));
  const extras = dense.before.topology.vnodes.filter(
    vnode => vnode.vnodeId !== firstOf.get(vnode.serverId)
  );
  const orderOf = new Map(extras.map((vnode, index) => [vnode.vnodeId, index]));
  const isFirst = vnode => vnode.vnodeId === firstOf.get(vnode.serverId);

  /** A vnode's own arc at each density, so the two can be crossfaded. */
  const arcOf = (level, vnodeId) => level.arcs.find(arc => arc.vnodeId === vnodeId);

  const keys = React.useMemo(
    () => REMOVAL_KEYS.map(name => ({ name, position: hashPosition(name) })),
    []
  );

  const shareOf = (shares, id) => shares.find(entry => entry.id === id)?.share ?? 0;
  const rows = model.servers.map(server => ({
    id: server.id,
    color: server.color,
    from: shareOf(dense.before.shares, server.id),
    to: shareOf(dense.after.shares, server.id),
  }));

  return (
    <g>
      <circle
        data-layer="reference-ring"
        cx={centreX}
        cy={centreY}
        r={radius}
        fill="none"
        stroke={theme.colors.primary.cyberBlue}
        strokeWidth="1.25"
        opacity="0.3"
      />
      <line
        data-layer="seam"
        x1={seam.x}
        y1={seam.y}
        x2={seamOut.x}
        y2={seamOut.y}
        stroke={theme.colors.primary.cyberBlue}
        strokeWidth="1.25"
        opacity="0.5"
      />

      {/* One position each, on its way out. The two densities are separate sets of
          ranges rather than one set that grows, because a topology is rebuilt from
          scratch when its vnode count changes — so they are crossfaded, and the
          marks flying out are what the eye follows across the change. */}
      {sparse.before.arcs.map(arc => (
        <OwnershipArc
          key={`sparse-${arc.vnodeId}`}
          progress={progress}
          endsAt={arc.endsAt}
          color={colors.get(arc.serverId)}
          fullLength={arc.span}
          lengthFor={() => arc.span}
          opacityFor={latest => 1 - splitAt(timeline, latest)}
          layer={`sparse:${arc.vnodeId}`}
        />
      ))}

      {dense.before.arcs.map(arc => {
        const after = arcOf(dense.after, arc.vnodeId);
        const gone = arc.serverId === departing;

        return (
          <OwnershipArc
            key={`dense-${arc.vnodeId}`}
            progress={progress}
            endsAt={arc.endsAt}
            color={colors.get(arc.serverId)}
            fullLength={arc.span}
            lengthFor={latest => {
              if (gone) return arc.span * (1 - droppedAt(timeline, latest));
              // A survivor's arc grows backwards into whatever the failure left in
              // front of it — the same sweep, for the same reason, as Scene 3.
              return after ? mix(arc.span, after.span, absorbAt(timeline, latest)) : arc.span;
            }}
            opacityFor={latest =>
              splitAt(timeline, latest) * mix(1, treatment.dim, highlightAt(timeline, latest))
            }
            layer={`arc:${arc.vnodeId}`}
          />
        );
      })}

      {/* Remapped ranges over the dimmed ring, under the marks so boundaries stay visible. */}
      {dense.remap.ranges.map(range => (
        <OwnershipArc
          key={`moved-${range.from}`}
          progress={progress}
          endsAt={range.to}
          color={colors.get(range.serverId)}
          fullLength={range.to - range.from}
          lengthFor={() => range.to - range.from}
          opacityFor={latest => highlightAt(timeline, latest)}
          layer={`moved:${range.serverId}:${range.from.toFixed(6)}`}
        />
      ))}

      {dense.before.topology.vnodes.map(vnode => {
        const index = orderOf.get(vnode.vnodeId);
        const first = isFirst(vnode);
        const gone = vnode.serverId === departing;

        return (
          <g key={vnode.vnodeId}>
            {!first ? (
              <Tether
                progress={progress}
                timeline={timeline}
                from={hashPosition(firstOf.get(vnode.serverId))}
                to={vnode.position}
                color={colors.get(vnode.serverId)}
                index={index}
              />
            ) : null}
            <ServerMarker
              progress={progress}
              server={model.servers.find(server => server.id === vnode.serverId)}
              position={vnode.position}
              presenceFor={latest =>
                (first ? 1 : extraAt(timeline, latest, index)) *
                (gone ? 1 - droppedAt(timeline, latest) : 1)
              }
              // Only the original position keeps its name, and only until there are
              // six of them: after that the panel is the legend.
              namedFor={latest => (first ? 1 - splitAt(timeline, latest) : 0)}
              scaleFor={latest => mix(1, treatment.dotScale, splitAt(timeline, latest))}
              waverFor={gone ? latest => waverAt(timeline, latest) : undefined}
              layer={`marker:${vnode.vnodeId}`}
            />
          </g>
        );
      })}

      {/* The keys go as the positions multiply. Thirty boundaries is past the
          point where an individual key can be followed, so the story stops asking
          and starts reading the ring as quantities — which is what Scene 6 needs. */}
      {keys.map(sampleKey => (
        <KeyMark
          key={sampleKey.name}
          progress={progress}
          sampleKey={sampleKey}
          colorFor={() => theme.colors.ui.text.secondary}
          presenceFor={latest =>
            1 - easeInOutCubic(rangeProgress(latest, timeline.keysOut.from, timeline.keysOut.to))
          }
          layer={`key:${sampleKey.name}`}
        />
      ))}

      <ServerLoadPanel
        {...LAYOUT.panel}
        rows={rows}
        progress={progress}
        settleFor={(latest, rowIndex) =>
          rows[rowIndex].id === departing ? droppedAt(timeline, latest) : absorbAt(timeline, latest)
        }
        revealFor={latest => panelAt(timeline, latest)}
        rowOpacityFor={(latest, rowIndex) =>
          rows[rowIndex].id === departing ? mix(1, 0.3, droppedAt(timeline, latest)) : 1
        }
        evenShare={1 / model.servers.length}
        // A server leaves, so an even share stops being a third and becomes a half.
        evenShareFor={latest =>
          mix(1 / model.servers.length, 1 / model.survivors.length, droppedAt(timeline, latest))
        }
        evenMark={0.4}
        remap={{ fraction: dense.remap.fraction }}
        remapProgressFor={latest => absorbAt(timeline, latest)}
        remapRevealFor={latest =>
          rangeProgress(latest, timeline.absorb.from, timeline.absorb.from + 0.4)
        }
      />

      <SceneAnnotation
        progress={progress}
        {...LAYOUT.annotation}
        textFor={latest => annotationAt(timeline, latest)}
        presenceFor={latest => annotationPresenceAt(timeline, latest)}
      />
    </g>
  );
}

export default SpreadRing;
