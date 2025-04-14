import { userRequestStore } from '../userRequestStore';
import { INITIAL_NUM_REQUESTS } from '../../../constants/state';

jest.mock('../../../utils/hashString', () => ({
  hashString: async str => {
    const charCodeSum = str.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const normalised = (charCodeSum % 1000) / 1000;
    return { normalised, base64: `hash_${charCodeSum}` };
  },
}));

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('userRequestStore', () => {
  beforeEach(async () => {
    userRequestStore.send({ type: 'reset' });
    await flushPromises();
  });

  it('should initialise with default values', async () => {
    userRequestStore.send({ type: 'initialise' });
    await flushPromises();

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

    await flushPromises();

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

    await flushPromises();

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

    userRequestStore.send({
      type: 'setNumRequests',
      numRequests: 5,
    });

    userRequestStore.send({
      type: 'setSeed',
      seedNumber: 42,
    });

    userRequestStore.send({ type: 'reset' });

    await flushPromises();
    const state = userRequestStore.getSnapshot();
    expect(state.context.numRequests).toBe(INITIAL_NUM_REQUESTS);
    expect(state.context.userReqCache).toHaveLength(INITIAL_NUM_REQUESTS);

    expect(cacheUpdatedEvent).toBeDefined();
    expect(cacheUpdatedEvent.cache).toHaveLength(INITIAL_NUM_REQUESTS);

    subscription.unsubscribe();
  });
});
