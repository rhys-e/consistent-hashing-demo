import { useState, useEffect } from 'react';
import { hashString } from '../utils/hashString';

export function useRingNodes(servers, vnodeCount) {
  const [ringNodes, setRingNodes] = useState({});

  useEffect(() => {
    const updateRingNodes = async () => {
      const newRingNodes = {};

      for (const srv of servers) {
        for (let i = 0; i < Math.max(1, vnodeCount); i++) {
          const vnodeId = `${srv.id}-v${i}`;
          const { normalised, base64 } = await hashString(vnodeId);

          newRingNodes[normalised] = {
            id: srv.id,
            color: srv.color,
            position: normalised,
            hash: base64,
            isVNode: true,
            vnodeId: vnodeId,
            vnodeIndex: i,
          };
        }
      }

      setRingNodes(newRingNodes);
    };

    updateRingNodes();
  }, [servers, vnodeCount]);

  return ringNodes;
}
