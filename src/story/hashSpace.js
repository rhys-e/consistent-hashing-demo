import theme from '../themes';

export const HASH_SPACE_MAX = 0xffffffff;

/**
 * Labels are derived from the position rather than authored alongside it, so the
 * hex shown to the viewer is always the position actually being drawn.
 */
export function toHashLabel(position) {
  const value = Math.round(position * HASH_SPACE_MAX);
  return `0x${value.toString(16).toUpperCase().padStart(8, '0')}`;
}

export function slugify(value) {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

/**
 * The same three keys carry across the opening scenes so the viewer can track
 * individual positions while the hash space changes shape around them.
 */
export const SAMPLE_KEYS = [
  { keyName: 'user:1842', position: 0.183, color: theme.colors.primary.tealHologram },
  { keyName: 'image:91', position: 0.53, color: theme.colors.primary.holographicPink },
  { keyName: 'session:abc', position: 0.814, color: theme.colors.primary.virtualGold },
];

/**
 * `side` alternates so neighbouring annotations cannot collide. Positive is above
 * the line while the hash space is straight and outside it once wrapped, which is
 * the same fact expressed in the projection's normal direction.
 */
export function decorateSampleKeys(sampleKeys = SAMPLE_KEYS) {
  return sampleKeys.map((sampleKey, index) => ({
    ...sampleKey,
    hashLabel: toHashLabel(sampleKey.position),
    slug: slugify(sampleKey.keyName),
    side: index % 2 === 0 ? 1 : -1,
  }));
}
