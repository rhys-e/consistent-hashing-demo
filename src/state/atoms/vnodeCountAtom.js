import { createAtom } from '@xstate/store';
import { INITIAL_VNODE_COUNT } from '../../constants/state';

export const vnodeCountAtom = createAtom(INITIAL_VNODE_COUNT);
