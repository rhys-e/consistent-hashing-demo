import { createStore } from '@xstate/store';
import { hashString } from '../../utils/hashString';
import { INITIAL_VNODE_COUNT } from '../../constants/state';

async function createVirtualNode(nodeData, vnodeIndex) {
  const vnodeId = `${nodeData.id}-v${vnodeIndex}`;
  const { normalised, base64 } = await hashString(vnodeId);

  return {
    nodeId: nodeData.id,
    color: nodeData.color,
    position: normalised,
    hash: base64,
    vnodeId,
    vnodeIndex,
  };
}

export async function buildVirtualNodes({
  nodes = [],
  numVirtualNodesPerNode = INITIAL_VNODE_COUNT,
  memo = {},
}) {
  const virtualNodes = [];
  const promises = [];

  for (const node of nodes) {
    for (let i = 0; i < numVirtualNodesPerNode; i++) {
      const vnode = memo[`${node.id}-v${i}`];
      if (vnode) {
        virtualNodes.push(vnode);
      } else {
        promises.push(createVirtualNode(node, i));
      }
    }
  }

  const settledResults = await Promise.allSettled(promises);
  virtualNodes.push(
    ...settledResults.filter(result => result.status === 'fulfilled').map(result => result.value)
  );
  virtualNodes.sort((a, b) => a.position - b.position);

  const nextMemo = virtualNodes.reduce((acc, vnode) => {
    acc[vnode.vnodeId] = vnode;
    return acc;
  }, {});

  return { nodes: virtualNodes, memo: nextMemo };
}

export const virtualNodeStore = createStore({
  context: {
    memo: {},
    virtualNodes: [],
    numVirtualNodesPerNode: INITIAL_VNODE_COUNT,
  },
  emits: {
    vnodeCountChanged: () => {},
    virtualNodesUpdated: () => {},
  },
  on: {
    populateVirtualNodes: (context, { nodes = [] }, enqueue) => {
      enqueue.effect(async () => {
        const projection = await buildVirtualNodes({
          nodes,
          numVirtualNodesPerNode: context.numVirtualNodesPerNode,
          memo: context.memo,
        });
        virtualNodeStore.trigger.updateVirtualNodes(projection);
      });
    },
    updateVirtualNodes: (context, { nodes, memo }, enqueue) => {
      enqueue.emit.virtualNodesUpdated({ nodes });
      return {
        ...context,
        virtualNodes: nodes,
        memo,
      };
    },
    setNumVirtualNodesPerNode: (context, { count, nodes = [] }, enqueue) => {
      enqueue.emit.vnodeCountChanged({ count, nodesLength: count * nodes.length });
      enqueue.effect(() => {
        virtualNodeStore.send({
          type: 'populateVirtualNodes',
          nodes,
        });
      });
      return {
        ...context,
        numVirtualNodesPerNode: count,
      };
    },
    reset: (context, { nodes = [] } = {}, enqueue) => {
      enqueue.effect(() => {
        virtualNodeStore.send({
          type: 'populateVirtualNodes',
          nodes,
        });
      });
      return {
        ...context,
        numVirtualNodesPerNode: INITIAL_VNODE_COUNT,
      };
    },
  },
});
