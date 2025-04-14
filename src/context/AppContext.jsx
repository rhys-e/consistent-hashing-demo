import { createContext, useContext, useEffect } from 'react';
import {
  userRequestStore,
  virtualNodeStore,
  dimensionsStore,
  consoleLogStore,
  statsStore,
  hitsStore,
} from '../state/stores';
import { useExecutionStatus } from '../hooks/useExecutionStatus';
import { useSelector } from '@xstate/store/react';
import { useParticleSimulation } from '../hooks/useParticleSimulation';
import { speedMultiplierAtom } from '../state/atoms';
import { withResponsiveDimensions } from '../hocs/withResponsiveDimensions';
import { PARTICLE_SPEED as particleSpeed } from '../constants/state';

const AppContext = createContext();

function AppProvider({ children, isMobile }) {
  // the initial vlaues for these things are calculated async, so we need to wait for them to be ready
  const userRequestsState = useSelector(userRequestStore, state => state);
  const virtualNodesState = useSelector(virtualNodeStore, state => state);
  const dimensions = useSelector(dimensionsStore, state => state.context);

  if (
    userRequestsState.context.userReqCache.length === 0 ||
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
  const { hits } = useSelector(hitsStore, state => state.context);
  const { virtualNodes, numVirtualNodesPerNode } = virtualNodesState.context;
  const userRequests = userRequestsState.context.userReqCache;

  const addLog = (message, type = 'info') => {
    consoleLogStore.trigger.log({ message, msgType: type });
  };

  const onUserRequestCompleted = event => {
    const { targetNode, id, ringStartPos, ringEndPos } = event.data;
    statsStore.trigger.incrementNodeStats({ nodeId: targetNode.id });

    // Add hit effect at the target node's position
    hitsStore.trigger.addHit({
      pos: ringEndPos,
    });

    const detailedMessage =
      `Request processed by ${targetNode.id}: Id=${id}, Pos=${ringStartPos.toFixed(2)}%, ` +
      `VnodeId='${targetNode.vnodeId}', VNode=#${targetNode.vnodeIndex + 1}/${numVirtualNodesPerNode}, VPos=${targetNode.position.toFixed(2)}%`;
    addLog(detailedMessage, 'success');
  };

  const onCycleCompleted = () => {
    // update the simulation with the new user requests and virtual nodes before the next cycle starts
    update({ userRequests, virtualNodes });
  };

  const { start, pause, resume, update, particleRefs } = useParticleSimulation({
    userRequests,
    virtualNodes,
    speed: { speedMultiplier, particleSpeed },
    numVirtualNodesPerNode,
    onUserRequestCompleted,
    onCycleCompleted,
  });

  useEffect(() => {
    const subscriptions = [];
    subscriptions.push(
      speedMultiplierAtom.subscribe(newSpeedMultiplier => {
        update({ speed: { speedMultiplier: newSpeedMultiplier, particleSpeed } });
      })
    );
    subscriptions.push(
      virtualNodeStore.on('nodeAdded', event => {
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
        addLog(`Virtual node count set to ${event.count}, total: ${event.total}`);
      })
    );
    return () => {
      subscriptions.forEach(subscription => subscription.unsubscribe());
    };
  }, [update]);

  const executionStatus = useExecutionStatus({
    onExecutionStatusChange: (
      { prevExecutionStatus, newExecutionStatus },
      { STOPPED, RUNNING, PAUSED }
    ) => {
      if (prevExecutionStatus === PAUSED && newExecutionStatus === RUNNING) {
        resume();
      } else if (newExecutionStatus === RUNNING) {
        start();
      } else if (newExecutionStatus === PAUSED) {
        pause();
      } else if (newExecutionStatus === STOPPED) {
        stop();
      }
    },
  });

  return (
    <AppContext
      value={{
        userRequests,
        executionStatus,
        particleRefs,
        isMobile,
        dimensions,
        hits,
        nodes: virtualNodesState.context,
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
