import { createAtom } from '@xstate/store';
import { INITIAL_NUM_REQUESTS } from '../constants/state';

export const numRequestsAtom = createAtom(INITIAL_NUM_REQUESTS);
