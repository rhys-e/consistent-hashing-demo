import NarrationSlide from '../components/deck/NarrationSlide';

/**
 * The narration slides on their own, because they are half the finished thing and
 * were previously only visible by scrolling the deck to them.
 */
const meta = {
  title: 'Hash Ring/Guided Story/Narration Slide',
  component: NarrationSlide,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    active: {
      description: 'Slides resolve when they arrive. Toggle to replay the reveal.',
      control: { type: 'boolean' },
    },
  },
  args: { active: true },
};

export default meta;

export const Opening = {
  args: {
    number: 'Part one',
    label: 'Positions',
    title: 'Where does a key live?',
    body: [
      'A cache is a set of machines, and a key has to land on exactly one of them. Choose badly and every machine you add moves every key that was already placed.',
      'Consistent hashing answers this in two moves. The first is to stop thinking about machines at all, and think about a number.',
    ],
  },
};

export const Scale = {
  args: {
    number: 'Part two',
    label: 'Scale',
    title: 'Now do it a thousand times',
    body: [
      'Everything so far has been small enough to point at. Real deployments give every server hundreds of positions, and at that density you cannot look at a ring and say who owns what — there is no dominant owner anywhere on it.',
      'So the picture has to change. Not to hide the detail, but to stop pretending a summary is a drawing of it.',
    ],
  },
};

export const Change = {
  args: {
    number: 'Part three',
    label: 'Change',
    title: 'A server joins',
    body: [
      'This is the claim the whole scheme is named for: adding a machine should move almost nothing.',
      'Watch which lanes give something up, and — more importantly — watch everything that does not move.',
    ],
  },
};

/** A long title is the case the scramble has to stay readable through. */
export const LongTitle = {
  args: {
    number: 'Part four',
    label: 'Failure',
    title: 'What happens when one of them stops answering',
    body: ['A server leaving is the same movement as a server joining, run backwards.'],
  },
};
