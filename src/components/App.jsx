import React, { useState, useEffect } from 'react';
import { HashRingVisualisation } from './HashRingVisualisation';
import { useParticleSimulation } from '../hooks/useParticleSimulation';
import { useRingNodes } from '../hooks/useRingNodes';
import { useStats } from '../hooks/useStats';
import { useConsoleLog } from '../hooks/useConsoleLog';
import { useResponsive } from '../hooks/useResponsive';
import { ConsoleLog } from './ConsoleLog';
import { Header } from './Header';
import { ControlsPanel } from './ControlsPanel';
import { MetricsPanel } from './MetricsPanel';
import { useExecutionStatus, EXECUTION_STATES } from '../hooks/useExecutionStatus';
import { withResponsiveDimensions } from '../hocs/withResponsiveDimensions';
import { useStore, useAtom } from '../hooks/useStore';
import { numRequestsAtom } from '../state/numRequestsAtom';
import { dimensionsStore } from '../state/dimensionsStore';
import { serversAtom, createInitialServers } from '../state/serversAtom';
import { speedMultiplierAtom } from '../state/speedMultiplierAtom';
import { CYBER_COLORS } from '../constants/colors';
import { INITIAL_NUM_REQUESTS, INITIAL_SPEED_MULTIPLIER } from '../constants/state';

export const sortNodes = nodeArray => {
  return nodeArray.slice().sort((a, b) => a.position - b.position);
};

function generateRandomCyberColor() {
  const hue = Math.floor(Math.random() * 360); // Random hue
  const saturation = 70 + Math.floor(Math.random() * 30); // High saturation (70-100%)
  const lightness = 50 + Math.floor(Math.random() * 15); // Medium-high lightness (50-65%)

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function AppComponent({ initialVnodeCount = 2 }) {
  const dimensions = useStore(dimensionsStore);
  const numRequests = useAtom(numRequestsAtom);
  const servers = useAtom(serversAtom);
  const speedMultiplier = useAtom(speedMultiplierAtom);
  const { isMobile } = useResponsive({ breakpoint: 950 });
  const NUM_STACKS = 5;

  const { getState } = useExecutionStatus();
  const executionStatus = getState();

  const [vnodeCount, setVnodeCount] = useState(initialVnodeCount);
  const [collapsedPanels, setCollapsedPanels] = useState({
    controls: false,
    metrics: true,
    documentation: false,
    legend: true,
    status: true,
    console: true,
  });

  const { logs, addLog, clearLogs } = useConsoleLog(200);

  const { stats, trackRequest, calculateDistribution, resetStats } = useStats();

  const ringNodes = useRingNodes(servers, vnodeCount);

  const handleRequestCompleted = (node, completedParticle) => {
    trackRequest(node.id);

    const detailedMessage =
      `Request processed by ${node.id}: Id=${completedParticle.data.id}, Pos=${completedParticle.data.ringStartPos.toFixed(2)}%, ` +
      `VnodeId='${node.vnodeId}', VNode=#${node.vnodeIndex + 1}/${vnodeCount}, VPos=${node.position.toFixed(2)}%`;

    addLog(detailedMessage, 'success');
  };

  const handleReroutedParticles = reroutedParticles => {
    if (executionStatus !== EXECUTION_STATES.RUNNING) {
      return;
    }

    // group rerouted particles by target node
    const targetNodes = {};
    reroutedParticles.forEach(reroutedParticle => {
      if (!targetNodes[reroutedParticle.targetNodeId]) {
        targetNodes[reroutedParticle.targetNodeId] = [];
      }
      targetNodes[reroutedParticle.targetNodeId].push(reroutedParticle);
    });

    Object.keys(targetNodes).forEach(targetNodeId => {
      const percentage = Math.round((targetNodes[targetNodeId].length / numRequests) * 100);
      addLog(
        `Rerouted ${targetNodes[targetNodeId].length} requests to ${targetNodeId} (${percentage}%)`,
        'warning'
      );
    });
  };

  const { pCurPos, pRingInitialPos, hitsToRender, renderNodes } = useParticleSimulation({
    ringNodes,
    speedMultiplier,
    vnodeCount,
    reroutedCallback: handleReroutedParticles,
    requestCompletedCallback: handleRequestCompleted,
    numRequests,
    dimensions: {
      SVG_WIDTH: dimensions.svgWidth,
      SVG_HEIGHT: dimensions.svgHeight,
      SVG_RADIUS: dimensions.svgRadius,
    },
  });

  useEffect(() => {
    if (servers.length > 0 && executionStatus === EXECUTION_STATES.RUNNING) {
      addLog(`Server configuration updated: ${servers.length} nodes active`, 'info');
    }
  }, [servers, addLog, executionStatus]);

  useEffect(() => {
    if (executionStatus === EXECUTION_STATES.RUNNING) {
      addLog(`Virtual node count set to ${vnodeCount}`, 'info');
    }
  }, [vnodeCount, addLog, executionStatus]);

  useEffect(() => {
    if (executionStatus === EXECUTION_STATES.RUNNING) {
      addLog('Simulation started', 'info');
    } else if (executionStatus === EXECUTION_STATES.PAUSED) {
      addLog('Simulation paused', 'info');
    } else if (executionStatus === EXECUTION_STATES.STOPPED) {
      addLog('Simulation stopped', 'info');
    }
  }, [executionStatus, addLog]);

  const addServer = (position = null) => {
    // due to node removals. it's possible to create clashes with existing IDs
    // so we need to check if the new ID already exists and cycle through the alphabet
    let newId = `Node ${String.fromCharCode(65)}`;
    let colorIndex = 0;
    while (servers.some(srv => srv.id === newId)) {
      colorIndex++;
      newId = `Node ${String.fromCharCode(65 + colorIndex)}`;
    }

    const newColor =
      colorIndex < CYBER_COLORS.length ? CYBER_COLORS[colorIndex] : generateRandomCyberColor();

    const newSrv = {
      id: newId,
      color: newColor,
      basePosition: position,
    };
    serversAtom.set([...servers, newSrv]);
    addLog(`Added new server: ${newId}`, 'info');
  };

  const removeServer = id => {
    if (servers.length === 1) return;
    serversAtom.set(servers.filter(srv => srv.id !== id));
    addLog(`Removed server: ${id}`, 'warning');
  };

  const resetAll = () => {
    serversAtom.set(createInitialServers());
    setVnodeCount(initialVnodeCount);
    speedMultiplierAtom.set(INITIAL_SPEED_MULTIPLIER);
    numRequestsAtom.set(INITIAL_NUM_REQUESTS);
    resetStats();
    clearLogs();
    addLog('System reset to initial state', 'info');
  };

  const loadImbalance = calculateDistribution();

  const togglePanel = panelName => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panelName]: !prev[panelName],
    }));
  };

  return (
    <div
      className={`mx-auto flex min-h-screen max-w-[1200px] flex-col bg-body-bg p-0 font-mono text-body-text md:p-8`}
    >
      <Header stackCount={NUM_STACKS} />

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Visualisation Panel */}
        <div
          className="flex w-full flex-col gap-4 md:w-auto"
          style={{ width: isMobile ? '100%' : `${dimensions.svgWidth}px` }}
        >
          <HashRingVisualisation
            dimensions={dimensions}
            ringNodes={renderNodes}
            pCurPos={pCurPos}
            pRingInitialPos={pRingInitialPos}
            onRemoveServer={removeServer}
            hitsToRender={hitsToRender}
            collapsedPanels={collapsedPanels}
            togglePanel={togglePanel}
            onAddServerAtPosition={position => addServer(position)}
          />

          <div className="hidden md:block">
            <ConsoleLog
              logs={logs}
              collapsed={collapsedPanels.console}
              togglePanel={() => togglePanel('console')}
            />
          </div>
        </div>

        {/* Controls and Stats Panel */}
        <div
          className="flex flex-1 flex-col gap-4"
          style={{ minWidth: isMobile ? '100%' : 'min(15vw, 180px)' }}
        >
          {/* Controls Panel */}
          <ControlsPanel
            collapsed={collapsedPanels.controls}
            togglePanel={() => togglePanel('controls')}
            resetAll={resetAll}
            addServer={addServer}
            vnodeCount={vnodeCount}
            setVnodeCount={setVnodeCount}
            numRequests={numRequests}
            setNumRequests={numRequestsAtom.set}
            dimensions={dimensions}
          />

          {/* Stats display */}
          <MetricsPanel
            collapsed={collapsedPanels.metrics}
            togglePanel={() => togglePanel('metrics')}
            stats={stats}
            servers={servers}
            vnodeCount={vnodeCount}
            loadImbalance={loadImbalance}
            ringNodes={ringNodes}
          />
        </div>
      </div>
      <a
        href="https://github.com/rhys-e/consistent-hashing-demo"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-sm p-0 pb-2 text-[0.65em] text-ui-text-secondary no-underline transition-colors duration-200 hover:text-ui-text-primary"
      >
        <span className="tracking-wide">[SOURCE]</span>
      </a>
    </div>
  );
}

export const App = withResponsiveDimensions(AppComponent);
