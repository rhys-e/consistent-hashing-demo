import React from 'react';
import StoryDeck, { openingIndex } from './StoryDeck';
import HashSpaceScene from '../scenes/HashSpaceScene';
import KeyRoutesScene from '../scenes/KeyRoutesScene';
import ServerLeavesScene from '../scenes/ServerLeavesScene';
import VirtualNodesScene from '../scenes/VirtualNodesScene';
import ZoomDensityScene from '../scenes/ZoomDensityScene';
import { ServerJoinsScene } from '../scenes/FullScaleScene';
import SandboxScene from '../scenes/SandboxScene';

/**
 * The story as a sequence of slides.
 *
 * Interstitials ask the question the next scene answers, except the recap, which
 * restates the claim before the sandbox handoff. Hash-space is one slide because
 * the line and the ring are one movement. Zoom and the full-scale view have no
 * break between them: one ends on the ring the other takes apart.
 */
export const STORY_SLIDES = [
  // `lead` is a larger title. The only difference from the chapter slides.
  {
    kind: 'interstitial',
    key: 'intro',
    lead: true,
    title: 'Consistent hash ring',
    body: [
      'Consistent hashing is a way to share work across machines that come and go. The load stays even, and each machine can compute who holds an item. Nobody stores a map of which machine holds what.',
      'The usual alternative is a map: a stored table of which machine holds each key. Every request then reads that table, and you must rewrite it whenever a machine joins or fails.',
      'Hashing needs no table. Each machine computes the owner from the key alone. The simple method uses the machine count, so adding one remaps almost every key. Consistent hashing does the same on a fixed range, so most keys stay put.',
    ],
  },
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
      'Keys already have positions, computed from the key alone. Servers need positions too, hashed from their names the same way, so both live on the same ring.',
      'From those positions, anyone can compute which server holds each key. The next scene shows how that works: the first server clockwise from the key.',
    ],
  },
  {
    kind: 'scene',
    key: 'key-routes',
    render: props => <KeyRoutesScene {...props} />,
  },
  // Asks the leave/join question before the failure. The two scenes still share a
  // frame; the viewer looks up to the ring they just left.
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
  // Scene 4 rewinds and starts again. Running it on from Scene 3's wreckage would
  // read as the ring repairing itself.
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
  {
    kind: 'scene',
    key: 'zoom-density',
    render: props => <ZoomDensityScene {...props} />,
  },
  {
    kind: 'scene',
    key: 'full-scale',
    render: props => <ServerJoinsScene {...props} />,
  },
  // Names the claim the join just showed, so the sandbox tests it rather than
  // teaching it again.
  {
    kind: 'interstitial',
    key: 'recap',
    title: 'Efficient load management',
    body: [
      'Each machine computes the owner from the key and the servers on the ring. Nobody stores a map of which machine holds each key, and nobody looks one up.',
      "When a server fails or joins, only a small share of keys move. With many positions each, the load stays even. That is even spread without the simple method's remap.",
    ],
  },
  {
    kind: 'interstitial',
    key: 'yours',
    title: 'Try your own numbers',
    body: [
      'Every ring so far used fixed counts, chosen to make each point clear. Three servers, then six, then seven. Who holds a key does not depend on those numbers.',
      'This last ring has the server counts unlocked. Watch how even the load stays, and how much of the ring moves, with ownership still computed from the key.',
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
