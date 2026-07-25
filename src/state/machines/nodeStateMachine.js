import { assign, createMachine } from 'xstate';

const isStopped = executionStatus => executionStatus === 'stopped' || !executionStatus;
const copyMap = map => new Map(map);

export const nodeStateMachine = createMachine({
  id: 'nodeState',
  initial: 'ready',
  context: {
    nodeStatuses: new Map(),
    pendingNodes: new Map(),
  },
  states: {
    ready: {
      on: {
        ADD_NODE: {
          actions: ['trackNodeAdded'],
        },
        REMOVE_NODE: {
          actions: ['trackNodeRemoved'],
          guard: 'nodeExists',
        },
        CYCLE_COMPLETE: {
          actions: ['completePendingChanges'],
        },
        RESET: {
          actions: ['resetLifecycle'],
        },
      },
    },
  },
}).provide({
  actions: {
    trackNodeAdded: assign(({ context, event }) => {
      const nodeStatuses = copyMap(context.nodeStatuses);
      const pendingNodes = copyMap(context.pendingNodes);
      const status = isStopped(event.executionStatus) ? 'added' : 'pendingAdd';

      nodeStatuses.set(event.nodeId, status);
      if (status === 'pendingAdd' && event.node) {
        pendingNodes.set(event.nodeId, event.node);
      } else {
        pendingNodes.delete(event.nodeId);
      }

      return { nodeStatuses, pendingNodes };
    }),

    trackNodeRemoved: assign(({ context, event }) => {
      const nodeStatuses = copyMap(context.nodeStatuses);
      const pendingNodes = copyMap(context.pendingNodes);
      const currentStatus = nodeStatuses.get(event.nodeId);

      if (isStopped(event.executionStatus) || currentStatus === 'pendingAdd') {
        nodeStatuses.delete(event.nodeId);
        pendingNodes.delete(event.nodeId);
      } else {
        nodeStatuses.set(event.nodeId, 'pendingRemove');
      }

      return { nodeStatuses, pendingNodes };
    }),

    completePendingChanges: assign(({ context }) => {
      const nodeStatuses = copyMap(context.nodeStatuses);
      const pendingNodes = new Map();

      nodeStatuses.forEach((status, nodeId) => {
        if (status === 'pendingAdd') {
          nodeStatuses.set(nodeId, 'added');
        } else if (status === 'pendingRemove') {
          nodeStatuses.delete(nodeId);
        }
      });

      return { nodeStatuses, pendingNodes };
    }),

    resetLifecycle: assign({
      nodeStatuses: () => new Map(),
      pendingNodes: () => new Map(),
    }),
  },
  guards: {
    nodeExists: ({ context, event }) => context.nodeStatuses.has(event.nodeId),
  },
});
