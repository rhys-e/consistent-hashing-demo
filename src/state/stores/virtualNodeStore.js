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

const createInitialNodes = () => [
  {
    id: 'Node A',
    color: CYBER_COLORS[0],
  },
  {
    id: 'Node B',
    color: CYBER_COLORS[1],
  },
];

const createVirtualNode = async (node, vnodeIndex) => {
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
};

const createVirtualNodesForNode = async (node, numVirtualNodesPerNode) => {
  const virtualNodes = {};
  for (let i = 0; i < Math.max(1, numVirtualNodesPerNode); i++) {
    const virtualNode = await createVirtualNode(node, i);
    virtualNodes[virtualNode.position] = virtualNode;
  }
  return virtualNodes;
};

const createVirtualNodesForNodes = async (nodes, numVirtualNodesPerNode) => {
  const virtualNodes = {};
  for (const node of nodes) {
    const nodeVirtualNodes = await createVirtualNodesForNode(node, numVirtualNodesPerNode);
    Object.assign(virtualNodes, nodeVirtualNodes);
  }
  return virtualNodes;
};

export const virtualNodeStore = createStore({
  context: {
    nodes: createInitialNodes(),
    virtualNodes: {},
    numVirtualNodesPerNode: INITIAL_VNODE_COUNT,
  },
  emits: {
    nodeAdded: () => {},
    nodeRemoved: () => {},
    vnodeCountChanged: () => {},
    nodesChanged: () => {},
    virtualNodesUpdated: () => {},
  },
  on: {
    initialise: (context, _event, enqueue) => {
      enqueue.effect(async () => {
        const newVirtualNodes = await createVirtualNodesForNodes(
          context.nodes,
          context.numVirtualNodesPerNode
        );
        virtualNodeStore.send({ type: 'updateVirtualNodes', virtualNodes: newVirtualNodes });
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
        const newVirtualNodes = { ...context.virtualNodes };
        const nodeVirtualNodes = await createVirtualNodesForNode(
          newNode,
          context.numVirtualNodesPerNode
        );
        Object.assign(newVirtualNodes, nodeVirtualNodes);
        virtualNodeStore.send({ type: 'updateVirtualNodes', virtualNodes: newVirtualNodes });
      });

      enqueue.emit.nodeAdded({ node: newNode });

      return {
        ...context,
        nodes: [...context.nodes, newNode],
      };
    },
    removeNode: (context, { id }, enqueue) => {
      if (context.nodes.length === 1) return context;

      enqueue.effect(async () => {
        const newVirtualNodes = { ...context.virtualNodes };
        // Remove all virtual nodes for this node
        Object.keys(newVirtualNodes).forEach(key => {
          if (newVirtualNodes[key].id === id) {
            delete newVirtualNodes[key];
          }
        });

        virtualNodeStore.send({ type: 'updateVirtualNodes', virtualNodes: newVirtualNodes });
      });

      enqueue.emit.nodeRemoved({ id });

      return {
        ...context,
        nodes: context.nodes.filter(node => node.id !== id),
      };
    },
    setNumVirtualNodesPerNode: (context, { count }, enqueue) => {
      enqueue.effect(async () => {
        const newVirtualNodes = await createVirtualNodesForNodes(context.nodes, count);
        virtualNodeStore.send({ type: 'updateVirtualNodes', virtualNodes: newVirtualNodes });
      });

      enqueue.emit.vnodeCountChanged({ count });

      return {
        ...context,
        numVirtualNodesPerNode: count,
      };
    },
    updateVirtualNodes: (context, { virtualNodes }, enqueue) => {
      enqueue.emit.virtualNodesUpdated({ virtualNodes });
      return {
        ...context,
        virtualNodes,
      };
    },
    reset: (context, _event, enqueue) => {
      const initialNodes = createInitialNodes();
      enqueue.effect(async () => {
        const newVirtualNodes = await createVirtualNodesForNodes(initialNodes, INITIAL_VNODE_COUNT);
        virtualNodeStore.send({ type: 'updateVirtualNodes', virtualNodes: newVirtualNodes });
      });

      enqueue.emit.nodesChanged({ nodes: initialNodes });

      return {
        ...context,
        nodes: initialNodes,
        numVirtualNodesPerNode: INITIAL_VNODE_COUNT,
      };
    },
  },
});

// Trigger initialization
virtualNodeStore.send({ type: 'initialise' });
