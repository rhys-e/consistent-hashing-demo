import { useMemo } from 'react';
import * as d3 from 'd3';
import { angleScale, toXY } from '../utils/geometryUtils';
import theme from '../themes';

export function useHashRingSegments(virtualNodes, width, height, radius) {
  return useMemo(() => {
    if (!virtualNodes || virtualNodes.length < 2) return [];

    const segments = [];
    const sortedNodes = virtualNodes;

    for (let i = 0; i < sortedNodes.length; i++) {
      const current = sortedNodes[i];
      // The node that owns this segment is the NEXT node clockwise
      const nextNodeIndex = (i + 1) % sortedNodes.length;
      const nextNode = sortedNodes[nextNodeIndex];

      // Calculate if this segment wraps around the circle
      const wrapsAround = nextNode.position < current.position;

      // Get the exact node coordinates
      const [startX, startY] = toXY(current.position, width, height, radius);
      const [endX, endY] = toXY(nextNode.position, width, height, radius);

      // Pre-calculate the arc path data
      const startAngle = angleScale(current.position);
      let endAngle = angleScale(nextNode.position);

      // Handle wrap-around case
      if (wrapsAround) {
        endAngle = angleScale(nextNode.position + 1);
      }

      // Calculate the arc path
      const arcPath = d3
        .arc()
        .innerRadius(radius - theme.hashRing.segment.width / 2)
        .outerRadius(radius + theme.hashRing.segment.width / 2)
        .startAngle(startAngle)
        .endAngle(endAngle)
        .cornerRadius(0)();

      segments.push({
        start: current.position,
        end: nextNode.position,
        wrapsAround: wrapsAround,
        color: nextNode.color,
        id: nextNode.id,
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
        arcPath: arcPath,
      });
    }

    return segments;
  }, [virtualNodes, width, height, radius]);
}
