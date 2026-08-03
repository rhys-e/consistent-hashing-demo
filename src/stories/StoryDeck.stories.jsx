import React from 'react';
import StoryDeck from '../components/story-scenes/StoryDeck';
import HashSpaceScene from '../components/story-scenes/HashSpaceScene';
import KeyRoutesScene from '../components/story-scenes/KeyRoutesScene';
import ServerLeavesScene from '../components/story-scenes/ServerLeavesScene';
import VirtualNodesScene from '../components/story-scenes/VirtualNodesScene';
import { ServerJoinsScene } from '../components/story-scenes/FullScaleScene';

/**
 * The shape of the finished thing, with the scenes that exist so far.
 *
 * Read it for the rhythm rather than the content — but the rhythm is not a
 * pattern, it is a judgement made three times.
 *
 * The opening is one slide rather than two, because the line bending into the ring
 * is a single movement and the seam it used to have was one the story had to work
 * to hide. Scenes 2 and 3 are two slides with nothing between them, because Scene
 * 2 ends on precisely the frame Scene 3 opens on and a slide there would throw
 * that away. Interstitials sit at the two places the thread really does break: the
 * ring changes size and position on the way into Scene 2, and the whole picture
 * changes on the way into the full-scale view.
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
    key: 'ownership',
    number: 'Part two',
    label: 'Ownership',
    title: 'Which server holds it?',
    body: [
      'A ring of numbers is not much use on its own. The second move is to put the servers on it — hashed by their own names, the same way, so that a server has a position in exactly the sense a key does.',
      'That leaves one question, and the whole scheme is the answer to it: given a key here and servers there, which one holds it?',
    ],
  },
  // Two slides, no break. Scene 2 ends on the frame Scene 3 opens on — three
  // servers, eleven keys, every range claimed — and a narration slide between them
  // would spend the continuity the pair was built to have.
  {
    kind: 'scene',
    key: 'key-routes',
    render: props => <KeyRoutesScene {...props} />,
  },
  {
    kind: 'scene',
    key: 'server-leaves',
    render: props => <ServerLeavesScene {...props} />,
  },
  // A break, because Scene 4 puts the failed server back and starts again. That is
  // a rewind rather than a continuation, and running it straight on from the
  // wreckage of Scene 3 would read as the ring repairing itself.
  {
    kind: 'interstitial',
    key: 'spread',
    number: 'Part three',
    label: 'Spread',
    title: 'One position was the mistake',
    body: [
      "Nothing that just happened was a flaw in the hashing. The ring did exactly what it promised — only the failed server's keys moved. The problem is that with one position each there is only one neighbour standing next to the gap, and it gets all of it.",
      'So stop giving a server one position. Give it many, scattered independently, and let the same rule run again.',
    ],
  },
  {
    kind: 'scene',
    key: 'virtual-nodes',
    render: props => <VirtualNodesScene {...props} />,
  },
  {
    kind: 'interstitial',
    key: 'scale',
    number: 'Part four',
    label: 'Scale',
    title: 'Now do it a thousand times',
    body: [
      'Ten positions each was enough to halve the damage. Real deployments give every server hundreds, and the effect keeps going: the more positions there are, the less any single failure can concentrate anywhere.',
      'But at that density you can no longer look at a ring and say who owns what — there is no dominant owner anywhere on it. So the picture has to change. Not to hide the detail, but to stop pretending a summary is a drawing of it.',
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
