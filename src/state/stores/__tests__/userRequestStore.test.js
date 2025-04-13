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

  it('should initialise with default values', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
    const updatedState = userRequestStore.getSnapshot();
    expect(updatedState.context.userReqCache).toHaveLength(INITIAL_NUM_REQUESTS);
  });

  it('should update number of requests and regenerate cache', async () => {
    let cacheUpdatedEvent = null;
    const subscription = userRequestStore.on('cacheUpdated', event => {
      cacheUpdatedEvent = event;
    });

    const newNumRequests = 5;
    userRequestStore.send({
      type: 'setNumRequests',
      numRequests: newNumRequests,
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    const state = userRequestStore.getSnapshot();
    expect(state.context.numRequests).toBe(newNumRequests);
    expect(state.context.userReqCache).toHaveLength(newNumRequests);

    expect(cacheUpdatedEvent).toBeDefined();
    expect(cacheUpdatedEvent.cache).toHaveLength(newNumRequests);

    subscription.unsubscribe();
  });

  it('should update seed and regenerate cache', async () => {
    let cacheUpdatedEvent = null;
    const subscription = userRequestStore.on('cacheUpdated', event => {
      cacheUpdatedEvent = event;
    });

    userRequestStore.send({
      type: 'setSeed',
      seedNumber: 42,
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    const state = userRequestStore.getSnapshot();
    expect(state.context.userReqCache).toHaveLength(INITIAL_NUM_REQUESTS);
    expect(state.context.prng).toBeDefined();

    expect(cacheUpdatedEvent).toBeDefined();
    expect(cacheUpdatedEvent.cache).toHaveLength(INITIAL_NUM_REQUESTS);

    subscription.unsubscribe();
  });

  it('should reset to initial state', async () => {
    let cacheUpdatedEvent = null;
    const subscription = userRequestStore.on('cacheUpdated', event => {
      cacheUpdatedEvent = event;
    });

    // First change some values
    userRequestStore.send({
      type: 'setNumRequests',
      numRequests: 5,
    });
    userRequestStore.send({
      type: 'setSeed',
      seedNumber: 42,
    });

    // Then reset
    userRequestStore.send({ type: 'reset' });

    await new Promise(resolve => setTimeout(resolve, 0));

    const state = userRequestStore.getSnapshot();
    expect(state.context.numRequests).toBe(INITIAL_NUM_REQUESTS);
    expect(state.context.userReqCache).toHaveLength(INITIAL_NUM_REQUESTS);

    expect(cacheUpdatedEvent).toBeDefined();
    expect(cacheUpdatedEvent.cache).toHaveLength(INITIAL_NUM_REQUESTS);

    subscription.unsubscribe();
  });
});
