import React, { useState, useEffect } from 'react';
import { HashRingVisualisation } from './HashRingVisualisation';
import { useParticleSimulation } from '../hooks/useParticleSimulation';
import { useRingNodes } from '../hooks/useRingNodes';
import { useStats } from '../hooks/useStats';
import { useConsoleLog } from '../hooks/useConsoleLog';
import { ConsoleLog } from './ConsoleLog';
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
}) {
  const [dimensions, setDimensions] = useState({
    svgWidth: 0,
    svgHeight: 0,
    svgRadius: 0,
  });

  const [numRequests, setNumRequests] = useState(5);

  useEffect(() => {
    function calculateDimensions() {
      const pagePadding = theme.layout.pagePadding; // 64px
      const columnGap = theme.layout.columnGap; // 32px
      const containerWidth = Math.min(window.innerWidth - pagePadding, CONTAINER_MAX_WIDTH);
      const availableWidth = containerWidth - columnGap;

      const svgWidth = Math.min(
        (availableWidth * SVG_WIDTH_PERCENTAGE) / 100,
        availableWidth * 0.85
      );

      const svgHeight = svgWidth * SVG_ASPECT_RATIO;
      const svgRadius = (svgWidth / 2) * (SVG_RADIUS_PERCENTAGE / 100);

      setDimensions({ svgWidth, svgHeight, svgRadius });
    }

    calculateDimensions();

    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, [SVG_WIDTH_PERCENTAGE, SVG_ASPECT_RATIO, SVG_RADIUS_PERCENTAGE, CONTAINER_MAX_WIDTH]);

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
    metrics: false,
    documentation: false,
    legend: true,
    status: true,
    console: false,
  });

  const { logs, addLog, clearLogs } = useConsoleLog(200);

  const { stats, trackRequest, calculateDistribution, resetStats } = useStats();

  const ringNodes = useRingNodes(servers, vnodeCount);

  const handleRequestCompleted = completedParticles => {
    completedParticles.forEach(completedParticle => {
      trackRequest(completedParticle.targetNodeId);

      const targetNode = ringNodes[completedParticle.targetPos];

      const detailedMessage =
        `Request processed by ${completedParticle.targetNodeId}: Id=${completedParticle.key}, Pos=${completedParticle.initialPos.toFixed(2)}%, ` +
        `VnodeId='${targetNode.vnodeId}', VNode=#${targetNode.vnodeIndex + 1}/${vnodeCount}, VPos=${targetNode.position.toFixed(2)}%`;

      addLog(detailedMessage, 'success');
    });
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

  const { particles, hitsToRender } = useParticleSimulation({
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

  // -------------- Add / Remove servers --------------
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
      className={`mx-auto flex min-h-screen max-w-[1200px] flex-col bg-body-bg p-8 font-mono text-body-text`}
    >
      <h1
        className={`text-glow m-0 border-b-2 border-cyber-border pb-2 tracking-wider text-heading-color`}
      >
        CONSISTENT HASHING{' '}
        <span className="text-[0.8em] text-ui-text-secondary">// VISUALISATION</span>
      </h1>

      <p
        className={`border-l-[3px] border-l-btn-purple-border bg-btn-neutral-bg p-[1rem_1rem] pl-4 text-ui-text-bright`}
      >
        <span className="text-ui-text-success">:: SYSTEM STATUS</span> // Distributing requests
        across server nodes.
        <br />
        Routing algorithm: particles routed to first node clockwise on ring from hash position.
      </p>

      <div className="flex gap-4">
        {/* Visualisation Panel - Left Column */}
        <div className="flex flex-col gap-4" style={{ width: `${dimensions.svgWidth}px` }}>
          <HashRingVisualisation
            SVG_WIDTH={dimensions.svgWidth}
            SVG_HEIGHT={dimensions.svgHeight}
            SVG_RADIUS={dimensions.svgRadius}
            ringNodes={ringNodes}
            particles={particles}
            runningState={runningState}
            onRemoveServer={removeServer}
            hitsToRender={hitsToRender}
            collapsedPanels={collapsedPanels}
            togglePanel={togglePanel}
            onAddServerAtPosition={position => addServer(position)}
          />

          <ConsoleLog
            logs={logs}
            collapsed={collapsedPanels.console}
            togglePanel={() => togglePanel('console')}
          />
        </div>

        {/* Controls and Stats Panel - Right Column */}
        <div className="flex flex-1 flex-col gap-4" style={{ minWidth: 'min(15vw, 180px)' }}>
          <div className="rounded-sm border border-cyber-border bg-panel-bg p-6">
            <div className="panel-header" onClick={() => togglePanel('controls')}>
              <h3 className="panel-title panel-title-with-dot panel-title-with-dot-controls text-heading-color">
                System Controls
              </h3>
              <div className="panel-toggle">{collapsedPanels.controls ? '+' : '–'}</div>
            </div>

            <div
              className={`panel-content ${collapsedPanels.controls ? 'panel-content-collapsed' : 'panel-content-expanded'}`}
            >
              <div className="mb-4 mt-4 flex gap-2">
                <button
                  className={`btn flex-1 cursor-pointer rounded-sm border px-4 py-2 font-bold shadow-md transition-all ${
                    runningState === STATE_MACHINE.RUNNING
                      ? 'border-btn-danger-border bg-btn-danger-bg text-ui-text-bright shadow-btn-danger-shadow'
                      : 'border-btn-success-border bg-btn-success-bg text-ui-text-bright shadow-btn-success-shadow'
                  } `}
                  onClick={toggleRunning}
                >
                  {runningState === STATE_MACHINE.RUNNING ? 'HALT' : 'EXECUTE'}
                </button>

                <button
                  className="btn flex-1 cursor-pointer rounded-sm border border-cyber-border bg-btn-neutral-bg px-4 py-2 font-bold text-ui-text-bright shadow-button-glow shadow-btn-neutral-shadow"
                  onClick={resetAll}
                >
                  RESET
                </button>
              </div>

              <div className="mb-6">
                <button
                  className="btn w-full cursor-pointer rounded-sm border border-btn-purple-border bg-btn-purple-bg px-4 py-2 font-bold text-ui-text-bright shadow-button-glow shadow-btn-purple-shadow"
                  onClick={addServer}
                >
                  ADD SERVER NODE
                </button>
                <p className="mt-2 text-sm italic text-ui-text-secondary">
                  // Click node on ring to terminate server
                </p>
              </div>

              <div className="mb-4 border border-cyber-border bg-dark-cyber bg-opacity-70 p-4">
                <label className="mb-3 block text-ui-text-bright">
                  <span className="text-body-text">PARTICLE_SPEED:</span>{' '}
                  {speedMultiplier.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={speedMultiplier}
                  onChange={e => setSpeedMultiplier(Number(e.target.value))}
                  className="w-full"
                />
                <p className="mt-2 text-sm italic text-ui-text-secondary">
                  // Adjust particle travel speed
                </p>
              </div>

              <div className="mb-4 border border-cyber-border bg-dark-cyber bg-opacity-70 p-4">
                <label className="mb-3 block text-ui-text-bright">
                  <span className="text-body-text">VNODE_COUNT:</span> {vnodeCount}
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={vnodeCount}
                  onChange={e => setVnodeCount(Number(e.target.value))}
                  className="w-full"
                />
                <p className="mt-2 text-sm italic text-ui-text-secondary">
                  // Higher count = better distribution
                </p>
              </div>

              <div className="mb-4 border border-cyber-border bg-dark-cyber bg-opacity-70 p-4">
                <label className="mb-3 block text-ui-text-bright">
                  <span className="text-body-text">REQUEST_COUNT:</span> {numRequests}
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={numRequests}
                  onChange={e => setNumRequests(Number(e.target.value))}
                  className="w-full"
                />
                <p className="mt-2 text-sm italic text-ui-text-secondary">
                  // Number of concurrent requests in the system
                </p>
              </div>
            </div>
          </div>

          {/* Stats display */}
          <div className="rounded-sm border border-cyber-border bg-panel-bg p-6 font-mono">
            <div className="panel-header" onClick={() => togglePanel('metrics')}>
              <h3 className="panel-title panel-title-with-dot panel-title-with-dot-metrics text-heading-color">
                System Metrics
              </h3>
              <div className="panel-toggle">{collapsedPanels.metrics ? '+' : '–'}</div>
            </div>

            <div
              className={`panel-content ${collapsedPanels.metrics ? 'panel-content-collapsed' : 'panel-content-expanded'}`}
            >
              <div className="mt-4 border border-cyber-border bg-dark-cyber bg-opacity-70 p-4 font-mono text-[0.9rem]">
                <p className="m-0 mb-2 flex justify-between">
                  <span className="text-ui-text-secondary">SERVER_COUNT:</span>
                  <span className="text-ui-text-bright">{servers.length}</span>
                </p>
                <p className="m-0 mb-2 flex justify-between">
                  <span className="text-ui-text-secondary">VNODE_PER_SERVER:</span>
                  <span className="text-ui-text-bright">{Math.max(1, vnodeCount)}</span>
                </p>
                <p className="m-0 mb-2 flex justify-between">
                  <span className="text-ui-text-secondary">TOTAL_RING_NODES:</span>
                  <span className="text-ui-text-bright">{Object.keys(ringNodes).length}</span>
                </p>
                <p className="m-0 mb-2 flex justify-between">
                  <span className="text-ui-text-secondary">REQUESTS_PROCESSED:</span>
                  <span className="text-ui-text-bright">{stats.requestsProcessed}</span>
                </p>
                <p className="m-0 mb-2 flex justify-between">
                  <span className="text-ui-text-secondary">LOAD_IMBALANCE:</span>
                  <span
                    className={`${loadImbalance < 10 ? 'text-ui-text-success' : loadImbalance < 30 ? 'text-ui-text-warning' : 'text-ui-text-error'}`}
                  >
                    {loadImbalance.toFixed(2)}%
                  </span>
                </p>
                <p className="mt-2 text-sm italic text-ui-text-secondary">
                  // Lower imbalance = optimal distribution
                </p>
              </div>

              {servers.length > 0 && (
                <div className="mt-4 border border-cyber-border bg-dark-cyber bg-opacity-70 p-4">
                  <h4 className="m-0 mb-3 text-[0.9rem] uppercase tracking-wider text-ui-text-bright">
                    Node Load Distribution
                  </h4>
                  {/* sort lexographically */}
                  {servers
                    .sort((a, b) => a.id.localeCompare(b.id))
                    .map(server => {
                      const requests = stats.nodeStats[server.id] || 0;
                      const maxRequests = Math.max(...Object.values(stats.nodeStats), 1);
                      const percentage = Math.round((requests / maxRequests) * 100) || 0;

                      return (
                        <div key={server.id} className="mb-3">
                          <div className="mb-1 flex items-center justify-between">
                            <div className="flex items-center">
                              <div
                                className="mr-2 h-[10px] w-[10px] rounded-sm"
                                style={{
                                  background: server.color,
                                  boxShadow: `0 0 5px ${server.color}`,
                                }}
                              />
                              <span className="text-[0.9rem] text-ui-text-bright">{server.id}</span>
                            </div>
                            <span className="text-[0.9rem] text-ui-text-bright">{requests}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="relative h-[5px] w-full overflow-hidden bg-dark-cyber">
                            <div
                              className={`absolute h-full transition-[width] duration-normal ease-default`}
                              style={{
                                width: `${percentage}%`,
                                background: server.color,
                                boxShadow: `0 0 10px ${server.color}`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
