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
import { toHashLabel } from '../../story/hashSpace';
import { buildLookupModel } from '../../story/topology';
import { LAYOUT, KEY_INSET, KeyMark, OwnershipArc, ServerMarker } from './RingParts';
import SceneAnnotation from './SceneAnnotation';

/**
 * The scene as durations laid end to end.
 *
 * The order is the argument. Keys land on the ring as Scene 1 left them; servers
 * arrive on the same ring, and the keys step inside to make room, because the band
 * is about to stop being a number line and start being ownership. One key is then
 * routed slowly enough to be read as a rule, two more confirm it is a rule and not
 * a special case, and the rest follow at once. Only then do the arcs sweep — so a
 * range arrives as *the set of positions that route to a server*, which is the one
 * step the story has never shown and every later scene assumes.
 */
const OPENING = 0.5;
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

/**
 * The three keys routed one at a time, one per server, so every server is named by
 * the rule before the rule is generalised.
 *
 * `user:1842` goes first because the opening scene introduced it: the viewer has
 * already watched this exact key take this exact position, so the only new thing
 * in the first lookup is the lookup.
 */
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
  // Mapped over `TAUGHT`, not filtered by it: the model is sorted by position, so
  // filtering would silently teach whichever of the three happens to sit nearest
  // the seam rather than the one chosen for the job.
  const taught = TAUGHT.map(name => model.keys.find(key => key.name === name));
  const rest = model.keys.filter(key => !TAUGHT.includes(key.name));

  const opening = timeline.rest(OPENING, 'Empty ring');

  const keys = group(timeline.move(KEYS.move), model.keys.length, KEYS.move * 0.4);
  timeline.rest(REST, 'Keys placed');

  // The servers arriving and the keys standing aside are one movement, because
  // they are one fact: the band now belongs to whoever owns it.
  timeline.annotate('Servers take positions on the same ring, hashed the same way.');
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
  timeline.annotate('A key belongs to the first server clockwise from it. That is the whole rule.');
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

  // The jump the whole story rests on: from eleven keys to every position between
  // them. Said here because it is the one claim the picture cannot make on its own
  // — the positions that are not drawn are exactly the ones being generalised to.
  timeline.annotate(
    'Every position in between routes the same way. That span is what a server owns.'
  );
  const sweep = group(
    timeline.move(SWEEP.each + SWEEP.stagger * (servers - 1)),
    servers,
    SWEEP.each
  );
  const settled = timeline.rest(READING_REST, 'Ranges claimed');

  return {
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

/**
 * The lookups, written down as they happen.
 *
 * The column exists because Scene 3 puts its share panel there, and a scene that
 * leaves it empty makes the two slides look like different compositions. But it
 * earns its place rather than merely filling the space: the ring shows a key
 * *arriving somewhere*, and this says what that means as a fact — this key, this
 * hash, this server. It is the same hexadecimal readout the opening scene used to
 * turn a key into a position, now used to turn a position into a server.
 *
 * Only the three taught lookups get a line. The other eight are a count, because
 * eleven rows would be a table and the point is not the table.
 */
const ROW = { height: 30, hashX: 104 };

function LookupRow({ progress, sampleKey, model, timeline, x, y, width }) {
  const window = timeline.routes.get(sampleKey.name);
  const server = model.servers.find(entry => entry.id === sampleKey.owner);

  const presence = useTransform(progress, latest =>
    rangeProgress(latest, window.from, window.from + 0.4)
  );
  // The answer appears when the answer arrives, not when the question is asked.
  const answer = useTransform(progress, latest =>
    rangeProgress(latest, window.to, window.to + 0.3)
  );

  return (
    <motion.g data-layer={`readout:${sampleKey.name}`} style={{ opacity: presence }}>
      <text x={x} y={y} fill={theme.colors.ui.text.secondary} fontSize="12" letterSpacing="0.6">
        {sampleKey.name}
      </text>
      <text x={x + ROW.hashX} y={y} fill={theme.colors.ui.border} fontSize="12" letterSpacing="0.6">
        {toHashLabel(sampleKey.position)}
      </text>
      <motion.text
        x={x + width}
        y={y}
        textAnchor="end"
        fill={server.color}
        fontSize="12"
        letterSpacing="0.6"
        style={{ opacity: answer }}
      >
        {`\u2192 ${server.id}`}
      </motion.text>
    </motion.g>
  );
}

function LookupPanel({ progress, model, timeline, x, y, width }) {
  const taught = TAUGHT.map(name => model.keys.find(key => key.name === name));
  const others = model.keys.length - taught.length;

  const heading = useTransform(progress, latest =>
    rangeProgress(latest, timeline.arrive.from, timeline.arrive.to)
  );
  // Fading *inside* the movement rather than after it: the rest that follows is a
  // step, and a step has to be a frame in which nothing is still arriving.
  const summary = useTransform(progress, latest =>
    rangeProgress(latest, timeline.remainder.to - 0.5, timeline.remainder.to)
  );

  return (
    <g>
      <motion.text
        data-layer="readout:heading"
        x={x}
        y={y}
        fill={theme.colors.ui.text.secondary}
        fontSize="11"
        letterSpacing="2.4"
        style={{ opacity: heading }}
      >
        WHERE EACH KEY LIVES
      </motion.text>

      {taught.map((sampleKey, index) => (
        <LookupRow
          key={sampleKey.name}
          progress={progress}
          sampleKey={sampleKey}
          model={model}
          timeline={timeline}
          x={x}
          y={y + 32 + index * ROW.height}
          width={width}
        />
      ))}

      <motion.text
        data-layer="readout:summary"
        x={x}
        y={y + 42 + taught.length * ROW.height}
        fill={theme.colors.ui.border}
        fontSize="12"
        letterSpacing="0.6"
        style={{ opacity: summary }}
      >
        {`and ${others} more, the same way`}
      </motion.text>
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

      <LookupPanel progress={progress} model={model} timeline={timeline} {...LAYOUT.panel} />

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
