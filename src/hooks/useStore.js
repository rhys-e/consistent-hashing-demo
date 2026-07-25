import { useSelector as useXstateSelector } from '@xstate/store/react';

export function useSelector(store) {
  return useXstateSelector(store, state => state.context);
}

export function useAtom(atom) {
  return useXstateSelector(atom, state => state);
}
