import { createAtom } from '@xstate/store';
import { INITIAL_SPEED_MULTIPLIER } from '../../constants/state';

const speedMultiplierAtom = createAtom(INITIAL_SPEED_MULTIPLIER);

const resetSpeedMultiplier = () => speedMultiplierAtom.set(INITIAL_SPEED_MULTIPLIER);

export { speedMultiplierAtom, resetSpeedMultiplier };
