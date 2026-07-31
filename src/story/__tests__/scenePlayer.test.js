import {
  SCENE_EVENT,
  SCENE_STATUS,
  canStepWhile,
  nextStatus,
  primaryActionFor,
} from '../scenePlayer';

const all = Object.values(SCENE_STATUS);

describe('nextStatus', () => {
  it.each(all)('starts playing from %s', status => {
    expect(nextStatus(status, { type: SCENE_EVENT.play })).toBe(SCENE_STATUS.playing);
  });

  it.each(all)('resets to the start from %s', status => {
    expect(nextStatus(status, { type: SCENE_EVENT.reset })).toBe(SCENE_STATUS.idle);
  });

  it.each([SCENE_EVENT.stepForward, SCENE_EVENT.stepBack])('plays while travelling on %s', type => {
    expect(nextStatus(SCENE_STATUS.ended, { type })).toBe(SCENE_STATUS.playing);
  });

  /**
   * Arriving mid-scene pauses rather than ends, which is what lets a step forward
   * hand control straight back instead of running on to the finish.
   */
  it('pauses on arrival mid-scene and ends on arrival at the end', () => {
    expect(nextStatus(SCENE_STATUS.playing, { type: SCENE_EVENT.arrive, atEnd: false })).toBe(
      SCENE_STATUS.paused
    );
    expect(nextStatus(SCENE_STATUS.playing, { type: SCENE_EVENT.arrive, atEnd: true })).toBe(
      SCENE_STATUS.ended
    );
  });

  it('ignores events it does not know', () => {
    expect(nextStatus(SCENE_STATUS.paused, { type: 'WAT' })).toBe(SCENE_STATUS.paused);
  });
});

describe('primaryActionFor', () => {
  /** Play means "from the beginning", so it is only ever offered there. */
  it.each([
    [SCENE_STATUS.idle, true, SCENE_EVENT.play],
    [SCENE_STATUS.paused, true, SCENE_EVENT.play],
    [SCENE_STATUS.paused, false, SCENE_EVENT.reset],
    [SCENE_STATUS.ended, false, SCENE_EVENT.reset],
    [SCENE_STATUS.playing, true, SCENE_EVENT.reset],
    [SCENE_STATUS.playing, false, SCENE_EVENT.reset],
  ])('offers %s (at start: %s) the %s action', (status, isAtStart, action) => {
    expect(primaryActionFor(status, isAtStart)).toBe(action);
  });

  it('never offers a pause, which would relabel the button mid-playback', () => {
    Object.values(SCENE_STATUS).forEach(status => {
      expect(primaryActionFor(status, true)).not.toBe(SCENE_EVENT.pause);
      expect(primaryActionFor(status, false)).not.toBe(SCENE_EVENT.pause);
    });
  });
});

describe('canStepWhile', () => {
  it('locks stepping only while the scene is moving', () => {
    expect(canStepWhile(SCENE_STATUS.playing)).toBe(false);
    [SCENE_STATUS.idle, SCENE_STATUS.paused, SCENE_STATUS.ended].forEach(status => {
      expect(canStepWhile(status)).toBe(true);
    });
  });
});
