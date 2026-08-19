import { buildSteps, nextStepAt, previousStepAt, stepIndexAt } from '../sceneSteps';

const STEPS = [
  { at: 0, label: 'start' },
  { at: 2.5, label: 'lanes' },
  { at: 4.3, label: 'joined' },
  { at: 7, label: 'end' },
];

describe('stepIndexAt', () => {
  it.each([
    [0, 0],
    [1.2, 0],
    [2.5, 1],
    [2.6, 1],
    [4.3, 2],
    [7, 3],
    [9, 3],
  ])('reports %s as step %s', (progressValue, index) => {
    expect(stepIndexAt(STEPS, progressValue)).toBe(index);
  });

  it('counts a value a hair short of a step as being on it', () => {
    expect(stepIndexAt(STEPS, 2.4999)).toBe(1);
  });
});

describe('nextStepAt', () => {
  it.each([
    [0, 2.5],
    [2.4, 2.5],
    [2.5, 4.3],
    [4.3, 7],
  ])('steps forward from %s to %s', (progressValue, target) => {
    expect(nextStepAt(STEPS, progressValue)).toBe(target);
  });

  it('has nowhere to go at the end', () => {
    expect(nextStepAt(STEPS, 7)).toBeNull();
  });
});

describe('previousStepAt', () => {
  it.each([
    [7, 4.3],
    [4.3, 2.5],
    [2.5, 0],
  ])('steps back from %s to %s', (progressValue, target) => {
    expect(previousStepAt(STEPS, progressValue)).toBe(target);
  });

  /**
   * Stopping partway and stepping back replays the movement you are in, rather
   * than skipping over its beginning to the step before it.
   */
  it('returns to the start of the movement in progress', () => {
    expect(previousStepAt(STEPS, 3.4)).toBe(2.5);
  });

  it('has nowhere to go at the start', () => {
    expect(previousStepAt(STEPS, 0)).toBeNull();
  });
});

describe('buildSteps', () => {
  it('orders steps and drops any beyond the scene', () => {
    const built = buildSteps([{ at: 4 }, { at: 0 }, { at: 9 }, { at: 2 }], 5);

    expect(built.map(step => step.at)).toEqual([0, 2, 4]);
  });
});
