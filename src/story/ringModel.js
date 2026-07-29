/**
 * The ring as data: where positions fall, who owns what, and what moves when the
 * topology changes. No React and no SVG, because the plan's central claim — that
 * adding a server only remaps the ranges it takes over — should be asserted in a
 * test rather than eyeballed in an animation.
 *
 * Positions are normalised to 0..1 over the hash space, matching `projection`.
 */

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

/**
 * A synchronous 32-bit hash. The app hashes through `crypto.subtle`, which is
 * async and therefore unusable from a pure model; for placing sample vnodes all
 * that matters is that the spread is even and the result is reproducible.
 *
 * FNV-1a alone is not even enough here. Vnode keys differ only in a short numeric
 * suffix, and its unmixed output clusters badly for those, which would make the
 * ring look lumpy for reasons that have nothing to do with consistent hashing.
 * The avalanche step is what makes an argument about distribution honest.
 */
export function hashPosition(key) {
  let hash = FNV_OFFSET;

  for (let index = 0; index < key.length; index++) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;

  return (hash >>> 0) / 0x100000000;
}

export function buildVirtualNodes({ servers, vnodesPerServer }) {
  const vnodes = [];

  servers.forEach(server => {
    for (let index = 0; index < vnodesPerServer; index++) {
      vnodes.push({
        serverId: server.id,
        vnodeId: `${server.id}#${index}`,
        position: hashPosition(`${server.id}#${index}`),
      });
    }
  });

  return vnodes.sort((left, right) => left.position - right.position);
}

/**
 * A key belongs to the first vnode clockwise from it, so each vnode owns the
 * range that ends at its own position. The range that ends at the first vnode
 * begins at the last one and crosses the seam, and is returned as two ranges so
 * that every range can be drawn and measured without a special case.
 */
export function buildRanges(vnodes) {
  if (vnodes.length === 0) return [];

  const ranges = [];
  const first = vnodes[0];
  const last = vnodes[vnodes.length - 1];

  ranges.push({ serverId: first.serverId, vnodeId: first.vnodeId, from: 0, to: first.position });

  for (let index = 1; index < vnodes.length; index++) {
    const vnode = vnodes[index];
    ranges.push({
      serverId: vnode.serverId,
      vnodeId: vnode.vnodeId,
      from: vnodes[index - 1].position,
      to: vnode.position,
    });
  }

  ranges.push({ serverId: first.serverId, vnodeId: first.vnodeId, from: last.position, to: 1 });

  return ranges.filter(range => range.to > range.from);
}

export function buildTopology({ servers, vnodesPerServer }) {
  const vnodes = buildVirtualNodes({ servers, vnodesPerServer });

  return { servers, vnodesPerServer, vnodes, ranges: buildRanges(vnodes) };
}

/** Share of the hash space each server owns, which is the honest full-scale statement. */
export function ownershipShares(topology) {
  const byServer = new Map(
    topology.servers.map(server => [server.id, { ...server, share: 0, vnodeCount: 0 }])
  );

  topology.ranges.forEach(range => {
    const entry = byServer.get(range.serverId);
    if (entry) entry.share += range.to - range.from;
  });

  topology.vnodes.forEach(vnode => {
    const entry = byServer.get(vnode.serverId);
    if (entry) entry.vnodeCount += 1;
  });

  return topology.servers.map(server => byServer.get(server.id));
}

/** The server that owns a position: the first one clockwise, wrapping at the seam. */
export function resolveOwner(topology, position) {
  const { vnodes } = topology;
  if (vnodes.length === 0) return null;

  let low = 0;
  let high = vnodes.length - 1;

  while (low < high) {
    const middle = (low + high) >> 1;
    if (vnodes[middle].position < position) low = middle + 1;
    else high = middle;
  }

  return vnodes[low].position >= position ? vnodes[low] : vnodes[0];
}

/**
 * The ranges whose owner differs between two topologies, and what fraction of the
 * hash space they add up to.
 *
 * Comparing at every boundary of both topologies rather than sampling means the
 * fraction is exact, which matters because it is the number the story quotes.
 */
export function remapDelta(before, after) {
  const boundaries = new Set([0, 1]);
  before.vnodes.forEach(vnode => boundaries.add(vnode.position));
  after.vnodes.forEach(vnode => boundaries.add(vnode.position));

  const ordered = [...boundaries].sort((left, right) => left - right);
  const ranges = [];
  let fraction = 0;

  for (let index = 0; index < ordered.length - 1; index++) {
    const from = ordered[index];
    const to = ordered[index + 1];
    if (to <= from) continue;

    const midpoint = (from + to) / 2;
    const owned = resolveOwner(before, midpoint);
    const owns = resolveOwner(after, midpoint);
    if (owned.serverId === owns.serverId) continue;

    const previous = ranges[ranges.length - 1];
    if (previous && previous.to === from && previous.serverId === owns.serverId) {
      previous.to = to;
    } else {
      ranges.push({ from, to, serverId: owns.serverId, fromServerId: owned.serverId });
    }

    fraction += to - from;
  }

  return { ranges, fraction };
}
