import StoryDeck from '../components/StoryDeck';
import { STORY_SLIDES } from '../components/Story';

/**
 * The deck, driven by the real story rather than by a copy of it.
 *
 * `AutoAdvance` keeps its own two-slide fixture on purpose: the hands-off
 * behaviour is worth watching without sitting through a scene to reach it.
 */
const meta = {
  title: 'Hash Ring/Guided Story/Story Deck',
  component: StoryDeck,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Deck = {
  args: { slides: STORY_SLIDES },
};

/**
 * Two short narration slides, so the hands-off behaviour can be watched without
 * sitting through a scene: the first reads, pauses, counts down, and advances.
 */
export const AutoAdvance = {
  args: {
    slides: [
      {
        kind: 'interstitial',
        key: 'first',
        number: 'Part one',
        label: 'Hands off',
        title: 'This slide moves on by itself',
        body: ['Wait, and the bar along the bottom will run out. Click, and it stops for good.'],
      },
      {
        kind: 'interstitial',
        key: 'second',
        number: 'Part two',
        label: 'Arrived',
        title: 'And here you are',
        body: ['Nothing counts down on the last slide, because there is nowhere for it to go.'],
      },
    ],
  },
};
