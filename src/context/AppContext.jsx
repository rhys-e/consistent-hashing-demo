import { createContext, useContext } from 'react';
import { userRequestStore, virtualNodeStore, dimensionsStore } from '../state/stores';
import { useExecutionStatus } from '../hooks/useExecutionStatus';
import { useSystemLogging } from '../hooks/useSystemLogging';
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
  const userRequests = useSelector(userRequestStore, state => state.context.userRequests);

  const systemLogging = useSystemLogging();
  const speedMultiplier = useSelector(speedMultiplierAtom, state => state);

  const { virtualNodes, numVirtualNodesPerNode } = virtualNodesState.context;
  const { numRequests } = userRequestsState.context;

  const particleSimulation = useParticleSimulation({
    virtualNodes,
    speedMultiplier,
    numVirtualNodesPerNode,
    reroutedCallback: () => {},
    requestCompletedCallback: () => {},
    numRequests,
    dimensions,
  });

  const { start, pause, resume } = particleSimulation;

  const executionStatus = useExecutionStatus({
    onExecutionStatusChange: (executionStatus, { RUNNING, PAUSED }) => {
      console.log('executionStatus', executionStatus);
      if (executionStatus === RUNNING) {
        console.log('starting');
        start();
      } else if (executionStatus === PAUSED) {
        console.log('pausing');
        pause();
      }
    },
  });

  return (
    <AppContext
      value={{
        userRequests,
        executionStatus,
        systemLogging,
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
