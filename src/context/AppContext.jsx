import { createContext, useContext, useEffect, useMemo } from 'react';
import {
  userRequestStore,
  nodeStore,
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
import { useNodes } from '../hooks/useNodes';

const AppContext = createContext();

function AppProvider({ children, isMobile }) {
  // the initial vlaues for these things are calculated async, so we need to wait for them to be ready
  const userRequestsState = useSelector(userRequestStore, state => state);
  const dimensions = useSelector(dimensionsStore, state => state.context);
  const nodesState = useNodes();

  if (
    userRequestsState.context.userReqCache.length === 0 ||
    nodesState.virtualNodes.length === 0 ||
    dimensions.svgWidth === 0
  ) {
    return <div>Loading...</div>;
  }

  return (
    <AppWrapper
      userRequestsState={userRequestsState}
      nodesState={nodesState}
      dimensions={dimensions}
      isMobile={isMobile}
    >
      {children}
    </AppWrapper>
  );
}

function AppWrapper({ userRequestsState, nodesState, dimensions, isMobile, children }) {
  const speedMultiplier = useSelector(speedMultiplierAtom, state => state);
  const { hits } = useSelector(hitsStore, state => state.context);
  const { virtualNodes, numVirtualNodesPerNode } = nodesState;
  const userRequests = userRequestsState.context.userReqCache;
  const speed = useMemo(() => ({ speedMultiplier, particleSpeed }), [speedMultiplier]);

  const addLog = (message, type = 'info') => {
    consoleLogStore.trigger.log({ message, msgType: type });
  };

  const onUserRequestCompleted = event => {
    const { targetNode, id, ringStartPos, ringEndPos } = event.data;
    statsStore.trigger.incrementNodeStats({ nodeId: targetNode.nodeId });

    // Add hit effect at the target node's position
    hitsStore.trigger.addHit({
      pos: ringEndPos,
    });

    const detailedMessage =
      `Request processed by ${targetNode.nodeId}: Id=${id}, Pos=${ringStartPos.toFixed(2)}%, ` +
      `VnodeId='${targetNode.vnodeId}', VNode=#${targetNode.vnodeIndex + 1}/${numVirtualNodesPerNode}, VPos=${targetNode.position.toFixed(2)}%`;
    addLog(detailedMessage, 'success');
  };

  const onCycleCompleted = async () => {
    const { virtualNodes: nextVirtualNodes } = await nodesState.onCycleComplete();
    topologyReady({ userRequests, virtualNodes: nextVirtualNodes, speed });
  };

  const { start, pause, resume, stop, update, topologyReady, particleRefs } = useParticleSimulation(
    {
      userRequests,
      virtualNodes,
      speed,
      numVirtualNodesPerNode,
      onUserRequestCompleted,
      onCycleCompleted,
    }
  );

  useEffect(() => {
    const subscriptions = [];
    subscriptions.push(
      speedMultiplierAtom.subscribe(newSpeedMultiplier => {
        update({ speed: { speedMultiplier: newSpeedMultiplier, particleSpeed } });
      })
    );
    subscriptions.push(
      nodeStore.on('nodeAdded', event => {
        addLog(`Added new node: ${event.node.id}, nodes active: ${event.nodesLength}`);
      })
    );
    subscriptions.push(
      nodeStore.on('nodeRemoved', event => {
        addLog(`Removed node: ${event.id}, nodes active: ${event.nodesLength}`, 'warning');
      })
    );
    subscriptions.push(
      nodeStore.on('nodesReset', () => {
        consoleLogStore.trigger.clear();
        addLog('System reset to initial state');
      })
    );
    subscriptions.push(
      virtualNodeStore.on('vnodeCountChanged', event => {
        addLog(`Virtual node count set to ${event.count}, total: ${event.nodesLength}`);
      })
    );
    return () => subscriptions.forEach(subscription => subscription.unsubscribe());
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
        addLog,
        executionStatus,
        particleRefs,
        isMobile,
        dimensions,
        hits,
        nodes: nodesState,
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
