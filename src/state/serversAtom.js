import { createAtom } from '@xstate/store';
import { CYBER_COLORS } from '../constants/colors';
import { INITIAL_NODE_COUNT } from '../constants/state';

export function createInitialServers(count = INITIAL_NODE_COUNT) {
  const initialServers = [];
  for (let i = 0; i < count; i++) {
    initialServers.push({
      id: `Node ${String.fromCharCode(65 + i)}`,
      color: CYBER_COLORS[i % CYBER_COLORS.length],
      basePosition: Math.random(),
    });
  }
  return initialServers;
}

export const serversAtom = createAtom(createInitialServers());
