import { createAtom } from '@xstate/store';
import { INITIAL_NUM_REQUESTS } from '../constants/state';

const numRequestsAtom = createAtom(INITIAL_NUM_REQUESTS);

const resetNumRequests = () => numRequestsAtom.set(INITIAL_NUM_REQUESTS);

export { numRequestsAtom, resetNumRequests };
