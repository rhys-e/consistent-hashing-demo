import { createStore } from '@xstate/store';
import { CYBER_COLORS } from '../constants/colors';

function generateRandomCyberColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.floor(Math.random() * 30);
  const lightness = 50 + Math.floor(Math.random() * 15);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export const createInitialServers = () => {
  return [
    {
      id: 'Node A',
      color: CYBER_COLORS[0],
    },
    {
      id: 'Node B',
      color: CYBER_COLORS[1],
    },
  ];
};

export const serversStore = createStore({
  context: {
    servers: createInitialServers(),
  },
  on: {
    add: context => {
      // Find next available ID
      let newId = `Node ${String.fromCharCode(65)}`;
      let colorIndex = 0;
      while (context.servers.some(srv => srv.id === newId)) {
        colorIndex++;
        newId = `Node ${String.fromCharCode(65 + colorIndex)}`;
      }

      const newColor =
        colorIndex < CYBER_COLORS.length ? CYBER_COLORS[colorIndex] : generateRandomCyberColor();

      const newServer = {
        id: newId,
        color: newColor,
      };

      return {
        ...context,
        servers: [...context.servers, newServer],
      };
    },
    remove: (context, { id }) => {
      if (context.servers.length === 1) return context;
      return {
        ...context,
        servers: context.servers.filter(srv => srv.id !== id),
      };
    },
    reset: () => createInitialServers(),
  },
});
