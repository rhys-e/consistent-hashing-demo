import { createActor } from 'xstate';
import { nodeStateMachine } from '../nodeStateMachine';

describe('nodeStateMachine', () => {
  let actor;

  beforeEach(() => {
    actor = createActor(nodeStateMachine).start();
  });

  afterEach(() => {
    actor.stop();
  });

  it('tracks stopped additions as immediately added', () => {
    actor.send({ type: 'ADD_NODE', nodeId: 'Node A', executionStatus: 'stopped' });

    expect(actor.getSnapshot().context.nodeStatuses.get('Node A')).toBe('added');
    expect(actor.getSnapshot().context.pendingNodes.size).toBe(0);
  });

  it('tracks running additions as pending until cycle completion', () => {
    const node = { id: 'Node C', color: '#59A14F' };

    actor.send({ type: 'ADD_NODE', nodeId: node.id, node, executionStatus: 'running' });
    expect(actor.getSnapshot().context.nodeStatuses.get(node.id)).toBe('pendingAdd');
    expect(actor.getSnapshot().context.pendingNodes.get(node.id)).toBe(node);

    actor.send({ type: 'CYCLE_COMPLETE' });
    expect(actor.getSnapshot().context.nodeStatuses.get(node.id)).toBe('added');
    expect(actor.getSnapshot().context.pendingNodes.size).toBe(0);
  });

  it('tracks running removals as pending until cycle completion', () => {
    actor.send({ type: 'ADD_NODE', nodeId: 'Node A', executionStatus: 'stopped' });
    actor.send({ type: 'REMOVE_NODE', nodeId: 'Node A', executionStatus: 'running' });

    expect(actor.getSnapshot().context.nodeStatuses.get('Node A')).toBe('pendingRemove');

    actor.send({ type: 'CYCLE_COMPLETE' });
    expect(actor.getSnapshot().context.nodeStatuses.has('Node A')).toBe(false);
  });

  it('clears lifecycle state on reset', () => {
    actor.send({ type: 'ADD_NODE', nodeId: 'Node A', executionStatus: 'stopped' });
    actor.send({ type: 'RESET' });

    expect(actor.getSnapshot().context.nodeStatuses.size).toBe(0);
    expect(actor.getSnapshot().context.pendingNodes.size).toBe(0);
  });
});
