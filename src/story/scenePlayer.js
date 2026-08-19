/**
 * A scene's playback state, as a pure transition table.
 *
 * This is deliberately not a hook. The plan splits scene state in two: discrete
 * state (which scene, which beat, playing or not) belongs in a story machine,
 * while continuous values stay out of React entirely as motion values. Keeping
 * the discrete half as a table means moving it into xstate — or atoms, or
 * anything else — is a rebinding rather than a rewrite: the states and events
 * below are already the ones such a machine would declare.
 *
 * `ARRIVE` is the only event a scene raises for itself, when playback reaches
 * whatever it was travelling towards.
 */

export const SCENE_STATUS = {
  idle: 'idle',
  playing: 'playing',
  paused: 'paused',
  ended: 'ended',
};

export const SCENE_EVENT = {
  play: 'PLAY',
  pause: 'PAUSE',
  reset: 'RESET',
  stepForward: 'STEP_FORWARD',
  stepBack: 'STEP_BACK',
  seek: 'SEEK',
  arrive: 'ARRIVE',
};

const TRANSITIONS = {
  [SCENE_EVENT.play]: () => SCENE_STATUS.playing,
  [SCENE_EVENT.pause]: () => SCENE_STATUS.paused,
  [SCENE_EVENT.reset]: () => SCENE_STATUS.idle,
  [SCENE_EVENT.stepForward]: () => SCENE_STATUS.playing,
  [SCENE_EVENT.stepBack]: () => SCENE_STATUS.playing,
  [SCENE_EVENT.seek]: (status, event) => (event.atEnd ? SCENE_STATUS.ended : SCENE_STATUS.paused),
  [SCENE_EVENT.arrive]: (status, event) => (event.atEnd ? SCENE_STATUS.ended : SCENE_STATUS.paused),
};

export function nextStatus(status, event) {
  const transition = TRANSITIONS[event.type];
  return transition ? transition(status, event) : status;
}

/**
 * What the one primary control does from here.
 *
 * Play means "from the beginning", so it is only offered at the beginning.
 * Anywhere else the useful thing is to get back there. Offering a pause instead
 * would make the button's meaning depend on a state the viewer cannot see, and
 * would change its label mid-playback — moving it under their cursor.
 *
 * Resolving this here rather than in the button keeps the transport dumb and the
 * answer testable without rendering anything.
 */
export function primaryActionFor(status, isAtStart) {
  if (status === SCENE_STATUS.playing) return SCENE_EVENT.reset;
  return isAtStart ? SCENE_EVENT.play : SCENE_EVENT.reset;
}

/**
 * Stepping is locked while the scene is moving. A step is a movement with a
 * destination; queueing another part-way through means arriving somewhere nobody
 * asked for, and a disabled control is what says "wait for this to land".
 */
export const canStepWhile = status => status !== SCENE_STATUS.playing;
