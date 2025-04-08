import { useRef, useEffect, useState } from 'react';
import { hashString } from '../utils/hashString';
import seedrandom from 'seedrandom';

async function generateRequest(prng) {
  // Generate a random key using the seeded PRNG
  const randomStr = Array.from({ length: 4 }, () => {
    const chars = '0123456789';
    return chars.charAt(Math.floor(prng() * chars.length));
  }).join('');

  const key = `user_id_${randomStr}`;
  const { normalised } = await hashString(key);
  return { key, position: normalised };
}

async function populateHashCache(hashCache, cacheSize, prng) {
  const promises = Array.from({ length: cacheSize - hashCache.length }, () =>
    generateRequest(prng)
  );
  const results = await Promise.allSettled(promises);
  const fulfilled = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  if (hashCache.length < cacheSize) {
    hashCache = [...hashCache, ...fulfilled];
  }
  hashCache.length = cacheSize;
  return hashCache;
}

export function useHashCache({ cacheSize, seedNumber = 1 }) {
  const [hashCache, setHashCache] = useState([]);

  const prngRef = useRef(seedrandom(seedNumber));

  useEffect(() => {
    (async () => {
      const cache = await populateHashCache(hashCache, cacheSize, prngRef.current);
      setHashCache(cache);
    })();
  }, [cacheSize, hashCache, seedNumber]);

  return { hashCache };
}
