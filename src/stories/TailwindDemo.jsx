import React from 'react';

export const TailwindDemo = () => {
  return (
    <div className="min-h-screen bg-dark-cyber p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-glow mb-6 font-orbitron text-3xl text-neo-red">
          Tailwind CSS + Cyber Demo
        </h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="cyber-panel">
            <h2 className="mb-4 border-b border-cyber-border pb-2 font-mono text-xl text-cyan-400">
              System Controls
            </h2>
            <div className="space-y-4">
              <button className="control-button w-full border-matrix-green bg-matrix-green/80 text-white">
                EXECUTE
              </button>
              <button className="control-button w-full border-neo-red bg-neo-red/80 text-white">
                TERMINATE
              </button>
            </div>
          </div>

          <div className="cyber-panel">
            <h2 className="mb-4 border-b border-cyber-border pb-2 font-mono text-xl text-teal-hologram">
              Statistics
            </h2>
            <ul className="space-y-2 font-mono text-sm">
              <li className="flex justify-between">
                <span className="text-gray-400">SERVER_COUNT:</span>
                <span className="text-white">4</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-400">VNODE_PER_SERVER:</span>
                <span className="text-white">5</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-400">TOTAL_RING_NODES:</span>
                <span className="text-white">20</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-400">REQUESTS_PROCESSED:</span>
                <span className="text-white">42</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailwindDemo;
