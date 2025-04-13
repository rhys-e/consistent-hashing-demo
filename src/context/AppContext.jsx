import { createContext, useContext, useEffect } from 'react';
import {
  userRequestStore,
  virtualNodeStore,
  dimensionsStore,
  consoleLogStore,
} from '../state/stores';
import { useExecutionStatus } from '../hooks/useExecutionStatus';
import { useSelector } from '@xstate/store/react';
import { useParticleSimulation } from '../hooks/useParticleSimulation';
import { speedMultiplierAtom } from '../state/atoms';
import { withResponsiveDimensions } from '../hocs/withResponsiveDimensions';
const AppContext = createContext();

function AppProvider({ children, isMobile }) {
  // the initial vlaues for these things are calculated async, so we need to wait for them to be ready
  const userRequestsState = useSelector(userRequestStore, state => state);
  const virtualNodesState = useSelector(virtualNodeStore, state => state);
  const dimensions = useSelector(dimensionsStore, state => state.context);

  if (
    userRequestsState.context.hashCache.length === 0 ||
    Object.keys(virtualNodesState.context.virtualNodes).length === 0 ||
    dimensions.svgWidth === 0
  ) {
    return <div>Loading...</div>;
  }

  return (
    <AppWrapper
      userRequestsState={userRequestsState}
      virtualNodesState={virtualNodesState}
      dimensions={dimensions}
      isMobile={isMobile}
    >
      {children}
    </AppWrapper>
  );
}

function AppWrapper({ userRequestsState, virtualNodesState, dimensions, isMobile, children }) {
  const speedMultiplier = useSelector(speedMultiplierAtom, state => state);

  const { virtualNodes, numVirtualNodesPerNode } = virtualNodesState.context;
  const userRequests = userRequestsState.context.hashCache;

  const addLog = (message, type = 'info') => {
    consoleLogStore.trigger.log({ message, msgType: type, maxLogCount: 200 });
  };

  const particleSimulation = useParticleSimulation({
    userRequests,
    virtualNodes,
    speedMultiplier,
    numVirtualNodesPerNode,
    reroutedCallback: () => {},
    requestCompletedCallback: () => {},
    dimensions,
  });

  const { start, pause, resume, update } = particleSimulation;

  useEffect(() => {
    const subscriptions = [];
    subscriptions.push(
      dimensionsStore.subscribe(dimensions => {
        update({ dimensions: dimensions.context });
      })
    );
    subscriptions.push(
      userRequestStore.subscribe(userRequests => {
        update({ userRequests: userRequests.context.hashCache });
      })
    );
    subscriptions.push(
      virtualNodeStore.subscribe(virtualNodes => {
        update({ virtualNodes: virtualNodes.context.virtualNodes });
      })
    );
    subscriptions.push(
      virtualNodeStore.on('nodeAdded', event => {
        console.log(event);
        addLog(`Added new node: ${event.node.id}, nodes active: ${event.total}`);
      })
    );
    subscriptions.push(
      virtualNodeStore.on('nodeRemoved', event => {
        addLog(`Removed node: ${event.id}, nodes active: ${event.total}`, 'warning');
      })
    );
    subscriptions.push(
      virtualNodeStore.on('nodesReset', () => {
        consoleLogStore.trigger.clear();
        addLog('System reset to initial state');
      })
    );
    subscriptions.push(
      virtualNodeStore.on('vnodeCountChanged', event => {
        console.log(event);
        addLog(`Virtual node count set to ${event.count}, total: ${event.total}`);
      })
    );
    return () => {
      subscriptions.forEach(subscription => subscription.unsubscribe());
    };
  }, [update]);

  const executionStatus = useExecutionStatus({
    onExecutionStatusChange: ({ prevExecutionStatus }, { STOPPED, RUNNING, PAUSED }) => {
      if (prevExecutionStatus === STOPPED) {
        start();
      } else if (prevExecutionStatus === RUNNING) {
        pause();
      } else if (prevExecutionStatus === PAUSED) {
        resume();
      }
    },
  });

  return (
    <AppContext
      value={{
        userRequests,
        executionStatus,
        particleSimulation,
        isMobile,
      }}
    >
      {children}
    </AppContext>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export const AppProviderWrapper = withResponsiveDimensions(AppProvider);
export { AppProviderWrapper as AppProvider };
