import { useEffect, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import { nodeStateMachine } from '../state/machines/nodeStateMachine';
import { buildVirtualNodes, createNode, nodeStore, virtualNodeStore } from '../state/stores';
import { useSelector } from '@xstate/store/react';

function getPendingChanges(nodeLifecycle) {
  const pendingAdds = [];
  const pendingRemoves = [];

  nodeLifecycle.nodeStatuses.forEach((status, nodeId) => {
    if (status === 'pendingAdd') {
      const node = nodeLifecycle.pendingNodes.get(nodeId);
      if (node) pendingAdds.push(node);
    } else if (status === 'pendingRemove') {
      pendingRemoves.push(nodeId);
    }
  });

  return { pendingAdds, pendingRemoves };
}

function applyPendingChanges(nodes, { pendingAdds, pendingRemoves }) {
  const pendingRemoveIds = new Set(pendingRemoves);
  return [...nodes.filter(node => !pendingRemoveIds.has(node.id)), ...pendingAdds];
}

function createPendingMessage({ pendingAdds, pendingRemoves }) {
  const parts = [];

  if (pendingAdds.length > 0) {
    parts.push(`adding ${pendingAdds.map(node => node.id).join(', ')}`);
  }

  if (pendingRemoves.length > 0) {
    parts.push(`removing ${pendingRemoves.join(', ')}`);
  }

  if (parts.length === 0) return '';
  return `${parts.join(' and ')} after current cycle`;
}

export const useNodes = ({ executionStatus } = {}) => {
  const [nodeState, sendNodeState] = useMachine(nodeStateMachine);
  const { virtualNodes, numVirtualNodesPerNode } = useSelector(
    virtualNodeStore,
    state => state.context
  );
  const { nodes } = useSelector(nodeStore, state => state.context);
  const pendingChanges = getPendingChanges(nodeState.context);
  const pendingNodeChange = {
    addCount: pendingChanges.pendingAdds.length,
    removeCount: pendingChanges.pendingRemoves.length,
    totalCount: pendingChanges.pendingAdds.length + pendingChanges.pendingRemoves.length,
    message: createPendingMessage(pendingChanges),
  };

  useEffect(() => {
    const subscriptions = [];
    subscriptions.push(
      nodeStore.on('nodeAdded', ({ node, nodes, lifecycleStatus }) => {
        if (!lifecycleStatus) {
          virtualNodeStore.trigger.populateVirtualNodes({ nodes });
        }
        sendNodeState({
          type: 'ADD_NODE',
          nodeId: node.id,
          executionStatus: lifecycleStatus === 'added' ? 'stopped' : executionStatus,
        });
      })
    );
    subscriptions.push(
      nodeStore.on('nodeRemoved', ({ id, nodes, lifecycleStatus }) => {
        if (!lifecycleStatus) {
          virtualNodeStore.trigger.populateVirtualNodes({ nodes });
        }
        sendNodeState({
          type: 'REMOVE_NODE',
          nodeId: id,
          executionStatus: lifecycleStatus === 'removed' ? 'stopped' : executionStatus,
        });
      })
    );
    subscriptions.push(
      nodeStore.on('nodesReset', ({ nodes }) => {
        sendNodeState({ type: 'RESET' });
        nodes.forEach(node => {
          sendNodeState({ type: 'ADD_NODE', nodeId: node.id, executionStatus: 'stopped' });
        });
        virtualNodeStore.trigger.reset({ nodes });
      })
    );

    return () => subscriptions.forEach(subscription => subscription.unsubscribe());
  }, [executionStatus, sendNodeState]);

  useEffect(() => {
    nodeStore.trigger.init();
  }, []);

  const addNode = useCallback(
    ({ executionStatus: status = executionStatus } = {}) => {
      if (status === 'running' || status === 'paused') {
        const pendingNodes = Array.from(nodeState.context.pendingNodes.values());
        const node = createNode([...nodes, ...pendingNodes]);
        sendNodeState({ type: 'ADD_NODE', nodeId: node.id, node, executionStatus: status });
      } else {
        nodeStore.trigger.addNode();
      }
    },
    [executionStatus, nodeState.context.pendingNodes, nodes, sendNodeState]
  );

  const removeNode = useCallback(
    ({ nodeId, executionStatus: status = executionStatus }) => {
      if (nodes.length === 1) return;
      if (status === 'running' || status === 'paused') {
        sendNodeState({ type: 'REMOVE_NODE', nodeId, executionStatus: status });
      } else {
        nodeStore.trigger.removeNode({ id: nodeId });
      }
    },
    [executionStatus, nodes.length, sendNodeState]
  );

  const setNumVirtualNodesPerNode = useCallback(
    count => {
      virtualNodeStore.trigger.setNumVirtualNodesPerNode({ count, nodes });
    },
    [nodes]
  );

  const onCycleComplete = useCallback(async () => {
    const pendingChanges = getPendingChanges(nodeState.context);
    const { pendingAdds, pendingRemoves } = pendingChanges;
    const hasChanges = pendingAdds.length > 0 || pendingRemoves.length > 0;
    sendNodeState({ type: 'CYCLE_COMPLETE' });

    if (!hasChanges) {
      return { virtualNodes };
    }

    const nextNodes = applyPendingChanges(nodes, pendingChanges);
    pendingAdds.forEach(node => nodeStore.trigger.addNode({ node, lifecycleStatus: 'added' }));
    pendingRemoves.forEach(nodeId =>
      nodeStore.trigger.removeNode({ id: nodeId, lifecycleStatus: 'removed' })
    );

    const { memo, numVirtualNodesPerNode } = virtualNodeStore.getSnapshot().context;
    const projection = await buildVirtualNodes({
      nodes: nextNodes,
      numVirtualNodesPerNode,
      memo,
    });
    virtualNodeStore.trigger.updateVirtualNodes(projection);

    return { virtualNodes: projection.nodes };
  }, [nodeState.context, nodes, sendNodeState, virtualNodes]);

  const reset = useCallback(() => {
    sendNodeState({ type: 'RESET' });
    nodeStore.trigger.reset();
  }, [sendNodeState]);

  return {
    virtualNodes,
    nodes,
    numVirtualNodesPerNode,
    nodeLifecycle: nodeState.context,
    pendingNodeChange,
    addNode,
    removeNode,
    setNumVirtualNodesPerNode,
    reset,
    onCycleComplete,
  };
};
