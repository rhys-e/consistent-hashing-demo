import { createStore } from '@xstate/store';
import { hashString } from '../../utils/hashString';
import { CYBER_COLORS } from '../../constants/colors';
import { INITIAL_VNODE_COUNT } from '../../constants/state';

function generateRandomCyberColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.floor(Math.random() * 30);
  const lightness = 50 + Math.floor(Math.random() * 15);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function createInitialNodes() {
  return [
    {
      id: 'Node A',
      color: CYBER_COLORS[0],
    },
    {
      id: 'Node B',
      color: CYBER_COLORS[1],
    },
  ];
}

async function createVirtualNode(node, vnodeIndex) {
  const vnodeId = `${node.id}-v${vnodeIndex}`;
  const { normalised, base64 } = await hashString(vnodeId);

  return {
    id: node.id,
    color: node.color,
    position: normalised,
    hash: base64,
    vnodeId: vnodeId,
    vnodeIndex: vnodeIndex,
  };
}

async function createVirtualNodesForNode(node, numVirtualNodesPerNode) {
  const virtualNodesMap = {};
  const virtualNodes = [];

  for (let i = 0; i < Math.max(1, numVirtualNodesPerNode); i++) {
    const virtualNode = await createVirtualNode(node, i);
    virtualNodesMap[virtualNode.position] = virtualNode;
    virtualNodes.push(virtualNode);
  }

  // Sort array by position
  virtualNodes.sort((a, b) => a.position - b.position);

  return { virtualNodesMap, virtualNodes };
}

async function createVirtualNodesForNodes(nodes, numVirtualNodesPerNode) {
  const virtualNodesMap = {};
  const virtualNodes = [];

  for (const node of nodes) {
    const { virtualNodesMap: nodeVirtualNodesMap, virtualNodes: nodeVirtualNodes } =
      await createVirtualNodesForNode(node, numVirtualNodesPerNode);

    Object.assign(virtualNodesMap, nodeVirtualNodesMap);
    virtualNodes.push(...nodeVirtualNodes);
  }

  // Sort the combined array
  virtualNodes.sort((a, b) => a.position - b.position);

  return { virtualNodesMap, virtualNodes };
}

export const virtualNodeStore = createStore({
  context: {
    nodes: createInitialNodes(),
    virtualNodesMap: {},
    virtualNodes: [],
    numVirtualNodesPerNode: INITIAL_VNODE_COUNT,
  },
  emits: {
    nodeAdded: () => {},
    nodeRemoved: () => {},
    vnodeCountChanged: () => {},
    nodesReset: () => {},
    virtualNodesUpdated: () => {},
  },
  on: {
    initialise: (context, _event, enqueue) => {
      enqueue.effect(async () => {
        const { virtualNodesMap, virtualNodes } = await createVirtualNodesForNodes(
          context.nodes,
          context.numVirtualNodesPerNode
        );
        virtualNodeStore.send({
          type: 'updateVirtualNodes',
          virtualNodesMap,
          virtualNodes,
        });
      });
      return context;
    },
    addNode: (context, _event, enqueue) => {
      // Find next available ID
      let newId = `Node ${String.fromCharCode(65)}`;
      let colorIndex = 0;
      while (context.nodes.some(node => node.id === newId)) {
        colorIndex++;
        newId = `Node ${String.fromCharCode(65 + colorIndex)}`;
      }
      const newColor =
        colorIndex < CYBER_COLORS.length ? CYBER_COLORS[colorIndex] : generateRandomCyberColor();

      const newNode = {
        id: newId,
        color: newColor,
      };

      enqueue.effect(async () => {
        const newVirtualNodesMap = { ...context.virtualNodesMap };
        const newVirtualNodes = [...context.virtualNodes];

        const { virtualNodesMap: nodeVirtualNodesMap, virtualNodes: nodeVirtualNodes } =
          await createVirtualNodesForNode(newNode, context.numVirtualNodesPerNode);

        Object.assign(newVirtualNodesMap, nodeVirtualNodesMap);
        newVirtualNodes.push(...nodeVirtualNodes);
        newVirtualNodes.sort((a, b) => a.position - b.position);

        virtualNodeStore.send({
          type: 'updateVirtualNodes',
          virtualNodesMap: newVirtualNodesMap,
          virtualNodes: newVirtualNodes,
        });
      });

      enqueue.emit.nodeAdded({ node: newNode, total: context.nodes.length + 1 });

      return {
        ...context,
        nodes: [...context.nodes, newNode],
      };
    },
    removeNode: (context, { id }, enqueue) => {
      if (context.nodes.length === 1) return context;

      enqueue.effect(async () => {
        const newVirtualNodesMap = { ...context.virtualNodesMap };
        const newVirtualNodes = context.virtualNodes.filter(vnode => vnode.id !== id);

        // Remove all virtual nodes for this node from the map
        Object.keys(newVirtualNodesMap).forEach(key => {
          if (newVirtualNodesMap[key].id === id) {
            delete newVirtualNodesMap[key];
          }
        });

        virtualNodeStore.send({
          type: 'updateVirtualNodes',
          virtualNodesMap: newVirtualNodesMap,
          virtualNodes: newVirtualNodes,
        });
      });

      enqueue.emit.nodeRemoved({ id, total: context.nodes.length - 1 });

      return {
        ...context,
        nodes: context.nodes.filter(node => node.id !== id),
      };
    },
    setNumVirtualNodesPerNode: (context, { count }, enqueue) => {
      enqueue.effect(async () => {
        const { virtualNodesMap, virtualNodes } = await createVirtualNodesForNodes(
          context.nodes,
          count
        );
        virtualNodeStore.send({
          type: 'updateVirtualNodes',
          virtualNodesMap,
          virtualNodes,
        });
      });

      enqueue.emit.vnodeCountChanged({ count, total: count * context.nodes.length });

      return {
        ...context,
        numVirtualNodesPerNode: count,
      };
    },
    updateVirtualNodes: (context, { virtualNodesMap, virtualNodes }, enqueue) => {
      enqueue.emit.virtualNodesUpdated({ virtualNodesMap, virtualNodes });
      return {
        ...context,
        virtualNodesMap,
        virtualNodes,
      };
    },
    reset: (context, _event, enqueue) => {
      const initialNodes = createInitialNodes();
      enqueue.effect(async () => {
        const { virtualNodesMap, virtualNodes } = await createVirtualNodesForNodes(
          initialNodes,
          INITIAL_VNODE_COUNT
        );
        virtualNodeStore.send({
          type: 'updateVirtualNodes',
          virtualNodesMap,
          virtualNodes,
        });
      });

      enqueue.emit.nodesReset({ nodes: initialNodes });

      return {
        ...context,
        nodes: initialNodes,
        numVirtualNodesPerNode: INITIAL_VNODE_COUNT,
      };
    },
  },
});

virtualNodeStore.send({ type: 'initialise' });
