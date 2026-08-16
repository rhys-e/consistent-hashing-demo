import { hashPosition } from './ringModel';
import { DEPARTING_SERVER_ID, REMOVAL_SERVERS } from './topology';

/**
 * Scene 4's positions, placed rather than hashed.
 *
 * A hash throws thirty points at the ring and thirteen of the thirty neighbouring
 * pairs land closer together than a dot is wide, two of them a pixel apart. That
 * is not bad luck — for thirty random points it is the expected outcome, and no
 * choice of names or key format gets the collisions below seven. So the picture
 * cannot be fixed by re-rolling it.
 *
 * It can be fixed by not rolling it. These positions are chosen, and the honesty of
 * that rests on one distinction: what the scene *claims* is that a server holding
 * ten positions has its failure absorbed by several neighbours rather than one, and
 * that claim is a fact about counting, not about this particular sample. Nothing on
 * screen is asserted about where any individual position fell. The names and hash
 * values are already gone from the ring by the time the split runs, precisely
 * because the scene has stopped asking the viewer to look at any one of them.
 *
 * The rule kept in exchange is that the ring must not look *designed*. Perfectly
 * spaced positions would be a different lie and a worse one, because evenness is
 * the thing consistent hashing has to work for. So:
 *
 * - The three positions each server starts with are the real hashed ones. Scene 4
 *   opens on Scene 3's ring, and that frame is untouched.
 * - The twenty-seven added are spaced with a floor and then jittered, so gaps vary
 *   by about three to one and nothing is regular enough to count.
 * - The resulting shares are deliberately *not* a third each. They land near 30-35%,
 *   which is what a good hash gets you and what the panel beside the ring reports.
 */

/**
 * How many positions each server holds once the split has run.
 *
 * Under a hash this was not a free choice: ten was the only count from one to
 * twelve whose ring started anywhere near even, so every airier option was ruled
 * out by the balance rather than by the argument. Placing the positions removes
 * that constraint — evenness is built rather than drawn for — and six is then
 * plainly better. Eighteen dots rather than thirty, a minimum gap of three dot
 * widths rather than two, and the argument comes out *stronger*: the bigger
 * survivor takes exactly half of what was lost, in six pieces.
 *
 * It must stay in step with `SPREAD_LEVELS`, which is what the scene actually
 * builds; this is the count the table is generated for.
 */
export const POSITIONS_EACH = 6;

/** Enough that two full-size dots clear each other with a little daylight. */
const DEFAULT_MIN_GAP = 19;
/**
 * How far a position may wander from its slot, as a fraction of the room it has.
 *
 * This is the whole judgement. Zero is a metronome, which would be a worse lie than
 * the clumping it replaces — evenness is the thing consistent hashing has to work
 * for, and a ring that arrives evenly spaced has palmed the card. One spends every
 * pixel of slack and comes closest to looking hashed. `SCATTER` holds the levels
 * that were compared.
 */
export const SCATTER = { tidy: 0.5, natural: 0.8, loose: 1 };

/**
 * A small deterministic generator, so the ring is the same on every render and in
 * every test without anything having to be stored.
 *
 * `Math.random` would make the scene unreproducible and the rest guard meaningless;
 * a hash of the slot's own name is reproducible, costs nothing, and is the same
 * function the rest of the model already uses.
 */
const wobble = (serverId, index) => hashPosition(`jitter:${serverId}:${index}`) * 2 - 1;

const wrap = value => ((value % 1) + 1) % 1;

/**
 * Which server takes each slot, in ring order.
 *
 * This matters more than it looks. A repeating cycle — `A B C A B C` — puts every
 * one of A's ranges immediately before B, so when A fails B inherits the lot and
 * the scene demonstrates the exact opposite of its argument, by construction rather
 * than by accident. The order therefore has to satisfy two things at once: the
 * departing server's positions must be followed by each survivor about equally
 * often, and the sequence must not look like a pattern.
 *
 * So it is shuffled first and repaired second. A deterministic shuffle gives the
 * irregularity; swapping pairs until the successor counts balance gives the claim.
 * Repairing after shuffling keeps both, where constructing a balanced sequence
 * directly would give a visible period.
 */
function assignmentFor(servers, perServer, removedId) {
  const total = servers.length * perServer;
  const order = [];
  servers.forEach((server, index) => {
    for (let n = 0; n < perServer; n++) order.push(index);
  });

  // A shuffle driven by the same hash the rest of the model uses, so the ring is
  // identical on every render and in every test without anything being stored.
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(hashPosition(`shuffle:${perServer}:${i}`) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const goneIndex = servers.findIndex(server => server.id === removedId);
  const survivors = servers.map((server, index) => index).filter(index => index !== goneIndex);
  const successorGap = () => {
    const counts = new Map(survivors.map(index => [index, 0]));
    order.forEach((who, index) => {
      if (who !== goneIndex) return;
      // A range ends at its own position, so what a departing position gives up
      // goes to whoever holds the next position round the ring.
      let step = 1;
      while (order[(index + step) % total] === goneIndex) step++;
      const next = order[(index + step) % total];
      counts.set(next, counts.get(next) + 1);
    });
    return counts;
  };

  // Swap the two positions that most improve the balance, until it is even or no
  // swap helps. Small and finite: there are only ever a few dozen slots.
  for (let pass = 0; pass < total; pass++) {
    const counts = successorGap();
    const values = [...counts.values()];
    if (Math.max(...values) - Math.min(...values) <= 1) break;

    let improved = false;
    for (let i = 0; i < total && !improved; i++) {
      for (let j = i + 1; j < total; j++) {
        if (order[i] === order[j]) continue;
        [order[i], order[j]] = [order[j], order[i]];
        const after = [...successorGap().values()];
        if (Math.max(...after) - Math.min(...after) < Math.max(...values) - Math.min(...values)) {
          improved = true;
          break;
        }
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    if (!improved) break;
  }

  return order;
}

/**
 * Thirty positions: the three real ones, and twenty-seven placed between them.
 *
 * Slots are laid out evenly across each arc between two fixed positions, then each
 * is nudged by up to `JITTER` of the space it has to itself. The floor is what the
 * whole exercise is for, so the nudge is bounded by it rather than clamped after.
 */
function placeRing({
  servers = REMOVAL_SERVERS,
  perServer = POSITIONS_EACH,
  removedId = DEPARTING_SERVER_ID,
  jitter = SCATTER.loose,
  minGapPx = DEFAULT_MIN_GAP,
} = {}) {
  const minGap = minGapPx / (2 * Math.PI * 232);
  const fixed = servers.map(server => ({
    serverId: server.id,
    index: 0,
    position: hashPosition(`${server.id}#0`),
  }));
  const anchors = [...fixed].sort((left, right) => left.position - right.position);

  const assignment = assignmentFor(servers, perServer, removedId);
  const added = perServer * servers.length - servers.length;
  const slots = [];

  anchors.forEach((anchor, arcIndex) => {
    const next = anchors[(arcIndex + 1) % anchors.length];
    const span =
      arcIndex === anchors.length - 1
        ? 1 - anchor.position + next.position
        : next.position - anchor.position;
    // Each arc takes a share of the new positions in proportion to its length, so a
    // wide stretch of ring does not stay empty while a narrow one is packed.
    const take = Math.round(added * span);
    const step = span / (take + 1);

    for (let n = 1; n <= take; n++) {
      const at = anchor.position + n * step;
      const room = Math.max(0, (step - minGap) / 2);
      slots.push({ arcIndex, n, position: wrap(at), room });
    }
  });

  // Rounding per arc can land a position or two either side of the target.
  while (slots.length > added) slots.pop();
  while (slots.length < added) {
    const widest = slots.reduce((most, slot) => (slot.room > most.room ? slot : most));
    slots.push({ ...widest, position: wrap(widest.position + widest.room), room: 0 });
  }

  const ordered = [...slots].sort((left, right) => left.position - right.position);
  const counts = new Map(servers.map(server => [server.id, 1]));
  const placed = new Map(fixed.map(one => [`${one.serverId}#0`, one.position]));

  // The three anchors already hold one position each, so the assignment is walked
  // past whichever server is already spoken for at that point in the ring.
  const remaining = [...assignment];
  fixed.forEach(one => {
    const index = servers.findIndex(server => server.id === one.serverId);
    remaining.splice(remaining.indexOf(index), 1);
  });

  ordered.forEach((slot, index) => {
    const server = servers[remaining[index % remaining.length]];
    const nth = counts.get(server.id);
    counts.set(server.id, nth + 1);
    placed.set(
      `${server.id}#${nth}`,
      wrap(slot.position + wobble(server.id, nth) * slot.room * jitter)
    );
  });

  return placed;
}

/**
 * Where a server's nth position sits. Falls back to the hash for anything the table
 * does not cover, so the one-position level — which is Scene 3's ring, and the
 * frame Scene 4 opens on — is untouched by any of this.
 */
export function placedPositions(options) {
  const table = placeRing(options);
  return (serverId, index) =>
    table.get(`${serverId}#${index}`) ?? hashPosition(`${serverId}#${index}`);
}

export const placedPositionFor = placedPositions();

export const PLACED_SPREAD = {
  servers: REMOVAL_SERVERS,
  removedId: DEPARTING_SERVER_ID,
  positionFor: placedPositionFor,
};
