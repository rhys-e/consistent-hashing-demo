import React from 'react';
import theme from '../themes';
import {
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  mix,
  pulseProgress,
  rangeProgress,
} from '../story/easing';
import { forwards } from '../story/ringDash';
import { ringPoint } from '../story/projection';
import { LAYOUT, KeyMark, OwnershipArc, ServerMarker } from './RingParts';
import {
  annotationAt,
  annotationPresenceAt,
  buildSteps,
  createTimeline,
  stepAtRest,
} from '../story/sceneSteps';
import { buildRemovalModel } from '../story/topology';
import ServerLoadPanel from './ServerLoadPanel';
import SceneAnnotation from './SceneAnnotation';

const palette = {
  ring: theme.colors.primary.cyberBlue,
  label: theme.colors.ui.text.secondary,
  /** A key nobody owns. Not a colour any server has, which is the point of it. */
  orphan: theme.colors.ui.text.secondary,
};

/**
 * Further left than the panel's default, because the point of the scene is one
 * server ending at nearly twice an even share and the bar has to have somewhere
 * to go. At the default it would clamp at the end of its track, and the doubling —
 * the whole argument — would stop being measurable.
 */
const EVEN_MARK = 0.4;
/**
 * The scene as durations laid end to end.
 *
 * One movement carries the whole scene, and the story plays it twice. Each
 * server's arc sweeps *backwards* from its own position to the one before it —
 * that is the ownership rule, animated rather than asserted. Scene 2 does that
 * sweep; this scene is the second playing of it, where a server leaves and its
 * neighbour performs the identical sweep again across the ground it left. The
 * second reads as an answer because the first taught the grammar.
 *
 * Which is why nothing here establishes anything. Scene 2 ends on precisely the
 * frame this scene opens on — three servers, eleven keys, every range claimed —
 * and `Story.jsx` puts no slide between them in order to keep it. This scene used
 * to land the markers, sweep the arcs and place the keys all over again, which
 * spent the first twelve seconds rebuilding a picture already on screen and threw
 * away the continuity the pair was arranged to have.
 */
const PANEL = 0.45;
const OPENING_REST = 1.2;
/**
 * A server does not vanish, it fails: it wavers first, which is the difference
 * between something being removed from a diagram and something going wrong.
 *
 * Deliberately slow. Everything before this is setup, and a failure that is over
 * before the eye has found it turns the point of the scene into a cut. The waver
 * is long enough to be read as trouble rather than as a flicker, and the drop long
 * enough that a viewer watching the panel sees the bar drain rather than blink.
 */
const FAIL = { waver: 2, drop: 1.4 };
/** The unowned gap, held. The one frame in the story where a range has no owner. */
const ORPHANED_REST = 2.4;
/** Slower than the establishing sweep: this one is the answer, not the grammar. */
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
const REST = 0.4;
/** A rest that follows new narration, long enough to actually read it in. */
const READING_REST = 5;

/**
 * The window for one item of a staggered group.
 *
 * Every member takes the same time; what is staggered is when each begins, so the
 * group as a whole fills the window it was given however many members it has.
 */
function staggered({ from, to, count, each }, index) {
  const step = count > 1 ? (to - from - each) / (count - 1) : 0;
  const start = from + index * step;

  return { from: start, to: start + each };
}

const group = (window, count, each) => ({ ...window, count, each });

export function buildRemovalTimeline(model) {
  const timeline = createTimeline({ readingRest: READING_REST });
  const servers = model.servers.length;

  /**
   * The establishing movements, kept as windows of no length at the very start.
   *
   * Every layer describes itself as "how far through my window are we", and
   * `rangeProgress` reads a zero-length window as complete from the first frame.
   * So the ring arrives assembled without any layer needing a second, settled code
   * path — which is the version of this that would rot, because the drawing and the
   * timeline would then hold separate opinions about what the scene opens on.
   */
  const arrived = { from: 0, to: 0 };
  const markers = group(arrived, servers, 0);
  const sweep = group(arrived, servers, 0);
  const keys = group(arrived, model.keys.length, 0);

  // The one thing that does arrive, because it is the one thing Scene 2 never put
  // on screen. The ring carries straight over and the measurement of it turns up:
  // that is a scene beginning, rather than the previous slide being redrawn.
  const panel = timeline.move(PANEL);
  // Long enough to register as a frame the viewer has arrived at rather than one
  // the previous slide left behind, and short enough that a scene which opens on a
  // picture the viewer already read does not make them wait to be told why.
  const settled = timeline.rest(OPENING_REST, 'Shares shown');

  // The claim the scene is here to make, said while it is still true of nothing on
  // screen, and left standing until the second half qualifies it.
  timeline.annotate(
    "Only the failed server's keys have to move. Every other key stays where it is."
  );
  const waver = timeline.move(FAIL.waver);
  const drop = timeline.move(FAIL.drop);
  const orphaned = timeline.rest(ORPHANED_REST, 'Nobody owns it');

  const absorb = timeline.move(ABSORB.move);
  const absorbed = timeline.rest(REST, 'Absorbed');

  const highlight = timeline.move(HIGHLIGHT.move);
  timeline.annotate(
    'Those keys all went to one neighbour. That neighbour now owns about twice the range, so the load is no longer even.'
  );
  const closing = timeline.rest(READING_REST, 'What it cost');

  const restore = timeline.move(HIGHLIGHT.restore);
  const whole = timeline.rest(WHOLE_REST, 'Everything else held');

  return {
    markers,
    sweep,
    keys,
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

export const REMOVAL_MODEL = buildRemovalModel();
export const REMOVAL_BEATS = buildRemovalTimeline(REMOVAL_MODEL);

/**
 * Where the scene rests, in the order it rests there — derived from the timeline's
 * own rests rather than re-listed, so there is one place a beat can be wrong.
 */
export function buildRemovalSteps(timeline) {
  return buildSteps(
    timeline.rests.filter(rest => rest.label).map(rest => stepAtRest(rest, rest.label)),
    timeline.end
  );
}

export const REMOVAL_STEPS = buildRemovalSteps(REMOVAL_BEATS);

/** How far a marker has arrived, in its order round the ring from the seam. */
function markerAt(timeline, progressValue, index) {
  const window = staggered(timeline.markers, index);
  return easeOutBack(rangeProgress(progressValue, window.from, window.to));
}

/**
 * How far a server's arc has swept back towards the position before it.
 *
 * Staggered round the ring rather than run together: three arcs growing at once is
 * a pattern filling in, and what has to be read here is one rule applying three
 * times.
 */
function sweepAt(timeline, progressValue, index) {
  const window = staggered(timeline.sweep, index);
  return easeInOutCubic(rangeProgress(progressValue, window.from, window.to));
}

/** A key arrives once there is an owner under it to be coloured by. */
function keyAt(timeline, progressValue, index) {
  const window = staggered(timeline.keys, index);
  return easeOutCubic(rangeProgress(progressValue, window.from, window.to));
}

/**
 * How present a key's name is.
 *
 * Every key is named from the moment it lands, faintly. Naming only some of them
 * would make a name mean something — and whichever ones were chosen, the choice
 * would be read as a hint about what is going to happen to them.
 *
 * What changes at the failure is emphasis, not existence: the keys the failing
 * server was holding come forward and the rest recede. That is legitimate where a
 * late label would not be, because it says which keys are *at risk* rather than
 * where they will end up — and it lets the viewer count them before they move, so
 * that all of them arriving at one neighbour is something they check rather than
 * something they are told.
 */
const LABEL = { resting: 0.34, focused: 1, recessed: 0.15 };

function keyLabelAt(timeline, progressValue, sampleKey, index) {
  const arrived = keyAt(timeline, progressValue, index);
  const focus = rangeProgress(progressValue, timeline.waver.from, timeline.waver.to);

  return (
    arrived *
    (sampleKey.moves
      ? mix(LABEL.resting, LABEL.focused, focus)
      : mix(LABEL.resting, LABEL.recessed, focus))
  );
}

function panelAt(timeline, progressValue) {
  return rangeProgress(progressValue, timeline.panel.from, timeline.panel.to);
}

/** How far gone the departing server is: 0 while it is still serving, 1 once out. */
function droppedAt(timeline, progressValue) {
  return easeInOutCubic(rangeProgress(progressValue, timeline.drop.from, timeline.drop.to));
}

/**
 * The waver before the drop, as a 0..1 unease.
 *
 * Decoration, and marked as such: a step must never be spent waiting for a flicker
 * to finish.
 */
function waverAt(timeline, progressValue) {
  return pulseProgress(
    progressValue,
    timeline.waver.from,
    timeline.waver.from + 0.25,
    timeline.waver.to - 0.1,
    timeline.drop.to
  );
}

const highlightAt = (timeline, progressValue) =>
  pulseProgress(
    progressValue,
    timeline.highlight.from,
    timeline.highlight.to,
    timeline.restore.from,
    timeline.restore.to
  );

/** How far the surviving neighbour has swept across the ground that was left. */
function absorbAt(timeline, progressValue) {
  return easeInOutCubic(rangeProgress(progressValue, timeline.absorb.from, timeline.absorb.to));
}

/**
 * Scene 3: three servers at one position each, and what happens when one leaves.
 *
 * Everything is a pure function of one beat value, so stepping back runs the scene
 * backwards without the scene knowing it is happening.
 */
export function RemovalRing({ model, progress, timeline }) {
  const { centreX, centreY, radius } = LAYOUT;
  const colors = new Map(model.servers.map(server => [server.id, server.color]));
  const seam = ringPoint({ ...LAYOUT, radius, position: 0 });
  const seamOut = ringPoint({ ...LAYOUT, radius: radius + 24, position: 0 });

  const departing = model.removedId;
  const absorbing = model.remap.ranges[0]?.serverId;
  const spanOf = (arcs, id) => arcs.find(arc => arc.serverId === id)?.span ?? 0;
  // What the surviving neighbour gains is exactly what the departing server held,
  // taken as the difference between the two topologies rather than assumed.
  const extension = spanOf(model.after.arcs, absorbing) - spanOf(model.before.arcs, absorbing);

  const lengthFor = (arc, index) => latest => {
    const claimed = sweepAt(timeline, latest, index) * arc.span;
    if (arc.serverId === departing) return claimed * (1 - droppedAt(timeline, latest));
    if (arc.serverId !== absorbing) return claimed;
    return claimed + absorbAt(timeline, latest) * extension;
  };

  /**
   * A key's owner, taken from where the absorbing arc's leading edge has got to.
   *
   * The recolour is therefore not a second event scheduled to look simultaneous
   * with the sweep — it *is* the sweep, read at the key's own position. A key the
   * arc has not reached yet has no owner at all, which is the honest state of a
   * range whose server has gone.
   */
  const keyColorAt = sampleKey => latest => {
    if (sampleKey.owner !== departing) return colors.get(sampleKey.owner);

    const gone = droppedAt(timeline, latest);
    const reached = absorbAt(timeline, latest) * extension;
    if (
      reached >=
      forwards(sampleKey.position, model.before.arcs.find(a => a.serverId === departing).endsAt)
    )
      return colors.get(sampleKey.nextOwner);

    return gone > 0.5 ? palette.orphan : colors.get(sampleKey.owner);
  };

  const shareOf = (shares, id) => shares.find(entry => entry.id === id)?.share ?? 0;
  const rows = model.servers.map(server => ({
    id: server.id,
    color: server.color,
    from: shareOf(model.before.shares, server.id),
    to: shareOf(model.after.shares, server.id),
  }));

  return (
    <g>
      <circle
        data-layer="reference-ring"
        cx={centreX}
        cy={centreY}
        r={radius}
        fill="none"
        stroke={palette.ring}
        strokeWidth="1.25"
        opacity="0.3"
      />

      {/* The seam, marked but not laboured: by this point in the story the viewer
          has watched the line join here. It earns its keep later, when the arc
          that absorbs the departing server has to grow across it. */}
      <line
        data-layer="seam"
        x1={seam.x}
        y1={seam.y}
        x2={seamOut.x}
        y2={seamOut.y}
        stroke={palette.ring}
        strokeWidth="1.25"
        opacity="0.5"
      />

      {model.before.arcs.map((arc, index) => (
        <OwnershipArc
          key={`arc-${arc.serverId}`}
          progress={progress}
          endsAt={arc.endsAt}
          color={colors.get(arc.serverId)}
          fullLength={arc.span}
          lengthFor={lengthFor(arc, index)}
          opacityFor={latest => mix(1, HIGHLIGHT.dim, highlightAt(timeline, latest))}
          layer={`arc:${arc.serverId}`}
        />
      ))}

      {/* What changed hands, in the colour of whoever took it — one block, one
          colour, which is exactly what Scene 4 then breaks apart.

          Above the arcs and below the marks, because a mark is the *boundary* of
          the stretch being highlighted: drawn last, the highlight covered the dots
          at either end of itself and hid the thing it was pointing at. */}
      {model.remap.ranges.map(range => (
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

      {model.before.arcs.map((arc, index) => (
        <ServerMarker
          key={`marker-${arc.serverId}`}
          progress={progress}
          server={model.servers.find(server => server.id === arc.serverId)}
          position={arc.endsAt}
          presenceFor={latest =>
            markerAt(timeline, latest, index) *
            (arc.serverId === departing ? 1 - droppedAt(timeline, latest) : 1)
          }
          waverFor={arc.serverId === departing ? latest => waverAt(timeline, latest) : undefined}
          layer={`marker:${arc.serverId}`}
        />
      ))}

      {model.keys.map((sampleKey, index) => (
        <KeyMark
          key={`key-${sampleKey.name}`}
          progress={progress}
          sampleKey={sampleKey}
          colorFor={keyColorAt(sampleKey)}
          presenceFor={latest => keyAt(timeline, latest, index)}
          labelFor={latest => keyLabelAt(timeline, latest, sampleKey, index)}
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
        // The mark keeps the value that was even when the scene opened, so what
        // happens to it afterwards can be read against it.
        evenMark={EVEN_MARK}
        evenShare={1 / model.servers.length}
        // A server leaves, so an even share stops being a third and becomes a half.
        evenShareFor={latest =>
          mix(1 / model.servers.length, 1 / model.survivors.length, droppedAt(timeline, latest))
        }
        remap={{ fraction: model.remap.fraction }}
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

export default RemovalRing;
