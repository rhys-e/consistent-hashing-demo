import React from 'react';
import StoryDeck, { openingIndex } from './StoryDeck';
import HashSpaceScene from './HashSpaceScene';
import KeyRoutesScene from './KeyRoutesScene';
import ServerLeavesScene from './ServerLeavesScene';
import VirtualNodesScene from './VirtualNodesScene';
import ZoomDensityScene from './ZoomDensityScene';
import { ServerJoinsScene } from './FullScaleScene';
import SandboxScene from './SandboxScene';

/**
 * The story, as the sequence of slides it is.
 *
 * This lives here rather than in the Storybook file it grew up in, because it is
 * now what the application renders — a story file describing the deck was fine
 * while the deck was a prototype beside a different app, and became the wrong
 * place for it the moment the deck *became* the app.
 *
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
export const STORY_SLIDES = [
  // The opening names the subject and states the problem it solves. `lead` sets it
  // larger and centred, which is the only difference between it and the chapter
  // slides that follow.
  {
    kind: 'interstitial',
    key: 'intro',
    lead: true,
    title: 'Consistent hash ring',
    body: [
      'A cache is a group of machines, and every key has to live on exactly one of them. The obvious way to choose is to divide the key by the number of machines.',
      'That works until you add a machine. Then almost every key moves at once, and a cache that has to be refilled is worth very little. Consistent hashing is how you avoid it.',
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
    title: 'Which server holds it?',
    body: [
      'A ring of numbers does nothing on its own, so the servers have to go on it as well. Each one takes its position from its own name, hashed exactly the way a key is.',
      'That leaves a single question, and the rest of consistent hashing is the answer to it. A key sits at one point and the servers sit at others. Which server holds the key?',
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
    title: 'Many positions each',
    body: [
      'The ring kept its promise. Only the keys of the failed server had to move, and every other key stayed where it was. The trouble is where they all went.',
      'With one position each there is only one server next to the gap, so it inherits the lot. The fix is to stop giving a server one position, and give it many.',
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
    title: 'At production scale',
    body: [
      'Six positions each cut the damage in half, and real systems give each server hundreds. The more positions there are, the more efficiently a failure is spread.',
      'Every ring so far has been a simplified one, small enough to point at. What follows is the same ring at close to production scale. At that size you cannot read it by eye.',
    ],
  },
  // Two dense-ring slides in a row, and no break between them. Scene 5 ends on the
  // ring it opened with, which is the one Scene 6 then takes apart — a narration
  // slide here would separate the evidence from the conclusion it is evidence for.
  {
    kind: 'scene',
    key: 'zoom-density',
    render: props => <ZoomDensityScene {...props} />,
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
  // The last break, and the only one that hands something over rather than
  // setting something up.
  {
    kind: 'interstitial',
    key: 'yours',
    title: 'Try your own numbers',
    body: [
      'Every example so far has used fixed numbers. Three servers, or six and then seven, at counts chosen to make a point clearly. None of the argument depends on them.',
      'So here is the same ring with the numbers unlocked. Two things are worth watching. How far the split sits from even, and how much of the ring moves when you change it.',
    ],
  },
  {
    kind: 'scene',
    key: 'sandbox',
    render: props => <SandboxScene {...props} />,
  },
];

export function Story() {
  return <StoryDeck slides={STORY_SLIDES} initialIndex={openingIndex(STORY_SLIDES)} urlSync />;
}

export default Story;
