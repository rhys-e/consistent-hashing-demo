import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../../themes';
import {
  easeInOutCubic,
  easeOutCubic,
  mix,
  pulseProgress,
  rangeProgress,
} from '../../story/easing';
import { ringPoint } from '../../story/projection';
import {
  annotationAt,
  annotationPresenceAt,
  buildSteps,
  createTimeline,
  stepAtRest,
} from '../../story/sceneSteps';
import { buildSpreadModel, REMOVAL_KEYS } from '../../story/topology';
import { hashPosition } from '../../story/ringModel';
import { LAYOUT, KeyMark, OwnershipArc, ServerMarker } from './RingParts';
import ServerLoadPanel from './ServerLoadPanel';
import SceneAnnotation from './SceneAnnotation';

/**
 * The scene as durations laid end to end.
 *
 * It is Scene 3 run twice with one thing changed. The same three servers, the same
 * server failing, the same sweep filling the gap it leaves — but each server now
 * holds ten positions instead of one, and that is the only difference the viewer
 * is asked to account for. Everything else is deliberately identical, because a
 * comparison in which two things differ proves neither.
 *
 * The keys leave during the split, and that is the scene's second job. Ten
 * positions each puts thirty boundaries on the ring, which is past the point where
 * a viewer can follow an individual key — so the story stops asking them to, and
 * starts reading the ring as quantities. Scene 6 assumes exactly that.
 */
/**
 * Long, and the longest rest in the scene before the closing one.
 *
 * This frame is Scene 3's ring, and the whole of what follows is a comparison
 * against it — so it has to be looked at rather than glanced past. The scene is
 * asking the viewer to hold one picture in mind while a second is built on top of
 * it, which is more than a beat's worth of work.
 */
const OPENING = 3;
/** Each server's other nine positions arriving, staggered so they read as arriving. */
const SPLIT = { move: 2.6, stagger: 0.12, tether: 0.9 };
const KEYS_OUT = { move: 1 };
const PANEL = 0.5;
/**
 * The same failure as Scene 3, at the same pace. Anything faster here would be
 * read as the failure mattering less, when what has changed is only who absorbs it.
 */
const FAIL = { waver: 2, drop: 1.4 };
const ORPHANED_REST = 2.4;
const ABSORB = { move: 3.4 };
/**
 * The closing statement: everything dims except what changed hands, and then
 * everything comes back.
 *
 * The coming back is not a flourish, it is the correction to what the highlight
 * would otherwise say. The claim these scenes make is a *negative* — that the rest
 * of the ring was untouched — and a highlight makes the changed parts the figure
 * and the untouched parts the ground, which is the argument upside down. Ending on
 * it would leave a viewer with "those pieces are the result", when the result is
 * the whole ring and the pieces are merely the cost of it.
 *
 * So the highlight is a moment passed through: it answers what moved, and the
 * frame the scene rests on afterwards answers what did not.
 */
const HIGHLIGHT = { move: 0.9, restore: 0.8, dim: 0.12 };
/** The last frame of the scene: the ring entire, and mostly where it was. */
const WHOLE_REST = 1.6;
/** Long enough that a step lands clear of the movement either side of it. */
const REST = 0.5;
const READING_REST = 5;

/** How small a node gets, relative to a scene with one position per server. */
const DENSE_SCALE = 0.34;

function staggered({ from, to, count, each }, index) {
  const step = count > 1 ? (to - from - each) / (count - 1) : 0;
  const start = from + index * step;

  return { from: start, to: start + each };
}

export function buildSpreadTimeline(model) {
  const timeline = createTimeline({ readingRest: READING_REST });
  const [, dense] = model.levels;
  const extras = dense.before.topology.vnodes.length - model.servers.length;

  // Said before the pause rather than after it, so the rest is spent reading the
  // line *and* looking at the ring it is about.
  timeline.annotate('Give every server ten positions instead of one, scattered by the same hash.');
  const opening = timeline.rest(OPENING, 'One position each');

  const split = {
    ...timeline.move(SPLIT.move + SPLIT.stagger * (extras - 1)),
    count: extras,
    each: SPLIT.move,
  };
  const keysOut = { from: split.from, to: split.from + KEYS_OUT.move };
  timeline.rest(REST, 'Ten positions each');

  const panel = timeline.move(PANEL);
  const settled = timeline.rest(REST, 'Shares shown');

  const waver = timeline.move(FAIL.waver);
  const drop = timeline.move(FAIL.drop);
  const orphaned = timeline.rest(ORPHANED_REST, 'Nobody owns them');

  const absorb = timeline.move(ABSORB.move);
  const absorbed = timeline.rest(REST, 'Absorbed');

  const highlight = timeline.move(HIGHLIGHT.move);
  timeline.annotate(
    'The same failure, in seven pieces. Neither neighbour took much more than half.'
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

export const SPREAD_MODEL = buildSpreadModel();
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
 * Scene 4: the same failure, with ten positions per server instead of one.
 */
export function SpreadRing({ model, progress, timeline }) {
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
              splitAt(timeline, latest) * mix(1, HIGHLIGHT.dim, highlightAt(timeline, latest))
            }
            flattenFor={latest => splitAt(timeline, latest)}
            layer={`arc:${arc.vnodeId}`}
          />
        );
      })}

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
              // ten of them: after that the panel is the legend.
              namedFor={latest => (first ? 1 - splitAt(timeline, latest) : 0)}
              scaleFor={latest => mix(1, DENSE_SCALE, splitAt(timeline, latest))}
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

      {/* What changed hands, in the colours of whoever took it. Drawn over the
          dimmed ring rather than instead of it, because the point is how little
          of the ring these pieces are and how scattered they are across it. */}
      {dense.remap.ranges.map(range => (
        <OwnershipArc
          key={`moved-${range.from}`}
          progress={progress}
          endsAt={range.to}
          color={colors.get(range.serverId)}
          fullLength={range.to - range.from}
          lengthFor={() => range.to - range.from}
          opacityFor={latest => highlightAt(timeline, latest)}
          flattenFor={() => 1}
          layer={`moved:${range.serverId}:${range.from.toFixed(6)}`}
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
