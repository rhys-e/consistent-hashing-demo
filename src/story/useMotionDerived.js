import { useCallback, useSyncExternalStore } from 'react';

/**
 * A React value derived from a motion value.
 *
 * `read` must return a primitive, or the same reference when nothing changed.
 * React compares snapshots by identity, so a fresh object every call re-renders
 * forever.
 */
export function useMotionDerived(value, read) {
  // Only `subscribe`'s identity decides whether React tears down the listener.
  const subscribe = useCallback(notify => value.on('change', notify), [value]);
  const snapshot = () => read(value.get());

  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export default useMotionDerived;
