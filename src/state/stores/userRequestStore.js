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

async function populateHashCache(backgroundCache, targetSize, prng) {
  const promises = Array.from({ length: Math.max(targetSize - backgroundCache.length, 0) }, () =>
    generateRequest(prng)
  );
  const results = await Promise.allSettled(promises);
  const fulfilled = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  return [...backgroundCache, ...fulfilled];
}

export const userRequestStore = createStore({
  context: {
    backgroundCache: [],
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
        const newBackgroundCache = await populateHashCache([], context.numRequests, context.prng);
        userRequestStore.send({ type: 'updateCache', backgroundCache: newBackgroundCache });
      });
      return context;
    },
    setNumRequests: (context, { numRequests }, enqueue) => {
      enqueue.effect(async () => {
        const newBackgroundCache = await populateHashCache(
          context.backgroundCache,
          numRequests,
          context.prng
        );
        userRequestStore.send({ type: 'updateCache', backgroundCache: newBackgroundCache });
      });

      enqueue.emit.numRequestsUpdated({ numRequests });
      return {
        ...context,
        numRequests,
      };
    },
    updateCache: (context, { backgroundCache }, enqueue) => {
      const userReqCache = backgroundCache.slice(0, context.numRequests);

      enqueue.emit.cacheUpdated({ cache: userReqCache });
      return {
        ...context,
        backgroundCache,
        userReqCache,
      };
    },
    setSeed: (context, { seedNumber }, enqueue) => {
      const newPrng = seedrandom(seedNumber);
      enqueue.effect(async () => {
        const newBackgroundCache = await populateHashCache([], context.numRequests, newPrng);
        userRequestStore.send({ type: 'updateCache', backgroundCache: newBackgroundCache });
      });

      return {
        ...context,
        prng: newPrng,
      };
    },
    reset: (context, _, enqueue) => {
      enqueue.effect(async () => {
        const newBackgroundCache = await populateHashCache([], INITIAL_NUM_REQUESTS, context.prng);
        userRequestStore.send({ type: 'updateCache', backgroundCache: newBackgroundCache });
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
