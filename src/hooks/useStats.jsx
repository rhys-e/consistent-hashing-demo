import { useState, useCallback } from 'react';

// Custom hook for stats management
export function useStats() {
  const [stats, setStats] = useState({
    requestsProcessed: 0,
    nodeStats: {}, // tracks requests per node
  });

  // Track requests reaching their target
  const trackRequest = useCallback(nodeId => {
    setStats(prev => {
      const newNodeStats = { ...prev.nodeStats };
      newNodeStats[nodeId] = (newNodeStats[nodeId] || 0) + 1;

      return {
        requestsProcessed: prev.requestsProcessed + 1,
        nodeStats: newNodeStats,
      };
    });
  }, []);

  // Calculate distribution metrics
  const calculateDistribution = useCallback(() => {
    // If no stats or only one node, return 0 (perfectly balanced)
    const values = Object.values(stats.nodeStats);
    if (!values.length || values.length === 1) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    // Avoid division by zero
    if (mean === 0) return 0;

    // Calculate variance
    const variance =
      values.reduce((sum, val) => {
        return sum + Math.pow(val - mean, 2);
      }, 0) / values.length;

    // Return coefficient of variation as percentage
    return (Math.sqrt(variance) / mean) * 100;
  }, [stats.nodeStats]);

  const resetStats = useCallback(() => {
    setStats({
      requestsProcessed: 0,
      nodeStats: {},
    });
  }, []);

  return {
    stats,
    trackRequest,
    calculateDistribution,
    resetStats,
  };
}
