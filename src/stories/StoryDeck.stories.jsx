import React from 'react';
import StoryDeck from '../components/story-scenes/StoryDeck';
import HashSpaceScene from '../components/story-scenes/HashSpaceScene';
import { ServerJoinsScene } from '../components/story-scenes/FullScaleScene';

/**
 * The shape of the finished thing, with the scenes that exist so far.
 *
 * Read it for the rhythm rather than the content: narration, scene, narration,
 * scene. The opening is one slide rather than two, because the line bending into
 * the ring is a single movement and the seam it used to have was one the story
 * had to work to hide.
 */
const SLIDES = [
  {
    kind: 'interstitial',
    key: 'intro',
    number: 'Part one',
    label: 'Positions',
    title: 'Where does a key live?',
    body: [
      'A cache is a set of machines, and a key has to land on exactly one of them. Choose badly and every machine you add moves every key that was already placed.',
      'Consistent hashing answers this in two moves. The first is to stop thinking about machines at all, and think about a number.',
    ],
  },
  // One slide, because the line and the ring it bends into are one movement.
  {
    kind: 'scene',
    key: 'hash-space',
    render: props => <HashSpaceScene {...props} />,
  },
  {
    kind: 'interstitial',
    key: 'scale',
    number: 'Part two',
    label: 'Scale',
    title: 'Now do it a thousand times',
    body: [
      'Everything so far has been small enough to point at. Real deployments give every server hundreds of positions, and at that density you cannot look at a ring and say who owns what — there is no dominant owner anywhere on it.',
      'So the picture has to change. Not to hide the detail, but to stop pretending a summary is a drawing of it.',
    ],
  },
  // One slide for the whole of the full-scale argument. Taking the ring apart, the
  // handover, and putting it back are one movement: cut it in half and the lanes
  // start to look like a structure rather than a way of looking at one. The seam
  // that used to be an interstitial here is now a note over a paused scene.
  {
    kind: 'scene',
    key: 'full-scale',
    render: props => <ServerJoinsScene {...props} />,
  },
];

const meta = {
  title: 'Hash Ring/Guided Story/Story Deck',
  component: StoryDeck,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Deck = {
  args: { slides: SLIDES },
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
