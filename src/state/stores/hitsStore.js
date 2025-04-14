import { createStore } from '@xstate/store';

export const hitsStore = createStore({
  context: {
    hits: [],
  },
  emits: {
    hitsUpdated: () => {},
  },
  on: {
    addHit: (context, { pos }, enqueue) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newHit = { id, pos };

      const updatedHits = [newHit, ...context.hits];
      console.log('updatedHits', updatedHits);

      // Remove this specific hit after 5 seconds
      enqueue.effect(() => {
        const timeout = setTimeout(() => {
          hitsStore.trigger.removeHit({ id });
        }, 5000);

        return () => clearTimeout(timeout);
      });

      enqueue.emit.hitsUpdated({ hits: updatedHits });

      return {
        ...context,
        hits: updatedHits,
      };
    },
    removeHit: (context, { id }, enqueue) => {
      const updatedHits = context.hits.filter(hit => hit.id !== id);
      enqueue.emit.hitsUpdated({ hits: updatedHits });
      return {
        ...context,
        hits: updatedHits,
      };
    },
    clear: () => ({
      hits: [],
    }),
  },
});
