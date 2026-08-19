import React from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react';
import theme from '../../themes';
import { clamp01, easeOutCubic, mix } from '../../story/easing';
import { hashPosition } from '../../story/ringModel';
import { projectOffset } from '../../story/projection';

/**
 * Keys arriving on the ring and going again, once the ring exists.
 *
 * The opening scene ends on three keys sitting still on a closed ring, which is a
 * true picture of where three keys are and a poor one of what a hash ring is. A
 * cache is not three values at rest — it is a stream of them, and every one lands
 * somewhere by the same rule that put those three where they are. This says that
 * in the only register a still frame cannot: things keep arriving.
 *
 * Three things make it decoration rather than content, and all three matter:
 *
 * - **It is marked `data-ephemeral`**, so the rest guard steps straight over it. A
 *   step lands where nothing is moving, and this never stops moving, so the two
 *   would be irreconcilable otherwise. It is the same exemption the arrival glow
 *   and the seam pulse take.
 * - **It carries no information.** No names, no hash values, nothing to read or
 *   miss. The three keys the scene actually made claims about are still the only
 *   things labelled, and stay the brighter marks.
 * - **It runs on its own clock**, not on the scene's beat, so it neither has beats
 *   of its own nor stops when the scene does. That is what lets it carry on while
 *   the slide is being carried off, which is the whole point: a ring that goes
 *   still the moment you look away is a diagram, and one that does not is a thing
 *   that was running before you arrived.
 */

/**
 * More keys in the pool than are ever on screen at once.
 *
 * Concurrency is `count * life`, so eighteen and a fifth is about three or four
 * visible — enough to read as traffic and few enough that the three named keys
 * are still obviously the subject. The pool is larger so a full turn takes long
 * enough that nobody sees the same key land twice in the same place.
 */
export const TRAFFIC = {
  /**
   * Fewer keys, each on the ring for longer.
   *
   * How many are on screen at once is `count * life`, so the two move together: to
   * let one linger without crowding the ring, fewer of them have to arrive. Twelve
   * at a shade under a third of a turn each is the same three or four at a time
   * that eighteen at a fifth gave, with each one there twice as long.
   *
   * Fewer distinct keys pass through before the deck moves on, which is the right
   * trade — the layer is saying that keys keep arriving, not how many.
   */
  count: 12,
  /**
   * One turn of the whole pool.
   *
   * Slower than it wants to be, twice over. At fifteen seconds a key was on the
   * ring for three and the eye read the layer as a shimmer rather than as things
   * arriving — the *rate* was what you noticed, which is a texture and not a fact.
   * Twenty gave each one four seconds and was still brisk enough to feel like
   * activity rather than like a ring being used.
   *
   * At twenty-eight a key has five and a half seconds and they land about a second
   * and a half apart, which is slow enough that watching one is a choice rather
   * than a reflex. Nothing else on the slide is asking for attention by then.
   */
  cycleSeconds: 28,
  /** How much of a turn one key is on screen for. */
  life: 0.29,
  /** How far outside the ring a key starts, in stage units. */
  fallFrom: 54,
  /**
   * A little quieter than the named keys, and no quieter than that.
   *
   * Half opacity and no name made them scenery: you could watch the ring and not
   * notice anything was landing on it, which is the one thing this exists to show.
   * They are keys, so they are named and legible, and the difference between them
   * and the three the scene made claims about is that those three carry a hash
   * value and a stem and these carry a name.
   */
  peakOpacity: 0.82,
  radius: 3.8,
  /**
   * Names sit *inside* the ring, and the sign here is load-bearing.
   *
   * A positive offset is outward, and outward is where there is no room: the closed
   * ring has a radius of about 263 on a stage 620 deep, so it clears the top and
   * bottom by roughly forty and a name at those angles ran off the canvas entirely.
   * Inside there is 263 units of nothing.
   *
   * Far enough in to clear its own mark and, more to the point, the mark of
   * whatever else is on the ring nearby — at half this a name could sit against a
   * neighbouring key and read as belonging to it.
   */
  labelInset: -62,
  labelSize: 11,
};

/**
 * Names for the traffic, in the shapes the story's own keys take.
 *
 * The point of naming them at all is that an unnamed dot is a particle and a named
 * one is a key. What arrives has to look like the kind of thing the scene has just
 * spent a minute hashing, or the ring is being decorated rather than used.
 */
const NAME_SHAPES = [
  value => `user:${1000 + (value % 9000)}`,
  value => `image:${value % 400}`,
  value => `session:${(value % 46656).toString(36).padStart(3, '0')}`,
  value => `cart:${value % 900}`,
  value => `post:${1000 + (value % 9000)}`,
];

/**
 * Where the pool lands, and in what order.
 *
 * Two things had to be true at once and a plain hash gave neither. Taking eighteen
 * raw hash positions put the closest pair nine ten-thousandths of the ring apart —
 * about a pixel and a half — so two keys arrived on top of each other. And keys
 * that arrive one after another are neighbours in the pool, so with raw positions
 * they had no relationship at all, while with evenly spaced ones they would march
 * round the ring in order like a clock hand.
 *
 * So: evenly spaced slots with a bounded wobble, which guarantees the separation,
 * and then handed out on a stride co-prime to the count, which puts consecutive
 * arrivals almost half a ring apart. Scattered in space and scattered in time, and
 * neither by accident.
 *
 * This is decoration and makes no claim about how a hash distributes anything —
 * the scene has spent a minute doing that with three real positions. What it has
 * to be is legible.
 */
const STRIDE = 7;
const SLOT_WOBBLE = 0.3;

const FLIGHT = Array.from({ length: TRAFFIC.count }, (unused, index) => {
  const slot = (index * STRIDE) % TRAFFIC.count;
  const wobble = (hashPosition(`traffic-wobble:${index}`) * 2 - 1) * SLOT_WOBBLE;
  const seed = Math.floor(hashPosition(`traffic-name:${index}`) * 1e9);

  return {
    position: (slot + 0.5 + wobble) / TRAFFIC.count,
    name: NAME_SHAPES[index % NAME_SHAPES.length](seed),
    color: [
      theme.colors.primary.tealHologram,
      theme.colors.primary.holographicPink,
      theme.colors.primary.virtualGold,
    ][index % 3],
  };
});

const wrap = value => ((value % 1) + 1) % 1;

/** Enough turns that the clock outlives any sitting anybody will do. */
const TURNS = 1000;

/**
 * How many keys are on the ring after so many turns of the clock.
 *
 * Exported because it is the shape of the layer and nothing else can see it: the
 * clock is wall time, so a test can pin a beat but cannot pin this. Arithmetic is
 * the only place the ramp is observable.
 */
export function keysAliveAt(turns) {
  let alive = 0;

  for (let index = 0; index < TRAFFIC.count; index += 1) {
    const offset = index / TRAFFIC.count;
    if (turns < offset) continue;
    if (wrap(turns - offset) / TRAFFIC.life <= 1) alive += 1;
  }

  return alive;
}

/**
 * Fades up, holds, fades out — over its own life rather than the scene's.
 *
 * Weighted towards the hold. A key that spends as long arriving and leaving as it
 * does being there reads as a pulse, and the point is that it *landed* — so it
 * comes up quickly, sits for most of its life, and takes its time going.
 */
function lifeOpacity(phase) {
  if (phase < 0.15) return phase / 0.15;
  if (phase > 0.72) return clamp01((1 - phase) / 0.28);
  return 1;
}

function TrafficKey({ progress, drift, railStateFor, presenceFor, flight, offset }) {
  /**
   * A key has not started until the clock has come round to it, and the clock does
   * not wrap — so on the first turn they arrive one at a time, about a second and a
   * bit apart, building to the three or four the layer settles at.
   *
   * Without this every key whose window happened to contain the starting instant
   * appeared together, so the moment the layer switched on, three keys landed at
   * once. That is the same information delivered as an event rather than as a
   * stream, and a stream is the entire point.
   */
  const startedBy = latest => latest >= offset;
  const phaseOf = latest => wrap(latest - offset) / TRAFFIC.life;

  const pointAt = ([beat, latest]) => {
    const phase = phaseOf(latest);
    if (phase > 1 || !startedBy(latest)) return { x: -100, y: -100 };

    // Falling in along the ring's own normal, so a key arrives from outside the
    // ring rather than from the side of the screen. Straight in, and stopping
    // dead, because it is landing rather than being thrown.
    // Inward, because outward is off the canvas at the top and bottom of the ring.
    const fall = mix(-TRAFFIC.fallFrom, 0, easeOutCubic(clamp01(phase / 0.34)));
    return projectOffset({
      position: flight.position,
      ...railStateFor(beat),
      offset: fall,
    });
  };

  const x = useTransform([progress, drift], values => pointAt(values).x);
  const y = useTransform([progress, drift], values => pointAt(values).y);

  /**
   * The name waits inside the ring rather than travelling in with the key.
   *
   * A label riding the fall is a second thing moving on a mark small enough to be
   * one thing, and at the top and bottom of the ring it would start off the stage.
   * So the key arrives, and then it has a name — which is also the order the scene
   * has just taught: a position first, and what is at it second.
   */
  const labelPoint = ([beat]) =>
    projectOffset({
      position: flight.position,
      ...railStateFor(beat),
      offset: TRAFFIC.labelInset,
    });
  const labelX = useTransform([progress, drift], values => labelPoint(values).x);
  const labelY = useTransform([progress, drift], values => labelPoint(values).y);
  const labelOpacity = useTransform([progress, drift], ([beat, latest]) => {
    const phase = phaseOf(latest);
    if (phase > 1 || !startedBy(latest)) return 0;
    // Only once it has landed, and gone before the mark is. Held at the same
    // strength as its own mark, because they are one thing.
    return (
      clamp01((phase - 0.3) / 0.2) * lifeOpacity(phase) * TRAFFIC.peakOpacity * presenceFor(beat)
    );
  });
  const opacity = useTransform([progress, drift], ([beat, latest]) => {
    const phase = phaseOf(latest);
    if (phase > 1 || !startedBy(latest)) return 0;
    return lifeOpacity(phase) * TRAFFIC.peakOpacity * presenceFor(beat);
  });
  // A trace of the halo the named keys have, so it reads as the same kind of mark
  // seen from further away rather than as a different kind of dot.
  const haloOpacity = useTransform(opacity, latest => latest * 0.28);

  return (
    <g>
      <motion.circle
        data-layer="traffic-halo"
        cx={x}
        cy={y}
        r={TRAFFIC.radius * 3}
        fill={flight.color}
        opacity={haloOpacity}
      />
      <motion.circle
        data-layer="traffic-mark"
        cx={x}
        cy={y}
        r={TRAFFIC.radius}
        fill={flight.color}
        opacity={opacity}
      />
      <motion.text
        data-layer="traffic-name"
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={flight.color}
        fontSize={TRAFFIC.labelSize}
        letterSpacing="0.6"
        opacity={labelOpacity}
      >
        {flight.name}
      </motion.text>
    </g>
  );
}

/**
 * `presenceFor` is the scene's own answer to "is there a ring yet", so the
 * traffic cannot start before there is somewhere for it to land, and cannot be
 * left over from a scene that has been rewound.
 */
export function RingTraffic({ progress, railStateFor, presenceFor, pinnedTurns }) {
  /**
   * The clock, in turns of the whole pool.
   *
   * It can be held, and has to be able to be. Everything else in the story is a
   * pure function of a beat, so a frame can be pinned and looked at; this runs on
   * wall time, so a pinned beat reaches none of it — the layer starts empty and
   * fills over the first few seconds, which means a pinned frame would show an
   * empty ring and a review story would have nothing in it. Holding the clock is
   * how a still frame of a moving thing gets looked at.
   */
  const held = pinnedTurns !== null && pinnedTurns !== undefined;
  const drift = useMotionValue(held ? pinnedTurns : 0);
  // Nothing is rendered and no transform exists until the ring has closed once.
  // The loop then runs for as long as the scene is mounted, which is what carries
  // it through the slide being taken off the screen.
  const [running, setRunning] = React.useState(() => presenceFor(progress.get()) > 0);

  /**
   * Any presence at all is enough to start rendering — the opacity is what fades it
   * up, and waiting for full presence made the first keys arrive already landed.
   */
  useMotionValueEvent(progress, 'change', latest => {
    const present = presenceFor(latest) > 0;
    if (present !== running) setRunning(present);
  });

  React.useEffect(() => {
    if (held) {
      drift.set(pinnedTurns);
      return undefined;
    }
    if (!running) return undefined;

    /**
     * The clock is put back to zero *here*, and that placement is the whole of it.
     *
     * It was reset where the layer is switched off, which is a motion value
     * listener — and a listener runs during the frame, while the previous animation
     * is still going. `animate` drives its value from its own start time and origin,
     * so the very next frame wrote the clock straight back to where it had been, and
     * by the time React committed and the cleanup stopped it the zero was long gone.
     * The next run then picked up mid-cycle, which is a couple of keys already half
     * faded as the first thing a viewer sees.
     *
     * An effect body runs *after* the previous effect's cleanup, so by this line the
     * old animation is stopped and nothing can overwrite the value. Setting it as the
     * layer starts is also the more honest place for it: the clock belongs to the
     * run, not to the switch.
     */
    drift.set(0);

    /**
     * A clock that counts turns rather than one that resets every turn.
     *
     * `repeat: Infinity` would send it back to zero each cycle, and then there is
     * no way to ask "has this key had its first turn yet" — which is what staggers
     * the entries. Counting up instead makes the wrap arithmetic the same and the
     * first turn distinguishable. `TURNS` is hours of running at this speed.
     */
    const controls = animate(drift, TURNS, {
      duration: TRAFFIC.cycleSeconds * TURNS,
      ease: 'linear',
    });
    return () => controls.stop();
  }, [drift, held, pinnedTurns, running]);

  if (!running && !held) return null;

  return (
    <g data-ephemeral="true" data-layer="ring-traffic">
      {FLIGHT.map((flight, index) => (
        <TrafficKey
          key={flight.position}
          progress={progress}
          drift={drift}
          railStateFor={railStateFor}
          presenceFor={presenceFor}
          flight={flight}
          offset={index / TRAFFIC.count}
        />
      ))}
    </g>
  );
}

export default RingTraffic;
