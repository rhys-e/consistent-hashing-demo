import { createNode, nodeStore } from '../nodeStore';
import { INITIAL_NODE_COUNT } from '../../../constants/state';

describe('nodeStore', () => {
  beforeEach(() => {
    nodeStore.trigger.reset();
  });

  it('resets to the initial physical nodes', () => {
    const { nodes, initialised } = nodeStore.getSnapshot().context;

    expect(initialised).toBe(true);
    expect(nodes).toHaveLength(INITIAL_NODE_COUNT);
    expect(nodes.map(node => node.id)).toEqual(['Node A', 'Node B']);
  });

  it('adds the next available physical node', () => {
    let nodeAddedEvent = null;
    const subscription = nodeStore.on('nodeAdded', event => {
      nodeAddedEvent = event;
    });

    nodeStore.trigger.addNode();

    const { nodes } = nodeStore.getSnapshot().context;
    expect(nodes.map(node => node.id)).toEqual(['Node A', 'Node B', 'Node C']);
    expect(nodeAddedEvent.node.id).toBe('Node C');
    expect(nodeAddedEvent.nodesLength).toBe(3);

    subscription.unsubscribe();
  });

  it('removes an existing node without removing the final node', () => {
    nodeStore.trigger.removeNode({ id: 'Node B' });
    nodeStore.trigger.removeNode({ id: 'Node A' });

    const { nodes } = nodeStore.getSnapshot().context;
    expect(nodes.map(node => node.id)).toEqual(['Node A']);
  });

  it('can create a pending node without mutating the store', () => {
    const { nodes } = nodeStore.getSnapshot().context;
    const node = createNode(nodes);

    expect(node.id).toBe('Node C');
    expect(nodeStore.getSnapshot().context.nodes).toHaveLength(INITIAL_NODE_COUNT);
  });
});
