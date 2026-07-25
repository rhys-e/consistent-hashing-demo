import { virtualNodeStore } from '../virtualNodeStore';
import { INITIAL_VNODE_COUNT } from '../../../constants/state';

const HASH_MAP = {
  'Node A-v0': { normalised: 0.4, base64: 'hash-a0' },
  'Node A-v1': { normalised: 0.1, base64: 'hash-a1' },
  'Node A-v2': { normalised: 0.6, base64: 'hash-a2' },
  'Node B-v0': { normalised: 0.3, base64: 'hash-b0' },
  'Node B-v1': { normalised: 0.2, base64: 'hash-b1' },
  'Node B-v2': { normalised: 0.5, base64: 'hash-b2' },
};

const NODES = [
  { id: 'Node A', color: '#E15759' },
  { id: 'Node B', color: '#4E79A7' },
];

jest.mock('../../../utils/hashString', () => ({
  hashString: async str => {
    if (!HASH_MAP[str]) {
      throw new Error(`No fixed hash value defined for ${str}`);
    }
    return HASH_MAP[str];
  },
}));

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('virtualNodeStore', () => {
  beforeEach(async () => {
    virtualNodeStore.trigger.reset({ nodes: NODES });
    await flushPromises();
  });

  it('populates sorted virtual nodes for physical nodes', async () => {
    virtualNodeStore.trigger.populateVirtualNodes({ nodes: NODES });
    await flushPromises();

    const { virtualNodes, numVirtualNodesPerNode } = virtualNodeStore.getSnapshot().context;
    expect(numVirtualNodesPerNode).toBe(INITIAL_VNODE_COUNT);
    expect(virtualNodes).toHaveLength(NODES.length * INITIAL_VNODE_COUNT);
    expect(virtualNodes.map(vnode => vnode.position)).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(virtualNodes.map(vnode => vnode.nodeId)).toEqual([
      'Node A',
      'Node B',
      'Node B',
      'Node A',
    ]);
  });

  it('updates vnode count and recomputes the projection', async () => {
    let vnodeCountChangedEvent = null;
    const subscription = virtualNodeStore.on('vnodeCountChanged', event => {
      vnodeCountChangedEvent = event;
    });

    virtualNodeStore.trigger.setNumVirtualNodesPerNode({ count: 3, nodes: NODES });
    await flushPromises();

    const { virtualNodes, numVirtualNodesPerNode } = virtualNodeStore.getSnapshot().context;
    expect(numVirtualNodesPerNode).toBe(3);
    expect(virtualNodes).toHaveLength(6);
    expect(vnodeCountChangedEvent).toMatchObject({ count: 3, nodesLength: 6 });

    subscription.unsubscribe();
  });

  it('resets vnode count while rebuilding from the supplied nodes', async () => {
    virtualNodeStore.trigger.setNumVirtualNodesPerNode({ count: 3, nodes: NODES });
    await flushPromises();

    virtualNodeStore.trigger.reset({ nodes: NODES });
    await flushPromises();

    const { virtualNodes, numVirtualNodesPerNode } = virtualNodeStore.getSnapshot().context;
    expect(numVirtualNodesPerNode).toBe(INITIAL_VNODE_COUNT);
    expect(virtualNodes).toHaveLength(NODES.length * INITIAL_VNODE_COUNT);
  });
});
