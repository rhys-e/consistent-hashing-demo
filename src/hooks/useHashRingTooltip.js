import { useState, useCallback } from 'react';

export function useHashRingTooltip(virtualNodes) {
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: '',
  });

  const handleNodeMouseEnter = useCallback(
    (x, y, node) => {
      const serverVnodeCounts = {};
      virtualNodes.forEach(n => {
        serverVnodeCounts[n.id] = (serverVnodeCounts[n.id] || 0) + 1;
      });

      setTooltip({
        visible: true,
        x: x,
        y: y - 20,
        content: `${node.id}: vnode ${node.vnodeIndex + 1} of ${serverVnodeCounts[node.id] || '?'} [${(node.position * 100).toFixed(1)}%]`,
      });
    },
    [virtualNodes]
  );

  const handleNodeMouseLeave = useCallback(() => {
    setTooltip({ visible: false });
  }, []);

  return {
    tooltip,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
  };
}
