import React from 'react';
import { motion, useTransform } from 'motion/react';
import theme from '../themes';
import {
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  mix,
  pulseProgress,
  rangeProgress,
} from '../story/easing';
import { ringPoint } from '../story/projection';
import { CIRCLE_START } from '../story/ringDash';
import {
  annotationAt,
  annotationPresenceAt,
  buildSteps,
  createTimeline,
  stepAtRest,
} from '../story/sceneSteps';
import { toHashLabel } from '../story/hashSpace';
import { buildLookupModel } from '../story/topology';
import { LAYOUT, KEY_INSET, KeyMark, OwnershipArc, ServerMarker } from './RingParts';
import SceneAnnotation from './SceneAnnotation';

/**
 * Keys, then servers, then one slow lookup, then the rest, then ownership arcs.
 */
const OPENING = 0.5;
/**
 * The ring drawing itself, before anything is on it.
 *
 * It used to be simply *there* on the first frame, which is the one thing in the
 * story that arrives without having come from anywhere — every other mark grows,
 * sweeps, falls or resolves. Drawn round from the seam it also says where the seam
 * is before the seam has to matter, which is a thing the scene otherwise asserts
 * with a tick and never demonstrates.
 */
const RING_IN = 1.1;
const KEYS = { move: 2.2 };
const ARRIVE = { move: 1.5, stagger: 0.55 };
const STEP_IN = { move: 1.3 };
/** Slow enough to be read as a journey with a direction, not a line appearing. */
const TEACH = { travel: 3, land: 0.6 };
/** Two more, quick, from the other two servers: a rule rather than an anecdote. */
const ECHO = { travel: 1.3, land: 0.4, stagger: 0.8 };
const REMAINDER = { travel: 1.6, stagger: 0.09 };
const SWEEP = { each: 1.4, stagger: 0.9 };
/** Long enough that a step lands clear of the movement either side of it. */
const REST = 0.5;
const READING_REST = 5;

/** One key per server, taught before the rule is generalised. `user:1842` first: already seen. */
const TAUGHT = ['user:1842', 'user:6177', 'user:4570'];

function staggered({ from, to, count, each }, index) {
  const step = count > 1 ? (to - from - each) / (count - 1) : 0;
  const start = from + index * step;

  return { from: start, to: start + each };
}

const group = (window, count, each) => ({ ...window, count, each });

export function buildLookupTimeline(model) {
  const timeline = createTimeline({ readingRest: READING_REST });
  const servers = model.servers.length;
  // Map, do not filter: the model is sorted by position, not by teaching order.
  const taught = TAUGHT.map(name => model.keys.find(key => key.name === name));
  const rest = model.keys.filter(key => !TAUGHT.includes(key.name));

  const ringIn = timeline.move(RING_IN);
  const opening = timeline.rest(OPENING, 'Empty ring');

  const keys = group(timeline.move(KEYS.move), model.keys.length, KEYS.move * 0.4);
  timeline.rest(REST, 'Keys placed');

  timeline.annotate(
    'Each server hashes onto the ring from its name. It takes a position, the same way a key does.'
  );
  const arrive = group(
    timeline.move(ARRIVE.move + ARRIVE.stagger * (servers - 1)),
    servers,
    ARRIVE.move
  );
  const stepIn = {
    from: arrive.from + ARRIVE.stagger,
    to: arrive.from + ARRIVE.stagger + STEP_IN.move,
  };
  timeline.rest(REST, 'Servers placed');

  const routes = new Map();
  const teach = timeline.move(TEACH.travel);
  routes.set(taught[0].name, { ...teach, land: TEACH.land });
  timeline.skip(TEACH.land);
  timeline.annotate(
    'A key belongs to the first server clockwise from its position. Anyone can compute the owner the same way.'
  );
  timeline.rest(REST, 'First key routed');

  const echo = group(
    timeline.move(ECHO.travel + ECHO.stagger * (taught.length - 2)),
    taught.length - 1,
    ECHO.travel
  );
  taught.slice(1).forEach((key, index) => {
    routes.set(key.name, { ...staggered(echo, index), land: ECHO.land });
  });
  timeline.skip(ECHO.land);
  timeline.rest(REST, 'Three keys routed');

  const remainder = group(
    timeline.move(REMAINDER.travel + REMAINDER.stagger * (rest.length - 1)),
    rest.length,
    REMAINDER.travel
  );
  rest.forEach((key, index) => {
    routes.set(key.name, { ...staggered(remainder, index), land: ECHO.land });
  });
  timeline.rest(REST, 'Every key routed');

  timeline.annotate(
    'Every position between two servers is claimed the same way. That whole range belongs to the server at its clockwise end.'
  );
  const sweep = group(
    timeline.move(SWEEP.each + SWEEP.stagger * (servers - 1)),
    servers,
    SWEEP.each
  );
  const settled = timeline.rest(READING_REST, 'Ranges claimed');

  return {
    ringIn,
    opening,
    keys,
    arrive,
    stepIn,
    routes,
    remainder,
    sweep,
    settled: (settled.from + settled.to) / 2,
    rests: timeline.rests(),
    captions: timeline.captions(),
    narrations: timeline.narrations(),
    annotations: timeline.annotations(),
    end: timeline.at(),
  };
}

export const LOOKUP_MODEL = buildLookupModel();
export const LOOKUP_BEATS = buildLookupTimeline(LOOKUP_MODEL);

export function buildLookupSteps(timeline) {
  return buildSteps(
    timeline.rests.filter(entry => entry.label).map(entry => stepAtRest(entry, entry.label)),
    timeline.end
  );
}

export const LOOKUP_STEPS = buildLookupSteps(LOOKUP_BEATS);

const keyAt = (timeline, progressValue, index) => {
  const window = staggered(timeline.keys, index);
  return easeOutCubic(rangeProgress(progressValue, window.from, window.to));
};

const markerAt = (timeline, progressValue, index) => {
  const window = staggered(timeline.arrive, index);
  return easeOutCubic(rangeProgress(progressValue, window.from, window.to));
};

/** How far inside the band a key has stepped, in drawing units. */
const insetAt = (timeline, progressValue) =>
  KEY_INSET *
  easeInOutCubic(rangeProgress(progressValue, timeline.stepIn.from, timeline.stepIn.to));

/** How far along its journey a key's particle is. */
function routeAt(timeline, progressValue, sampleKey) {
  const window = timeline.routes.get(sampleKey.name);
  if (!window) return 0;
  return easeInOutCubic(rangeProgress(progressValue, window.from, window.to));
}

/** Whether a key has arrived, and so knows its colour. */
const routedAt = (timeline, progressValue, sampleKey) =>
  routeAt(timeline, progressValue, sampleKey) >= 1;

function sweepAt(timeline, progressValue, index) {
  const window = staggered(timeline.sweep, index);
  return easeInOutCubic(rangeProgress(progressValue, window.from, window.to));
}

/**
 * The journey a lookup is: outwards from the key and forwards round the ring to
 * the first server it meets.
 *
 * Drawn as a sampled path rather than a dashed circle, because the trail changes
 * radius as well as angle — it leaves the key where the key sits and arrives on
 * the band where the servers are, which is what makes the arrival land *on* a
 * server instead of near one.
 */
const TRAIL_SAMPLES = 28;

function RoutingTrail({ progress, sampleKey, model, timeline }) {
  const radiusAt = (fraction, latest) =>
    LAYOUT.radius - mix(insetAt(timeline, latest), 0, fraction);
  const pointFor = (fraction, latest) =>
    ringPoint({
      ...LAYOUT,
      radius: radiusAt(fraction, latest),
      position: sampleKey.position + sampleKey.travel * fraction,
    });

  const travelled = latest => routeAt(timeline, latest, sampleKey);

  const path = useTransform(progress, latest => {
    const done = travelled(latest);
    if (done <= 0) return '';
    const points = Array.from({ length: TRAIL_SAMPLES + 1 }, (unused, index) =>
      pointFor((done * index) / TRAIL_SAMPLES, latest)
    );
    return points
      .map((at, index) => `${index === 0 ? 'M' : 'L'} ${at.x.toFixed(2)} ${at.y.toFixed(2)}`)
      .join(' ');
  });

  // The trail is neutral, not the server's colour: while it is travelling, which
  // server it belongs to is precisely the thing not yet known.
  const trailOpacity = useTransform(progress, latest => {
    const done = travelled(latest);
    return done > 0 && done < 1 ? 0.55 : 0;
  });

  const headX = useTransform(progress, latest => pointFor(travelled(latest), latest).x);
  const headY = useTransform(progress, latest => pointFor(travelled(latest), latest).y);
  const headRadius = useTransform(progress, latest => {
    const done = travelled(latest);
    return done > 0 && done < 1 ? 4 : 0;
  });

  const server = model.servers.find(entry => entry.id === sampleKey.owner);
  const landing = ringPoint({
    ...LAYOUT,
    radius: LAYOUT.radius,
    position: sampleKey.position + sampleKey.travel,
  });
  const flare = useTransform(progress, latest => {
    const window = timeline.routes.get(sampleKey.name);
    if (!window) return 0;
    return pulseProgress(latest, window.to - 0.05, window.to, window.to, window.to + window.land);
  });
  const flareRadius = useTransform(flare, latest => 9 + latest * 13);

  return (
    <g data-layer={`route:${sampleKey.name}`}>
      <motion.path
        d={path}
        fill="none"
        stroke={theme.colors.ui.text.bright}
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ opacity: trailOpacity }}
      />
      <motion.circle cx={headX} cy={headY} r={headRadius} fill={theme.colors.ui.text.bright} />
      {/* The arrival, marked on the server that answers. Decoration, and excluded
          from the rest check: a scene should not have to wait for its own flash. */}
      <motion.circle
        data-ephemeral="true"
        cx={landing.x}
        cy={landing.y}
        r={flareRadius}
        fill="none"
        stroke={server.color}
        strokeWidth="2"
        style={{ opacity: flare }}
      />
    </g>
  );
}

/** Every key, as it is routed. Fills the column Scene 3 will use for shares. */
const READOUT = { x: LAYOUT.panel.x, y: 138, width: LAYOUT.panel.width };
const ROW = { height: 21, hashX: 96 };

function LookupRow({ progress, sampleKey, keyIndex, model, timeline, x, y, width }) {
  const window = timeline.routes.get(sampleKey.name);
  const server = model.servers.find(entry => entry.id === sampleKey.owner);

  /**
   * A row arrives with its key, not with its answer.
   *
   * Tying it to the lookup left the heading alone above an empty column for the
   * first half of the scene — a title with nothing under it, which reads as
   * something that failed to load rather than as something still to come. The
   * key and its hash are true the moment the key lands, so the row can say them
   * then and leave a space where the server will go.
   */
  const presence = useTransform(progress, latest => keyAt(timeline, latest, keyIndex));
  // The answer appears when the answer arrives, not when the question is asked.
  const answer = useTransform(progress, latest =>
    rangeProgress(latest, window.to, window.to + 0.3)
  );

  return (
    <motion.g data-layer={`readout:${sampleKey.name}`} style={{ opacity: presence }}>
      <text x={x} y={y} fill={theme.colors.ui.text.secondary} fontSize="11" letterSpacing="0.6">
        {sampleKey.name}
      </text>
      <text x={x + ROW.hashX} y={y} fill={theme.colors.ui.border} fontSize="11" letterSpacing="0.6">
        {toHashLabel(sampleKey.position)}
      </text>
      <motion.text
        x={x + width}
        y={y}
        textAnchor="end"
        fill={server.color}
        fontSize="11"
        letterSpacing="0.6"
        style={{ opacity: answer }}
      >
        {`\u2192 ${server.id}`}
      </motion.text>
    </motion.g>
  );
}

function LookupPanel({ progress, model, timeline, x, y, width }) {
  return (
    <g>
      {/* Chrome, not data: the column is spoken for from the first frame. */}
      <text
        data-layer="readout:heading"
        x={x}
        y={y}
        fill={theme.colors.ui.text.secondary}
        fontSize="11"
        letterSpacing="2.4"
      >
        WHERE EACH KEY LIVES
      </text>

      {model.keys.map((sampleKey, index) => (
        <LookupRow
          key={sampleKey.name}
          progress={progress}
          sampleKey={sampleKey}
          keyIndex={index}
          model={model}
          timeline={timeline}
          x={x}
          y={y + 28 + index * ROW.height}
          width={width}
        />
      ))}
    </g>
  );
}

/**
 * Scene 2: what it means for a key to belong to a server.
 *
 * Everything is a pure function of one beat value, so stepping back runs the scene
 * backwards without the scene knowing it is happening.
 */
export function LookupRing({ model, progress, timeline }) {
  const { centreX, centreY, radius } = LAYOUT;
  const colors = new Map(model.servers.map(server => [server.id, server.color]));
  const seam = ringPoint({ ...LAYOUT, radius, position: 0 });
  const seamOut = ringPoint({ ...LAYOUT, radius: radius + 24, position: 0 });

  const drawnAt = latest =>
    easeInOutCubic(rangeProgress(latest, timeline.ringIn.from, timeline.ringIn.to));
  /**
   * `pathLength="1"` puts the dash in the same units the ownership arcs use, so the
   * ring draws itself round from the seam by the device the rest of the scene is
   * made of rather than by a second one.
   *
   * The gap has to be the rest of the circle, not one whole one. `${drawn} 1` is a
   * pattern two units long on a path one unit around, so with the offset that puts
   * its start at the seam the visible dash is whatever is left of it — a quarter of
   * the ring, at every value of `drawn`. The gap is `1 - drawn`, which makes the
   * pattern exactly one turn and puts precisely one dash on the circle.
   */
  const ringDash = useTransform(progress, latest => {
    const drawn = drawnAt(latest);
    // Never a gap of nothing: a zero-length gap is a pattern renderers disagree on.
    return `${drawn} ${Math.max(1e-4, 1 - drawn)}`;
  });
  // The tick waits for the ring to come back round to it, so the seam is the thing
  // the ring was drawn from rather than a mark that happened to be there first.
  const seamOpacity = useTransform(
    progress,
    latest => 0.5 * clamp01((drawnAt(latest) - 0.8) / 0.2)
  );

  return (
    <g>
      <motion.circle
        data-layer="reference-ring"
        cx={centreX}
        cy={centreY}
        r={radius}
        pathLength="1"
        fill="none"
        stroke={theme.colors.primary.cyberBlue}
        strokeWidth="1.25"
        strokeDasharray={ringDash}
        strokeDashoffset={CIRCLE_START}
        opacity="0.3"
      />
      <motion.line
        data-layer="seam"
        x1={seam.x}
        y1={seam.y}
        x2={seamOut.x}
        y2={seamOut.y}
        stroke={theme.colors.primary.cyberBlue}
        strokeWidth="1.25"
        opacity={seamOpacity}
      />

      {model.arcs.map((arc, index) => (
        <OwnershipArc
          key={`arc-${arc.serverId}`}
          progress={progress}
          endsAt={arc.endsAt}
          color={colors.get(arc.serverId)}
          fullLength={arc.span}
          lengthFor={latest => sweepAt(timeline, latest, index) * arc.span}
          layer={`arc:${arc.serverId}`}
        />
      ))}

      {model.arcs.map((arc, index) => (
        <ServerMarker
          key={`marker-${arc.serverId}`}
          progress={progress}
          server={model.servers.find(server => server.id === arc.serverId)}
          position={arc.endsAt}
          presenceFor={latest => markerAt(timeline, latest, index)}
          layer={`marker:${arc.serverId}`}
        />
      ))}

      {model.keys.map(sampleKey => (
        <RoutingTrail
          key={`route-${sampleKey.name}`}
          progress={progress}
          sampleKey={sampleKey}
          model={model}
          timeline={timeline}
        />
      ))}

      {model.keys.map((sampleKey, index) => (
        <KeyMark
          key={`key-${sampleKey.name}`}
          progress={progress}
          sampleKey={sampleKey}
          // A key has no colour until the lookup has answered. Colouring it before
          // would be showing the answer and then demonstrating the question.
          colorFor={latest =>
            routedAt(timeline, latest, sampleKey)
              ? colors.get(sampleKey.owner)
              : theme.colors.ui.text.secondary
          }
          presenceFor={latest => keyAt(timeline, latest, index)}
          labelFor={latest => keyAt(timeline, latest, index) * 0.34}
          insetFor={latest => insetAt(timeline, latest)}
          layer={`key:${sampleKey.name}`}
        />
      ))}

      <LookupPanel progress={progress} model={model} timeline={timeline} {...READOUT} />

      <SceneAnnotation
        progress={progress}
        {...LAYOUT.annotation}
        textFor={latest => annotationAt(timeline, latest)}
        presenceFor={latest => annotationPresenceAt(timeline, latest)}
      />
    </g>
  );
}

export default LookupRing;
