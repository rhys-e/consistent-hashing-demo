import { createContext, useContext, useEffect } from 'react';
import { useExecutionStatus } from '../hooks/useExecutionStatus';
import { useSelector, useAtom } from '../hooks/useStore';
import { serversStore, dimensionsStore, statsStore } from '../state/stores';
import { vnodeCountAtom, speedMultiplierAtom, numRequestsAtom } from '../state/atoms';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Re-expose hooks
  const executionStatus = useExecutionStatus();
  const { event: serversEvent, servers } = useSelector(serversStore);
  const dimensions = useSelector(dimensionsStore);
  const { nodeStats, loadImbalance } = useSelector(statsStore);

  // Re-expose atoms
  const vnodeCount = useAtom(vnodeCountAtom);
  const speedMultiplier = useAtom(speedMultiplierAtom);
  const numRequests = useAtom(numRequestsAtom);

  useEffect(() => {
    if (serversEvent?.type === 'remove') {
      // addLog(`Removed server: ${serversEvent.payload}`, 'warning');
    }
  }, [serversEvent]);

  const value = {
    // Execution Status
    execution: {
      ...executionStatus,
    },

    // Stores
    stores: {
      servers,
      dimensions,
      stats: {
        nodeStats,
        loadImbalance,
      },
    },

    // Atoms
    atoms: {
      vnodeCount,
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
