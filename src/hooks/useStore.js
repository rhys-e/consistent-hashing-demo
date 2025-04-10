import { useSelector } from '@xstate/store/react';

export function useStore(store) {
  return useSelector(store, state => state.context);
}

export function useAtom(atom) {
  return useSelector(atom, state => state);
}
