import { createContext, useContext, useEffect } from 'react';
import { useExecutionStatus } from '../hooks/useExecutionStatus';
import { useSelector, useAtom } from '../hooks/useStore';
import { virtualNodeStore, dimensionsStore, statsStore } from '../state/stores';
import { speedMultiplierAtom, numRequestsAtom } from '../state/atoms';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Re-expose hooks
  const executionStatus = useExecutionStatus();
  const dimensions = useSelector(dimensionsStore);
  const { nodes, numVirtualNodesPerNode } = useSelector(virtualNodeStore);
  const { nodeStats, loadImbalance } = useSelector(statsStore);

  // Re-expose atoms
  const speedMultiplier = useAtom(speedMultiplierAtom);
  const numRequests = useAtom(numRequestsAtom);

  const value = {
    // Execution Status
    execution: {
      ...executionStatus,
    },

    // Stores
    stores: {
      dimensions,
      stats: {
        nodeStats,
        loadImbalance,
      },
    },

    // Atoms
    atoms: {
      numVirtualNodesPerNode,
      speedMultiplier,
      numRequests,
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
