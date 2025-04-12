import { createAtom } from '@xstate/store';
import { INITIAL_VNODE_COUNT } from '../../constants/state';

const vnodeCountAtom = createAtom(INITIAL_VNODE_COUNT);

const resetVnodeCount = () => vnodeCountAtom.set(INITIAL_VNODE_COUNT);

export { vnodeCountAtom, resetVnodeCount };
