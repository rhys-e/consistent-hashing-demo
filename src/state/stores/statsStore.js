import { createStore } from '@xstate/store';

const calculateLoadImbalance = nodeStats => {
  if (Object.keys(nodeStats).length === 0) return 0;

  const values = Object.values(nodeStats);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return (Math.sqrt(variance) / mean) * 100;
};

const statsStore = createStore({
  context: {
    nodeStats: {},
    loadImbalance: 0,
    totalRequests: 0,
  },
  on: {
    incrementNodeStats: (context, { nodeId }) => {
      const newStats = {
        ...context.nodeStats,
        [nodeId]: (context.nodeStats[nodeId] || 0) + 1,
      };
      return {
        nodeStats: newStats,
        loadImbalance: calculateLoadImbalance(newStats),
        totalRequests: context.totalRequests + 1,
      };
    },
    reset: () => ({
      nodeStats: {},
      loadImbalance: 0,
      totalRequests: 0,
    }),
  },
});

export { statsStore };
