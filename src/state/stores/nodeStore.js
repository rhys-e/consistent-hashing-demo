import { createStore } from '@xstate/store';
import { CYBER_COLORS } from '../../constants/colors';
import { INITIAL_NODE_COUNT } from '../../constants/state';

function generateRandomCyberColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.floor(Math.random() * 30);
  const lightness = 50 + Math.floor(Math.random() * 15);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function createNode(existingNodes) {
  let newId = `Node ${String.fromCharCode(65)}`;
  let colorIndex = 0;
  while (existingNodes.some(node => node.id === newId)) {
    colorIndex++;
    newId = `Node ${String.fromCharCode(65 + colorIndex)}`;
  }

  const newColor =
    colorIndex < CYBER_COLORS.length ? CYBER_COLORS[colorIndex] : generateRandomCyberColor();

  return {
    id: newId,
    color: newColor,
  };
}

function createInitialNodes() {
  return Array.from({ length: INITIAL_NODE_COUNT }).reduce(nodes => {
    return [...nodes, createNode(nodes)];
  }, []);
}

export const nodeStore = createStore({
  context: {
    nodes: [],
    initialised: false,
  },
  emits: {
    nodeAdded: () => {},
    nodeRemoved: () => {},
    nodesReset: () => {},
  },
  on: {
    init: (context, _event, enqueue) => {
      if (context.initialised) return context;
      const nodes = createInitialNodes();
      enqueue.emit.nodesReset({ nodes, nodesLength: nodes.length });
      return {
        ...context,
        nodes,
        initialised: true,
      };
    },
    addNode: (context, { node, lifecycleStatus } = {}, enqueue) => {
      const newNode = node ?? createNode(context.nodes);
      const nodes = [...context.nodes, newNode];

      enqueue.emit.nodeAdded({
        node: newNode,
        nodesLength: nodes.length,
        nodes,
        lifecycleStatus,
      });

      return {
        ...context,
        nodes,
      };
    },
    removeNode: (context, { id, lifecycleStatus }, enqueue) => {
      if (context.nodes.length === 1) return context;
      if (!context.nodes.some(node => node.id === id)) return context;

      const nodes = context.nodes.filter(node => node.id !== id);
      enqueue.emit.nodeRemoved({
        id,
        nodesLength: nodes.length,
        nodes,
        lifecycleStatus,
      });

      return {
        ...context,
        nodes,
      };
    },
    reset: (context, _event, enqueue) => {
      const nodes = createInitialNodes();
      enqueue.emit.nodesReset({ nodes, nodesLength: nodes.length });

      return {
        ...context,
        nodes,
        initialised: true,
      };
    },
  },
});
