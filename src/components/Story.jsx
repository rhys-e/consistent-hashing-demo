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
 * between them. The recap is the exception: it answers rather than asks, and it
 * sits against the sandbox handoff because those are two jobs, not one.
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
      'Keys must spread evenly across machines. One way is a map: a stored table of which machine holds each key. Every request then reads that table, and you must rewrite it whenever a machine joins or fails.',
      'Hashing needs no table. Each machine computes the owner from the key alone. The simple method uses the machine count, so adding one remaps almost every key. Consistent hashing keeps that shared rule on a fixed range, so most keys stay put.',
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
      'Keys already have positions, computed from the key alone. Servers need positions too, hashed from their names the same way, still with no map to store.',
      'A shared rule will decide which server holds each key, with no map to look up. The next scene shows that rule: the first server clockwise from the key.',
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
      'So far no server has left or joined. In a real cache a server fails, or a new one is added to carry the load. Either way the group sharing the keys changes size.',
      'The simple method would remap almost every key if that group changed size. The question is how many keys have to move when a server leaves or a new one joins.',
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
      "Only the failed server's keys moved, so most of the cache stayed put. The load across the machines is not even: those keys all went to one neighbour.",
      'With one position per server, only one neighbour sits next to the gap, so it inherits the whole range. Many positions each will spread that load.',
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
      'Six positions already split the load instead of sending it all to one neighbour. Real systems give each server hundreds of positions, so the load stays even when one fails.',
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
  // The argument, said once without a picture. The join just showed the two
  // results. This slide names them together so the sandbox is a test of a claim
  // the viewer can already say, not a new lesson with the numbers unlocked.
  {
    kind: 'interstitial',
    key: 'recap',
    title: 'What hashing keeps',
    body: [
      'Each machine computes the owner from the key and the servers on the ring. Nobody stores a map of which machine holds each key, and nobody looks one up.',
      "When a server fails or joins, only a small share of keys move. With many positions each, the load stays even. That is even spread without the simple method's remap.",
    ],
  },
  // The last break, and the only one that hands something over rather than
  // setting something up.
  {
    kind: 'interstitial',
    key: 'yours',
    title: 'Try your own numbers',
    body: [
      'Every ring so far used fixed counts, chosen to make each point clear. Three servers, then six, then seven. The shared rule does not depend on those numbers.',
      'This last ring has the server counts unlocked. Watch how even the load stays, and how much of the ring moves, still from the same shared rule.',
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
