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
 * to hide. Everywhere else an interstitial earns its place by asking the question
 * the scene after it answers — which is why one now sits between Scenes 2 and 3
 * even though those two share a frame, and why Scenes 5 and 6 still have nothing
 * between them.
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
      'A cache is a group of machines, and each key must live on exactly one of them. The simple method hashes the key and assigns it using the current machine count.',
      'That assignment depends on the machine count, so adding one remaps almost every key. Consistent hashing places keys in a fixed number range instead, so most of them stay put.',
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
      'Keys already have positions on the ring we just closed. Servers need positions too, each hashed from its own name the same way a key is hashed.',
      'Keys and servers now both sit on this same ring. The next scene answers the lookup question: which server holds the key at a given position.',
    ],
  },
  {
    kind: 'scene',
    key: 'key-routes',
    render: props => <KeyRoutesScene {...props} />,
  },
  // A break between two scenes that share a frame, which is a trade rather than a
  // free addition. Scene 2 ends on precisely the frame Scene 3 opens on — three
  // servers, eleven keys, every range claimed — and for a while there was nothing
  // between them so that the pair read as one continuous movement.
  //
  // What that cost was the question. Everything up to here builds a ring and puts
  // a key on it, and then Scene 3 fails a server, having never said that servers
  // fail. The claim it opens with is an *answer* to a question the story last
  // asked four slides ago, on the opening slide. A demonstration of something
  // nobody has been told is a problem is just a thing that happens.
  //
  // The frame identity survives the slide, and is still asserted. A viewer reads
  // this and looks up to find the ring exactly where they left it, which is a
  // weaker continuity than unbroken motion and a better place to spend it.
  {
    kind: 'interstitial',
    key: 'servers-change',
    title: 'Servers come and go',
    body: [
      'So far the ring has held still. Real caches do not. A server fails, or somebody adds one to carry the load. Either way the group sharing the keys is a different size.',
      'That is the moment consistent hashing is built for, and one question decides whether it works. When a server leaves or a new one joins, how many keys have to move?',
    ],
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
      "Only the failed server's keys moved, which is what consistent hashing promised. The rest stayed put. The problem is that they all went to one neighbour.",
      'With one position per server, only one neighbour sits next to the gap, so it inherits the whole range. The fix is to give each server many positions.',
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
      'Six positions already split the failure instead of sending it all to one neighbour. Real systems give each server hundreds of positions, so a failure is spread across many more neighbours.',
      'Every ring so far was small enough to inspect position by position. The next ring is near production scale. At that density the whole ring cannot be read by eye.',
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
      'Every ring so far used fixed counts, chosen to make each point clear. Three servers, then six, then seven. The rules do not depend on those numbers.',
      'This last ring has the server counts unlocked. Watch how even the split is. Also watch how much of the ring moves when a server joins or leaves.',
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
