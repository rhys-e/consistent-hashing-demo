import { createAtom } from '@xstate/store';
import { INITIAL_SPEED_MULTIPLIER } from '../../constants/state';

export const speedMultiplierAtom = createAtom(INITIAL_SPEED_MULTIPLIER);
