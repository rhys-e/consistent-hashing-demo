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
import { STATE_MACHINE } from '../utils/stateUtils';
import theme from '../themes';

const CYBER_COLORS = [
  '#E15759', // Neo-Tokyo Red (first node)
  '#4E79A7', // Cyber Blue (second node)
  '#59A14F', // Matrix Green
  '#F28E2B', // Neon Orange
  '#B07AA1', // Synthwave Purple
  '#76B7B2', // Teal Hologram
  '#FF9DA7', // Soft Neon Pink
  '#9D7660', // Rusted Bronze
  '#BAB0AC', // Chrome Silver
  '#D37295', // Magenta Haze
  '#FFBE7D', // Electric Amber
  '#59A14F', // Digital Lime
  '#499894', // Cyberdeck Aqua
  '#F1CE63', // Virtual Gold
  '#B6992D', // Acid Yellow
  '#86BCB6', // Terminal Green
  '#D4A6C8', // Holographic Pink
  '#499894', // Circuit Blue
  '#9D7660', // Tech Bronze
  '#D7B5A6', // Augmented Beige
];

export const sortNodes = nodeArray => {
  return nodeArray.slice().sort((a, b) => a.position - b.position);
};

function generateRandomCyberColor() {
  const hue = Math.floor(Math.random() * 360); // Random hue
  const saturation = 70 + Math.floor(Math.random() * 30); // High saturation (70-100%)
  const lightness = 50 + Math.floor(Math.random() * 15); // Medium-high lightness (50-65%)

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function App({
  SVG_WIDTH_PERCENTAGE,
  SVG_ASPECT_RATIO,
  SVG_RADIUS_PERCENTAGE,
  CONTAINER_MAX_WIDTH = 1200,
  initialNodeCount = 2,
  initialVnodeCount = 2,
  initialNumRequests = 1,
}) {
  const [dimensions, setDimensions] = useState({
    svgWidth: 0,
    svgHeight: 0,
    svgRadius: 0,
  });

  const [numRequests, setNumRequests] = useState(initialNumRequests);
  const { isMobile } = useResponsive(950);
  const NUM_STACKS = 5;

  useEffect(() => {
    function calculateDimensions() {
      const pagePadding = isMobile ? 0 : theme.layout.pagePadding;
      const columnGap = isMobile ? 0 : theme.layout.columnGap;
      const containerWidth = Math.min(window.innerWidth - pagePadding, CONTAINER_MAX_WIDTH);
      const availableWidth = containerWidth - columnGap;

      const svgWidth = isMobile
        ? availableWidth
        : Math.min((availableWidth * SVG_WIDTH_PERCENTAGE) / 100, availableWidth * 0.85);

      const svgHeight = svgWidth * SVG_ASPECT_RATIO;
      const svgRadius = (svgWidth / 2) * (SVG_RADIUS_PERCENTAGE / 100);
      setDimensions({ svgWidth, svgHeight, svgRadius });
    }

    calculateDimensions();

    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, [
    SVG_WIDTH_PERCENTAGE,
    SVG_ASPECT_RATIO,
    SVG_RADIUS_PERCENTAGE,
    CONTAINER_MAX_WIDTH,
    isMobile,
  ]);

  // Physical servers
  const [servers, setServers] = useState(() => {
    const initialServers = [];
    for (let i = 0; i < initialNodeCount; i++) {
      initialServers.push({
        id: `Node ${String.fromCharCode(65 + i)}`,
        color: CYBER_COLORS[i % CYBER_COLORS.length],
        basePosition: Math.random(),
      });
    }
    return initialServers;
  });

  const [vnodeCount, setVnodeCount] = useState(initialVnodeCount);
  const [runningState, setRunningState] = useState(STATE_MACHINE.INIT);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
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
    if (runningState !== STATE_MACHINE.RUNNING) {
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
    runningState,
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
    if (servers.length > 0 && runningState === STATE_MACHINE.RUNNING) {
      addLog(`Server configuration updated: ${servers.length} nodes active`, 'info');
    }
  }, [servers, addLog, runningState]);

  useEffect(() => {
    if (runningState === STATE_MACHINE.RUNNING) {
      addLog(`Virtual node count set to ${vnodeCount}`, 'info');
    }
  }, [vnodeCount, addLog, runningState]);

  useEffect(() => {
    if (runningState === STATE_MACHINE.RUNNING) {
      addLog('Simulation started', 'info');
    } else if (runningState === STATE_MACHINE.PAUSED) {
      addLog('Simulation paused', 'info');
    } else if (runningState === STATE_MACHINE.STOPPED) {
      addLog('Simulation stopped', 'info');
    }
  }, [runningState, addLog]);

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
    setServers([...servers, newSrv]);
    addLog(`Added new server: ${newId}`, 'info');
  };

  const removeServer = id => {
    if (servers.length === 1) return;
    setServers(servers.filter(srv => srv.id !== id));
    addLog(`Removed server: ${id}`, 'warning');
  };

  const resetAll = () => {
    const initialServers = [];
    for (let i = 0; i < initialNodeCount; i++) {
      initialServers.push({
        id: `Node ${String.fromCharCode(65 + i)}`,
        color: CYBER_COLORS[i % CYBER_COLORS.length],
        basePosition: Math.random(),
      });
    }
    setServers(initialServers);
    setVnodeCount(initialVnodeCount);
    setRunningState(STATE_MACHINE.INIT);
    setNumRequests(initialNumRequests);
    resetStats();
    clearLogs();
    addLog('System reset to initial state', 'info');
  };

  const toggleRunning = () => {
    setRunningState(prev =>
      prev === STATE_MACHINE.RUNNING ? STATE_MACHINE.PAUSED : STATE_MACHINE.RUNNING
    );
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
            runningState={runningState}
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
            runningState={runningState}
            toggleRunning={toggleRunning}
            resetAll={resetAll}
            addServer={addServer}
            speedMultiplier={speedMultiplier}
            setSpeedMultiplier={setSpeedMultiplier}
            vnodeCount={vnodeCount}
            setVnodeCount={setVnodeCount}
            numRequests={numRequests}
            setNumRequests={setNumRequests}
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
