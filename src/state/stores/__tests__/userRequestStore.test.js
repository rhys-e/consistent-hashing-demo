import { userRequestStore } from '../userRequestStore';
import { INITIAL_NUM_REQUESTS } from '../../../constants/state';

const HASH_MAP = {
  user_id_1234: { normalised: 0.1, base64: 'hash1' },
  user_id_5678: { normalised: 0.2, base64: 'hash2' },
  user_id_9012: { normalised: 0.3, base64: 'hash3' },
};

jest.mock('../../../utils/hashString', () => ({
  hashString: async str => {
    if (!HASH_MAP[str]) {
      throw new Error(`No fixed hash value defined for ${str}`);
    }
    return HASH_MAP[str];
  },
}));

describe('userRequestStore', () => {
  beforeEach(() => {
    userRequestStore.send({ type: 'reset' });
  });

  it('should initialize with default values', async () => {
    const state = userRequestStore.getSnapshot();
    expect(state.context.numRequests).toBe(INITIAL_NUM_REQUESTS);

    // Wait for initial cache population
    await new Promise(resolve => setTimeout(resolve, 0));
    const updatedState = userRequestStore.getSnapshot();
    expect(updatedState.context.hashCache).toHaveLength(INITIAL_NUM_REQUESTS);
  });

  it('should update number of requests and regenerate cache', async () => {
    let cacheUpdatedEvent = null;
    let numRequestsUpdatedEvent = null;

    const cacheSubscription = userRequestStore.on('cacheUpdated', event => {
      cacheUpdatedEvent = event;
    });
    const requestsSubscription = userRequestStore.on('numRequestsUpdated', event => {
      numRequestsUpdatedEvent = event;
    });

    const newNumRequests = 3;
    userRequestStore.send({ type: 'setNumRequests', numRequests: newNumRequests });
    await new Promise(resolve => setTimeout(resolve, 0));

    const state = userRequestStore.getSnapshot();
    expect(state.context.numRequests).toBe(newNumRequests);
    expect(state.context.hashCache).toHaveLength(newNumRequests);

    expect(cacheUpdatedEvent).toBeDefined();
    expect(cacheUpdatedEvent.cache).toHaveLength(newNumRequests);
    expect(numRequestsUpdatedEvent).toBeDefined();
    expect(numRequestsUpdatedEvent.numRequests).toBe(newNumRequests);

    cacheSubscription.unsubscribe();
    requestsSubscription.unsubscribe();
  });

  it('should update seed and regenerate cache', async () => {
    let cacheUpdatedEvent = null;
    const subscription = userRequestStore.on('cacheUpdated', event => {
      cacheUpdatedEvent = event;
    });

    // First set a number of requests
    userRequestStore.send({ type: 'setNumRequests', numRequests: 3 });
    await new Promise(resolve => setTimeout(resolve, 0));

    // Then change the seed
    const newSeed = 2;
    userRequestStore.send({ type: 'setSeed', seedNumber: newSeed });
    await new Promise(resolve => setTimeout(resolve, 0));

    const state = userRequestStore.getSnapshot();
    expect(state.context.hashCache).toHaveLength(3);
    expect(state.context.prng).toBeDefined();

    expect(cacheUpdatedEvent).toBeDefined();
    expect(cacheUpdatedEvent.cache).toHaveLength(3);

    subscription.unsubscribe();
  });

  it('should reset to initial state', async () => {
    let cacheUpdatedEvent = null;
    let numRequestsUpdatedEvent = null;

    const cacheSubscription = userRequestStore.on('cacheUpdated', event => {
      cacheUpdatedEvent = event;
    });
    const requestsSubscription = userRequestStore.on('numRequestsUpdated', event => {
      numRequestsUpdatedEvent = event;
    });

    // First set some non-default values
    userRequestStore.send({ type: 'setNumRequests', numRequests: 5 });
    await new Promise(resolve => setTimeout(resolve, 0));

    // Then reset
    userRequestStore.send({ type: 'reset' });
    await new Promise(resolve => setTimeout(resolve, 0));

    const state = userRequestStore.getSnapshot();
    expect(state.context.numRequests).toBe(INITIAL_NUM_REQUESTS);
    expect(state.context.hashCache).toHaveLength(INITIAL_NUM_REQUESTS);

    expect(cacheUpdatedEvent).toBeDefined();
    expect(cacheUpdatedEvent.cache).toHaveLength(INITIAL_NUM_REQUESTS);
    expect(numRequestsUpdatedEvent).toBeDefined();
    expect(numRequestsUpdatedEvent.numRequests).toBe(INITIAL_NUM_REQUESTS);

    cacheSubscription.unsubscribe();
    requestsSubscription.unsubscribe();
  });
});
