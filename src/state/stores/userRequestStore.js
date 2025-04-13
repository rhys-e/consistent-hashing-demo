import { createStore } from '@xstate/store';
import { hashString } from '../../utils/hashString';
import seedrandom from 'seedrandom';
import { INITIAL_NUM_REQUESTS } from '../../constants/state';

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

export const userRequestStore = createStore({
  context: {
    userReqCache: [],
    prng: seedrandom(1),
    numRequests: INITIAL_NUM_REQUESTS,
  },
  emits: {
    cacheUpdated: () => {},
    numRequestsUpdated: () => {},
  },
  on: {
    initialise: (context, _event, enqueue) => {
      enqueue.effect(async () => {
        const newCache = await populateHashCache([], context.numRequests, context.prng);
        userRequestStore.send({ type: 'updateCache', cache: newCache });
      });
      return context;
    },
    setNumRequests: (context, { numRequests }, enqueue) => {
      enqueue.effect(async () => {
        const newCache = await populateHashCache(context.userReqCache, numRequests, context.prng);
        userRequestStore.send({ type: 'updateCache', cache: newCache });
      });

      enqueue.emit.numRequestsUpdated({ numRequests });
      return {
        ...context,
        numRequests,
      };
    },
    updateCache: (context, { cache }, enqueue) => {
      enqueue.emit.cacheUpdated({ cache });
      return {
        ...context,
        userReqCache: cache,
      };
    },
    setSeed: (context, { seedNumber }, enqueue) => {
      const newPrng = seedrandom(seedNumber);
      enqueue.effect(async () => {
        const newCache = await populateHashCache([], context.numRequests, newPrng);
        userRequestStore.send({ type: 'updateCache', cache: newCache });
      });

      return {
        ...context,
        prng: newPrng,
      };
    },
    reset: (context, _, enqueue) => {
      enqueue.effect(async () => {
        const newCache = await populateHashCache([], INITIAL_NUM_REQUESTS, context.prng);
        userRequestStore.send({ type: 'updateCache', cache: newCache });
      });

      enqueue.emit.numRequestsUpdated({ numRequests: INITIAL_NUM_REQUESTS });
      return {
        ...context,
        numRequests: INITIAL_NUM_REQUESTS,
      };
    },
  },
});

userRequestStore.send({ type: 'initialise' });
