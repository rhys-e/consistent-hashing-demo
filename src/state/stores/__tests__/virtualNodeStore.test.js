import { virtualNodeStore } from '../virtualNodeStore';
import { INITIAL_VNODE_COUNT } from '../../../constants/state';

const HASH_MAP = {
  'Node A-v0': { normalised: 0.1, base64: 'nodeA0' },
  'Node A-v1': { normalised: 0.15, base64: 'nodeA1' },
  'Node A-v2': { normalised: 0.2, base64: 'nodeA2' },
  'Node A-v3': { normalised: 0.25, base64: 'nodeA3' },
  'Node A-v4': { normalised: 0.3, base64: 'nodeA4' },
  'Node B-v0': { normalised: 0.4, base64: 'nodeB0' },
  'Node B-v1': { normalised: 0.45, base64: 'nodeB1' },
  'Node B-v2': { normalised: 0.5, base64: 'nodeB2' },
  'Node B-v3': { normalised: 0.55, base64: 'nodeB3' },
  'Node B-v4': { normalised: 0.6, base64: 'nodeB4' },
  'Node C-v0': { normalised: 0.7, base64: 'nodeC0' },
  'Node C-v1': { normalised: 0.75, base64: 'nodeC1' },
  'Node C-v2': { normalised: 0.8, base64: 'nodeC2' },
  'Node C-v3': { normalised: 0.85, base64: 'nodeC3' },
  'Node C-v4': { normalised: 0.9, base64: 'nodeC4' },
};

jest.mock('../../../utils/hashString', () => ({
  hashString: async str => {
    if (!HASH_MAP[str]) {
      throw new Error(`No fixed hash value defined for ${str}`);
    }
    return HASH_MAP[str];
  },
}));

describe('virtualNodeStore', () => {
  beforeEach(() => {
    virtualNodeStore.send({ type: 'reset' });
  });

  it('should initialize with two nodes', () => {
    const state = virtualNodeStore.getSnapshot();
    expect(state.context.nodes).toHaveLength(2);
    expect(state.context.nodes[0].id).toBe('Node A');
    expect(state.context.nodes[1].id).toBe('Node B');
    expect(state.context.numVirtualNodesPerNode).toBe(INITIAL_VNODE_COUNT);
  });

  it('should add a new node', async () => {
    let nodeAddedEvent = null;
    const subscription = virtualNodeStore.on('nodeAdded', event => {
      nodeAddedEvent = event;
    });

    virtualNodeStore.send({ type: 'addNode' });
    await new Promise(resolve => setTimeout(resolve, 0));

    const state = virtualNodeStore.getSnapshot();
    expect(state.context.nodes).toHaveLength(3);
    expect(state.context.nodes[2].id).toBe('Node C');

    expect(nodeAddedEvent).toBeDefined();
    expect(nodeAddedEvent.node.id).toBe('Node C');

    subscription.unsubscribe();
  });

  it('should remove a node', async () => {
    let nodeRemovedEvent = null;
    const subscription = virtualNodeStore.on('nodeRemoved', event => {
      nodeRemovedEvent = event;
    });

    virtualNodeStore.send({ type: 'removeNode', id: 'Node B' });
    await new Promise(resolve => setTimeout(resolve, 0));

    const state = virtualNodeStore.getSnapshot();
    expect(state.context.nodes).toHaveLength(1);
    expect(state.context.nodes[0].id).toBe('Node A');

    expect(nodeRemovedEvent).toBeDefined();
    expect(nodeRemovedEvent.id).toBe('Node B');

    subscription.unsubscribe();
  });

  it('should not remove the last node', async () => {
    virtualNodeStore.send({ type: 'removeNode', id: 'Node A' });
    virtualNodeStore.send({ type: 'removeNode', id: 'Node B' });
    const state = virtualNodeStore.getSnapshot();
    expect(state.context.nodes).toHaveLength(1);
    expect(state.context.nodes[0].id).toBe('Node B');
  });

  it('should update numVirtualNodesPerNode', async () => {
    let vnodeCountChangedEvent = null;
    const subscription = virtualNodeStore.on('vnodeCountChanged', event => {
      vnodeCountChangedEvent = event;
    });

    const newCount = 5;
    virtualNodeStore.send({ type: 'setNumVirtualNodesPerNode', count: newCount });
    await new Promise(resolve => setTimeout(resolve, 0));

    const state = virtualNodeStore.getSnapshot();
    expect(state.context.numVirtualNodesPerNode).toBe(newCount);

    expect(vnodeCountChangedEvent).toBeDefined();
    expect(vnodeCountChangedEvent.count).toBe(newCount);

    subscription.unsubscribe();
  });

  it('should reset to initial state', async () => {
    let nodesChangedEvent = null;
    const subscription = virtualNodeStore.on('nodesChanged', event => {
      nodesChangedEvent = event;
    });

    virtualNodeStore.send({ type: 'addNode' });
    virtualNodeStore.send({ type: 'setNumVirtualNodesPerNode', count: 5 });
    virtualNodeStore.send({ type: 'reset' });
    await new Promise(resolve => setTimeout(resolve, 0));

    const state = virtualNodeStore.getSnapshot();
    expect(state.context.nodes).toHaveLength(2);
    expect(state.context.nodes[0].id).toBe('Node A');
    expect(state.context.nodes[1].id).toBe('Node B');
    expect(state.context.numVirtualNodesPerNode).toBe(INITIAL_VNODE_COUNT);

    expect(nodesChangedEvent).toBeDefined();
    expect(nodesChangedEvent.nodes).toHaveLength(2);

    subscription.unsubscribe();
  });

  it('should create virtual nodes for nodes', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));

    const state = virtualNodeStore.getSnapshot();
    const virtualNodes = state.context.virtualNodes;

    const totalVirtualNodeCount =
      state.context.nodes.length * Math.max(1, state.context.numVirtualNodesPerNode);
    expect(Object.keys(virtualNodes)).toHaveLength(totalVirtualNodeCount);

    state.context.nodes.forEach(node => {
      const nodeVirtualNodes = Object.values(virtualNodes).filter(vnode => vnode.id === node.id);
      expect(nodeVirtualNodes).toHaveLength(Math.max(1, state.context.numVirtualNodesPerNode));
    });
  });

  it('should update virtual nodes when adding a node', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
    virtualNodeStore.send({ type: 'addNode' });
    await new Promise(resolve => setTimeout(resolve, 0));

    const state = virtualNodeStore.getSnapshot();
    const virtualNodes = state.context.virtualNodes;

    const updatedVirtualNodeCount =
      state.context.nodes.length * Math.max(1, state.context.numVirtualNodesPerNode);
    expect(Object.keys(virtualNodes)).toHaveLength(updatedVirtualNodeCount);

    const newNodeVirtualNodes = Object.values(virtualNodes).filter(vnode => vnode.id === 'Node C');
    expect(newNodeVirtualNodes).toHaveLength(Math.max(1, state.context.numVirtualNodesPerNode));
  });
});
