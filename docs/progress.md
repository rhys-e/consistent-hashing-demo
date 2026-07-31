# Hash Ring Visual Redesign — Progress

Status against [`hash-ring-visual-design-plan.md`](./hash-ring-visual-design-plan.md), as of 2026-07-29.

**Verdict:** The opening is one scene — a number line that bends into a ring — so the continuity it depends on is structural rather than asserted. Scene 6 is decided — per-server lanes — and the transition into it is built and animated, which was the part of that treatment most likely to lose a viewer. What is still missing is the middle of the story: the scenes that teach ownership before the full-scale view assumes it.

## Scenes

| Scene                | Plan status                   | Notes                                                                                                                                     |
| -------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **0–1 Hash Space**   | Done, merged                  | One scene: rail draws, keys land, rail bends into a ring. Missing: hover-to-replay a key.                                                 |
| **2 Lookup**         | Not started                   | Owes the story the step from a _position_ to a _range_. See below.                                                                        |
| **3 Server leaves**  | Model done, scene not started | `remapDelta` asserts the single-neighbour spike; nothing drawn yet.                                                                       |
| **4 Virtual nodes**  | Not started                   | Should hand over to Scene 6 on the shared ring coloured by owner, which is exactly the frame Scene 6 opens on.                            |
| **5 Zoom density**   | Not started                   | Optional for the first pass; 6C is the obvious basis for it.                                                                              |
| **6 Full-scale**     | **Chosen and animated**       | 6A lanes. Opens on the shared ring, separates into one lane per server, load panel resolves in. Missing: the low-to-high density opening. |
| **7 Remap at scale** | **Animated on 6A**            | A seventh server joins, each server hands over in turn, the lanes fold back into one ring, and the newcomer's share is picked out on it.  |
| **8 Sandbox**        | Not started                   | Existing freeform app still the live demo.                                                                                                |

## Technical approach

| Item                                    | Status                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| Stay on SVG                             | On track — a lane is one `<circle>`, whatever the vnode count                 |
| Parametric projection                   | Done — `projection.js`, plus `ringPoint`/`ringArcPath` for closed-ring scenes |
| Motion tween layer                      | Done — `useSceneTimeline` + Motion, out-of-render attribute updates           |
| Shared stage scale                      | Done — `STAGE` carries geometry _and_ text offsets                            |
| Story machine (xstate scenes)           | Not started, but shaped for it — `scenePlayer.js` is a pure transition table  |
| `ringModel` (owners, load, remap delta) | Done — `ringModel.js`, 14 tests                                               |
| Ownership as dash patterns              | Done — `ringDash.js`, 10 tests                                                |
| Layered SVG stage (shared layers)       | Done for the hash space; the full-scale scene owns its own layers             |
| Beat-driven narration and metrics       | Done — `useBeatCaption`, `useAnimatedNumber`                                  |
| Scene transport (step / play / reset)   | Done — `sceneSteps`, `scenePlayer`, `SceneControls`, on every scene           |
| Story smoke tests                       | Done — every Storybook story is rendered by the suite                         |
| `d3` → `d3-shape` cleanup               | Not done                                                                      |
| Slide deck shell                        | Prototyped — `StoryDeck`: driven slide transitions, progress ticks            |
| Narration slides                        | Done — `NarrationSlide`, scramble reveal, own stories                         |
| Navigation / URL / skip-to-sandbox      | Not started — hangs off the deck                                              |

## Scenes are players, not clips

Every scene now carries a transport: **Back / Play / Next**, with arrow keys and space. It applies to all of them, because it is a property of how scenes are built rather than a feature bolted onto one.

The primary control is **Play at the start and Reset everywhere else**. Play means "from the beginning", so it is only offered at the beginning; anywhere else the useful thing is to get back there. There is no pause: a button whose label changes mid-playback moves under the cursor, and its meaning would depend on a state the viewer cannot see. Reset does not replay — it hands control back, so the next choice is theirs.

Stepping is locked while a scene is moving. A step is a movement with a destination; queueing another part-way through means arriving somewhere nobody asked for, and a disabled control is what says "wait for this to land". Reset stays live throughout, so a full playback is always escapable.

**Stepping back genuinely rewinds.** Every element is a pure function of the beat value, so running the scalar backwards runs the scene backwards. No scene knows it is happening, and no scene stores a frame.

### What a step is

**A step is the middle of a rest, and a rest is an interval in which nothing moves.**

That definition had to be earned. The first attempt picked steps off the timeline by eye, and because effects overlap, a step could land on a half-finished fade or on a composite of one movement ending and the next beginning — stepping into the full-scale scene left the share panel part-way faded in, and the step after it finished that fade _and_ started the handover. Three things fix it, and none of them is a special case:

- **Timelines are built from durations laid end to end**, not from timestamps. `createTimeline` hands out `move` and `rest` intervals and remembers where the rests were. Lengthening a movement can no longer quietly swallow the quiet moment that was supposed to follow it, because that moment is a duration in the same sequence rather than a gap someone has to notice.
- **Steps are the midpoints of rests**, not their edges. An edge is ambiguous by construction: on one side something has just stopped, on the other something is about to start.
- **Decoration is marked `data-ephemeral`** and excluded. A glow on arrival and the pulse at the seam are the scene's manner, not its argument; a scene should not have to wait for its own glitter, and a step should never be spent on one. The opening once had a step that was only the seam glow.

`sceneRests.test.jsx` renders every scene either side of every step and requires the frame to be identical. That is what keeps this true rather than merely intended: every timing change is a chance for a movement to grow into a rest, and the symptom is only visible to someone clicking through the whole scene.

The opening has six steps (the empty stage, the drawn rail, one per key landing, and the closed ring); the full-scale join has twenty, one per handover and one per fold.

### Rests are longer when the narration is new

A caption is read during the movement it introduces, but arriving at the end of that movement and being moved straight on gives no time to finish, and the viewer loses either the sentence or the picture. So the timeline carries its own narration: `say()` marks where a caption begins, and the next `rest()` takes the longer reading duration automatically. In the full-scale join that is seven of the twenty rests — the other thirteen are movements under narration that is already up, and stay short.

That also removed a duplication worth naming: captions used to be declared beside the scene and timed by re-deriving beats from the timeline's marks, so the two could disagree. They are now one sequence.

Where the caption _sits_ is answered by the slide deck below: the macro argument moves to its own narration slide, and what stays in the scene is short enough that bottom-left is fine.

### Where the story machine will plug in

The discrete half of playback is a pure transition table in `scenePlayer.js`: four states (`idle`, `playing`, `paused`, `ended`) and six events (`PLAY`, `PAUSE`, `RESET`, `STEP_FORWARD`, `STEP_BACK`, `SEEK`, plus the self-raised `ARRIVE`). `useSceneTimeline` is a thin binding over it, and `SceneControls` asks it what the primary button should do rather than deciding for itself.

That is the shape the plan asks for — xstate owning discrete state, a motion value owning continuous time — so adopting a story machine is a rebinding rather than a rewrite. The states and events a scene-level machine would declare already exist and are already tested; what a machine adds is the layer _above_: which scene is showing, and what `NEXT` means at a scene boundary. The beat value should stay out of it, for the reason the plan gives: a machine transition per frame is what the previous implementation got wrong.

## How the full-scale scene moves

The whole of Scene 6 and Scene 7 is **one number per lane: its radius.**

A server's ranges are drawn as a dashed `<circle>` with `pathLength="1"`, so the dash pattern is in hash-space position units and means the same thing at any radius. The arcs on the shared ring and the arcs in a lane are therefore not two drawings of the same data — they are the same element, moved. Three consequences the story depends on:

- **Nothing ever moves around the ring, only across it.** A viewer can hold on to any arc from the shared ring into its lane, because its angle never changes.
- **A remap is that same movement again.** Ranges changing hands cross from one lane to another at a fixed angle, changing colour on the way. The viewer has already been taught to read it.
- **"Everything else held" is structural.** Ranges that do not move are not redrawn, so the claim is a property of the scene rather than an assertion in the caption.

Lanes are laid out for the final server count from the first frame, so a server joining never nudges the others.

### The sequence, and why it pauses

Every movement dwells when it arrives, because a handover the eye cannot keep up with is a shuffle, and a shuffle proves nothing.

1. **Shared ring.** One circle, coloured by owner, deliberately illegible.
2. **Fan out.** Lanes separate on a shared, front-loaded curve; the load panel resolves in.
3. **Join.** An empty lane appears innermost. Nothing else moves.
4. **Handover, one server at a time.** Each source is _named first_ — its lane brightens while nothing moves — then its lost ranges fly inward and flare on contact, then everything holds. Its share bar drops as the newcomer's climbs. Six anticipations, six contributions, six pauses.
5. **The newcomer alone.** Once the last server has handed over, everything stays stepped back and only the new lane is lit — the result stated on its own terms, one lane built entirely out of slivers taken from six others. Then the others come back up for a long hold on the assembled seven.
6. **Fold back in.** Lanes recombine from the inside out, each step pausing, the ring refilling as more of the circle returns — ending on the same single dense ring the scene opened with, now shared seven ways.
7. **Highlight.** Everything but the newcomer dims, leaving its slivers scattered right around the ring.

Step 6 is the one that pays for the treatment. Lanes are a lens, not a new structure, and folding them back proves it: the same ranges reassemble into the ring the story has used since Scene 1. It also means Scene 8's sandbox can inherit the single-ring view without a cut.

Five details that took a second pass:

- **Naming before moving.** Without the anticipation beat, the answer to "which server just lost that?" arrived after the movement that would have answered it.
- **A flare is an event.** It peaks on contact and decays immediately; the _pause_ that follows is for looking at what arrived, not for looking at the flare.
- **Lane tracks fade one at a time** as each lane merges, mirroring how they appeared. Dropping them all at once made the fold-back read as a different kind of movement from the fan-out.
- **The last handover needs somewhere to land.** With the restore beginning at the final landing, the sixth server's lane faded out exactly as the others faded in, so it blinked rather than taking its turn. The newcomer-only hold gives it an end to fade into, and gives the sequence a result before the ring is reassembled.
- **One attention model, not two.** Brightness was briefly computed as `max(globalDim, ownSpotlight)`, which made the first lane dim and immediately relight, and left every batch of about-to-move ranges lit on lanes that had already stepped back — pre-announcing each handover several turns early. Now a lane is lit exactly while it has the floor, the receiving lane is lit throughout, and a batch in transit takes the brightness of the lane it is leaving until it leaves and of the lane it is joining once it arrives.

The remaining asymmetry is deliberate: the closing frame keeps the other six servers as a dimmed band, because that band is what gives 13.2% its sense of proportion.

The joined variant runs about 21 beats — roughly 24 seconds at the default pace. That is long for one scene and it is really two: the fan-out (Scene 6) settles at beat 3.4, and everything after it is Scene 7. Step 5 is where they meet. Splitting them is a job for the story machine, which can enter Scene 7 on the settled lanes.

### One rendering trap worth remembering

Two vnodes occasionally hash within a hair of each other, leaving a range some five orders of magnitude below a pixel. Renderers stroke that degenerate segment with a _join_, which draws a disc the width of the stroke — so a range of 9e-8 rendered as the largest mark on its lane. `ringDash` now coalesces touching ranges and drops spans below `1e-6`; `ringModel` still keeps them, because they exist and they count towards a server's share.

## PoC plan (risk order) vs what we did

Plan order: **6A/6C → 7 → 3 → 1 → rest**. Steps **1, 2 and 4 are done**; step 3 (Scene 3's removal) is asserted in the model but not drawn.

Against the success criteria:

- _The full-scale view reads as summarised, not literal_ — met. Each lane holds one server's own ranges, so no slice of the ring is ever coloured as though one server owned it.
- _Adding a server visibly moves only a small fraction_ — met, and computed rather than asserted (13.2% for a seventh server at 150 vnodes each).
- _The ring reads as a wrapped number range_ — met by Scene 1.
- _Metrics corroborate what was just seen_ — the share bars settle during the handover rather than after it, against an even-share mark.
- _Removing a server without vnodes overloads one neighbour_ — asserted in `ringModel`, not yet drawn.

## The gap: positions become ranges

Scene 6 assumes the viewer already reads a coloured arc as "the range this server owns". Nothing has taught that yet — Scene 2 is where it has to happen, and it is the one remaining piece of the argument that has no prototype.

The device that fits the rest of the story: a server marker sits on the ring, and its ownership arc **sweeps backwards** from the marker, anticlockwise, until it reaches the previous marker. That animates the rule itself — a server owns the range _ending_ at its position — rather than illustrating it after the fact. Scene 4 then splits each server into many markers and the same sweep runs many times, arriving at exactly the frame Scene 6 opens on.

## The story as vertical slides

Prototyped in `Guided Story/Story Deck`: the story is a column of full-height slides that alternate narration and scene, moving one whole slide at a time.

What it buys is not layout, it is **pressure**. Holding one continuous visual thread across every scene means each composition is dictated by whatever the previous one ended on — Scene 6 needs the ring off-centre to make room for its share panel, Scene 1 leaves it centred, and there is no honest animation between those two facts. A slide of narration between them absorbs the discontinuity for free, because a cut after a full stop is not a cut.

It also separates two things that were competing for the same attention. Prose and animation both want all of it; giving each its own slide means the macro argument is read without a moving picture beside it, and the scene is then watched with only the few words it still needs.

**It is a tool for chapter breaks, not a uniform pattern, and a seamless transition beats an interstitial wherever one is possible.** Some transitions _are_ the argument: the number line bending into the ring works because it is continuous, and a slide between Scenes 0 and 1 would throw away the best moment in the story to solve a problem those two scenes do not have. The deck therefore runs Scene 0 straight into Scene 1, and puts interstitials only where the thread is already broken.

### Where the words go

Scenes have no title. The narration slide before a scene has already named the chapter, so a title on the scene repeated it — and it sat top-left while the narration slides set their text in a centred column, so the story's words were in a different place on every kind of slide.

The caption takes the title's position instead: top left, where reading starts, which also frees the vertical space it used to cost at the bottom. Its block is a **fixed height**, because the caption changes from beat to beat and letting it size to its content would resize the artwork underneath it every time the narration moved on.

### Hands off until you take over

The default is that the story runs itself. A slide plays, a hairline bar counts down its last five seconds, and the deck moves on; nothing is on screen but the story. Touch anything — a click, or a scene's own keys — and the deck stops advancing for good, the scene transport appears, and it waits.

Two judgements in that:

- **The transport appears only on engagement.** It used to appear when a scene finished too, which put it on screen at the exact moment the deck was about to move on — clutter arriving too late to be useful.
- **The countdown bar is the warning.** A page that moves on its own without one has taken something from the viewer. Saying "something is about to happen, and roughly when" is what makes taking over feel offered rather than required. A finished slide is left alone for a couple of seconds before the bar appears, so the last frame is a moment rather than a cue.

  It was invisible for three rounds, for three separate reasons, and each is worth remembering:

  1. **`isSettled` started `false`** and only became true when a slide transition completed — but the first slide is never transitioned into, so nothing was ever active, nothing ever finished, and the countdown was never reachable.
  2. **Engagement fired on any pointer-down on the container**, including the click that focuses a Storybook iframe and clicks on the progress ticks, which permanently suppressed the bar. Navigating is not engaging, so engagement moved onto the slides.
  3. **Its colours came from utility classes that were not in the compiled stylesheet.** A `shadow-[...]` with commas inside `rgba()` is not extracted by the class scanner at all, and the background utilities were missing too. An element whose entire job is to be seen should not depend on a class surviving a build step, so it now takes its colours from `themes` directly — which is what the SVG scenes have always done.

  There is a fourth, which was also behind "the transition is a hard cut": **`prefers-reduced-motion` was zeroing the countdown's duration**, so it completed the instant it mounted and advanced the slide immediately. A countdown to something that will happen on its own is information and its duration _is_ the information, so it no longer honours the preference. Reduced motion now shortens the slide transition rather than removing it, because an instant cut is the harshest transition available, not the gentlest.

  `DeckCountdown` has its own story — the thing was unwatchable while it only existed five slides into a deck — and `storyDeck.test.jsx` drives the whole path: readable, dwelt, counting down, and giving way to a hint on engagement.

- **Engagement is sticky, and the transport is hidden until it happens** (or until a scene has finished playing). Watching and studying are different activities, and the interface for the second is clutter during the first. Handing control back after one slide would take it away again on the next.

### No seam between slides

Scenes size to `h-full` rather than `h-screen`, and the per-scene header rule and marker are gone — chapter headings belong to the narration slides, and a boxed frame on every scene puts a visible edge between slides that should read as one canvas.

There was also a base style in `index.css` giving every `section` a 1.5rem vertical margin, which added 3rem to each slide and pushed the deck progressively further down — the same symptom as the measurement bugs and an entirely separate cause. The deck's sections set `my-0`; a global margin on a structural element is a trap worth knowing about.

That `h-screen` was also a defect. A scene assuming the viewport inside a slide sized to its container overflows by however much the two differ, and the error accumulates: by the fourth slide the deck visibly undershoots and the previous slide shows underneath. Slide travel took three attempts, and the third is the point. A percentage resolves against the moving element's own box, which is only the slide height if every slide is exactly as tall as the deck — so that went. `getBoundingClientRect()` replaced it and was **still wrong**, for a reason that is easy to miss: it reports the _visual_ box, after any transform on an ancestor. A scaled preview measures smaller than the height the browser laid the slides out at, so every slide undershoots by the same fraction, and a constant fraction accumulates into a deck sitting visibly too low a few slides in. `clientHeight` is the layout box, which is the space the transform is expressed in, so the two agree. It is observed as well as measured, and the deck is `fixed inset-0`, which takes the host page's margins out of the arithmetic entirely.

There is no test for it: jsdom has no layout, so `clientHeight` is always zero there and only the fallback would ever run. A test that cannot observe the property it guards reads as coverage without being any. (Embla and friends would also solve this; the arithmetic is a dozen lines and the deck needs custom active-slide semantics anyway, so the dependency is not yet worth it.)

### The deck drives itself

A viewer is on one slide or the next, never suspended between them, so the deck animates between whole slides rather than snapping a free scroll, with progress ticks down the right-hand edge.

That is a deliberate trade with a bill attached. Scroll snapping gets keyboard, trackpad and assistive technology for free; taking the transition over means owing all of it back, and the reason scroll-jacking has a bad name is that most implementations do not pay. What is paid here:

- **Arrow keys, page keys, Home and End** move slides. Left and right stay with the scene on screen, and space stays with its transport, so the two navigations do not collide.
- **Any wheel gesture moves exactly one slide.** Thresholding the travel meant a gentle scroll did nothing while a firm one sometimes counted twice — unresponsive and unpredictable in the same breath. Acting on the first event of a gesture and then refusing everything until the slide has settled makes one flick mean one slide at any strength, and a short cooldown after settling swallows a trackpad's momentum tail.
- **The progress ticks are real buttons** with labels, so the deck is navigable without a pointer and its shape is legible to a screen reader.
- **`prefers-reduced-motion` cuts instead of sliding.**
- **Touch swipes** use the same threshold and lock.
- Progress ticks are **hairlines rather than pills**, with the hit area as padding: the deck is what is being looked at, and a column of filled dots down the edge of a dark composition reads as part of the composition.

`storyDeck.test.jsx` covers each of those, because they are now the deck's responsibility rather than the platform's.

**Scenes play when their slide has arrived and settled, and reset when it leaves**, so returning to one finds it at its beginning rather than wherever it was abandoned — and a scene never starts part-way through the transition that brought it in. Every scene takes an `active` prop; an inactive scene also stops answering the keyboard, which matters because a deck has all of them mounted at once.

Two consequences still to work through: the in-scene captions should get **shorter** now that the macro argument has somewhere else to live, which would claw back some of the full-scale scene's runtime — its reading rests are sized for sentences that no longer need to carry the whole idea. And the deck is where "skip to sandbox" and per-scene URLs will hang.

## Where low density belongs

Scene 6 currently opens by _asserting_ high density: hundreds of positions per server, already placed. It never shows why, and the story has no other moment that does — which makes the opening caption a claim rather than a demonstration.

The plan puts that argument in Scene 4, where a stepper toggles 1, 3 and 8 vnodes per server. That is the right home for the _literal_ version, because at those counts individual positions are still inspectable, which is the whole point of Scene 4. But there is a second, different argument that Scene 4 cannot make and Scene 6 needs:

> At three positions each, one server owns a third of the ring and another owns a twentieth. At three hundred, they are all within a point of even. Nothing changed except how many positions there are.

That is a statement about _aggregate behaviour_, and the lanes view already tells it well — at three vnodes per server the imbalance is obvious in exactly the same picture that reads as even at five hundred. So the density ramp belongs at the **head of Scene 6**, as its opening movement, with the share panel present from the first frame so the numbers move alongside the ink.

How to build it without breaking the one-scalar discipline: topology is rebuilt from scratch per vnode count, so it cannot be animated continuously. Precompute a handful of levels — 3, 8, 30, 150 — and crossfade lane dash patterns between consecutive levels, one level per rest. Each level is then a step, which is the stepper the plan asked for in Scene 4, reused here at a scale where the point is statistical rather than literal.

Not built. It changes what Scene 6 opens on, so it wants deciding against Scene 4 rather than in isolation.

## Open questions

- Is a naive-modulo comparison mode worth including?
- Should sample request traffic run continuously in sandbox, or only on demand?
- Is the existing app sandbox-only, or kept as a parallel entry?

## Recommended next move

Build **Scene 2's backwards sweep**, then **Scene 3**. Between them they are the whole argument for virtual nodes, and Scene 6 currently rests on a rule the story has not yet shown. After that the spine: the xstate scene machine and navigation, since nine standalone stories are not a demo.
