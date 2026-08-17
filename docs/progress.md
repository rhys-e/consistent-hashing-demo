# Hash Ring Visual Redesign — Progress

Status against [`hash-ring-visual-design-plan.md`](./hash-ring-visual-design-plan.md), as of 2026-08-10.

**Verdict:** The spine of the argument now exists end to end: a number line bends into a ring, servers take positions on it, a key routes to one, a server fails, and the same thing is then shown at production density. The gap that mattered most — nothing had ever turned a _position_ into a _range_ — is closed by Scene 2, and closed by demonstration rather than assertion. Scene 4 now supplies the answer Scene 3 sets up, so the argument no longer asserts anything it could demonstrate. What is left is not story but structure: a scene machine, navigation, and the sandbox.

## Scenes

| Scene                | Plan status             | Notes                                                                                                                                     |
| -------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **0–1 Hash Space**   | Done, merged            | One scene: rail draws, keys land, rail bends into a ring. Missing: hover-to-replay a key.                                                 |
| **2 Lookup**         | **Built**               | Keys land on the ring, servers arrive, keys step inside, three lookups are taught, then the arcs sweep. Ends on Scene 3's opening frame.  |
| **3 Server leaves**  | **Built**               | `cache-4` wavers, drops, leaves an unowned gap; the neighbour sweeps across it. 31.1% → 64.3%, four of eleven keys move.                  |
| **4 Virtual nodes**  | **Built**               | Scene 3's failure again at six positions each, placed rather than hashed. 64/36 becomes 52/48; the keys leave during the split.           |
| **5 Zoom density**   | Not started             | Optional for the first pass; 6C is the obvious basis for it.                                                                              |
| **6 Full-scale**     | **Chosen and animated** | 6A lanes. Opens on the shared ring, separates into one lane per server, load panel resolves in. Missing: the low-to-high density opening. |
| **7 Remap at scale** | **Animated on 6A**      | A seventh server joins, each server hands over in turn, the lanes fold back into one ring, and the newcomer's share is picked out on it.  |
| **8 Sandbox**        | Not started             | Existing freeform app still the live demo.                                                                                                |

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

## Positions become ranges

This was the gap, and Scene 2 closes it. Scene 6 assumes a viewer reads a coloured arc as "the range this server owns", and nothing had taught that.

The order is what does the teaching. Keys land on the ring as Scene 1 left them. Servers arrive on the same ring, hashed by their own names, and the keys step _inside_ it — the band is about to stop being a number line and start being ownership, so they vacate it, which makes the notation change a motivated moment rather than a difference between two slides. One key then travels clockwise to the first server it meets, slowly enough to be read as a rule; two more confirm it is a rule; the rest follow at once. **Only then do the arcs sweep**, backwards from each server to the position before it — so a range arrives as _the set of positions that route here_, derived rather than asserted.

Two properties are enforced rather than intended:

- **A key has no colour until its own lookup arrives.** Colouring it up front would be showing the answer and then demonstrating the question.
- **Scene 2's last frame is Scene 3's first frame**, asserted attribute-for-attribute across the two components. They are separate scenes with separate timelines, so every retiming is a chance for them to disagree by a few units — which reads as the ring jumping at a slide boundary and is invisible to anyone testing either scene alone.

Scene 4 then splits each server into many markers and the same sweep runs many times, arriving at exactly the frame Scene 6 opens on.

### What the two ring scenes share

`RingParts.jsx` owns the geometry (`LAYOUT`) and the three marks: the head-bright ownership arc, the server node, and the key. Shared rather than copied, because two copies drift — a radius here, an inset there — and the continuity the pair depends on would then need maintaining by hand. `KeyMark` takes an animatable inset, so "key on the line" and "key inside on a stem" are one component at two values.

Three drawing rules were learned the hard way and are worth not relearning:

- **A circle with no dash array is a _solid_ one.** An arc that owns nothing therefore draws the whole ring unless something stops it. `MIN_DRAW` draws it at a minimum length and hides it, which also avoids the sub-pixel dash that renders as a disc.
- **A server node has to sit _proud_ of the band.** Narrower and the slivers of arc above and below trace its outline; running the arc forward to cover that outline instead pushes colour past the boundary, which in a scene about where boundaries fall is the worse error.
- **Key labels follow the radius and are centred**, with a gap wide enough to clear half a label. Anchoring by side avoids overlap too and looks like three rules fighting.

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
- **The progress ticks wait with it.** They were the one control on screen throughout, which put a column of marks down the edge of a composition whose whole point is that nothing else is on it. They now arrive with the transport and the scroll hint.

  That needed a second flag, because the two questions turned out to be different. `engaged` decides whether the deck still advances on its own, and deliberate navigation deliberately does _not_ set it — a viewer who presses the down arrow has nudged the story along and may well want it to carry on. But they have started steering, and from that moment the marks are worth showing. `steered` is set by any `GOTO`, `NEXT` or `PREV`; `isSteering` is the two together, and it is what the ticks read.

  Hiding them hides the only pointer-free way to see where you are, so focus brings them back. They stay in the document and stay focusable and only their opacity goes — `display: none` or `aria-hidden` would leave a keyboard user with focus on something invisible, which is worse than the clutter this removes.

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

## Scene 4, and what the data would not allow

The plan asked for a stepper at one, three and eight positions per server. The data refuses both intermediate counts, and the refusal is worth recording because it looks like a bug in the scene rather than in the plan:

- **At three positions each the surviving neighbour still takes 96%** of what was lost. The scene would show virtual nodes not working.
- **At eight, the starting split is 44/33/22** — visibly worse than at one — so a viewer would read the fix as having caused the problem.

Both are small-sample noise rather than anything about consistent hashing. **One against ten** is the honest pair, and ten is representative rather than lucky: every count from eight upwards splits the failure roughly in half.

|                    | before             | after the failure            |
| ------------------ | ------------------ | ---------------------------- |
| one position each  | 31.1 / 33.2 / 35.7 | **64.3 / 35.7**, in 2 pieces |
| ten positions each | 35.6 / 31.6 / 32.9 | **51.5 / 48.5**, in 7 pieces |

The two levels start from the same balance, which is what makes it a comparison: the only thing a viewer has to account for afterwards is the density. A test asserts that, because a dense level that happened to start more even would let the scene take credit for the wrong thing.

Three things the scene had to do that the earlier ring scenes did not:

- **Nodes shrink as they multiply.** Thirty positions puts the closest pair about a pixel apart. Beyond crowding, a scene with many positions per server is no longer asking anyone to look at one of them, and the mark should stop inviting it. Names leave the ring entirely — the share panel is the legend.
- **The head-bright arc fade has to switch off.** At thirty arcs a tail at a quarter opacity beside the next arc's bright head reads as a _gap_, so a fully owned ring looks broken. `OwnershipArc` takes a `flattenFor`, and the fade goes as the split runs — by which point the direction it exists to state has long been taught.
- **The keys leave.** Only one of the eleven belongs to the failing server at ten positions each, which is too small a sample to carry anything. That is the scene's second job rather than a loss: thirty boundaries is past the point where an individual key can be followed, and reading the ring as quantities is exactly what Scene 6 assumes.

The two densities are separate sets of ranges crossfaded, not one set that grows — a topology is rebuilt when its vnode count changes. What carries the eye across the change is the marks flying out from each server's first position on tethers, which is also what makes ten marks in one colour read as _one server holding ten places_.

## Scene 5 shows what Scene 6 was asserting

The plan called this optional and described a magnifier. The data says the sweep
is the point and the magnifier is the setup. At the full-scale topology — six
servers, 150 positions, 901 ranges — a **29-pixel** window of the ring holds:

| window | ranges inside | distinct servers |
| ------ | ------------- | ---------------- |
| 0.5%   | 2–10          | 2–6              |
| **2%** | **13–24**     | **5–6**          |
| 4%     | 30–44         | 6                |

Five or six different servers in a hairline, _wherever you point it_. Magnifying
one arc proves the smear is structure; sweeping it proves the structure is
everywhere, and that second claim is the one the full-scale treatment is built on
and previously only stated in a sentence.

The magnifier needed no new drawing machinery. `windowRanges` clips a set of
ranges to a window and renormalises it to nought and one, so a stretch of the ring
_is_ a stretch of anything else — and the strip is the same dash pattern that
draws every other scene, on a straight line rather than a circle. That took one
parameter: `pathStart`, because SVG begins a circle at three o'clock and a line
where it begins.

Two things worth remembering from building it:

- **The frustum's two lines have to be assigned per frame, from screen position
  rather than ring order.** The window turns as it sweeps, so which arm is
  uppermost changes — and _any_ fixed assignment reads correctly for part of the
  ring and crosses over for the rest. Joining both to the strip's near edge is not
  enough on its own; the corner each one takes is chosen by which arm is currently
  higher. The swap is blended over about thirty pixels of separation so the arms
  meet in the middle as the window passes the top of the ring and separate again,
  instead of snapping across.
- **A hook cannot be called from a per-side helper.** The caliper arms were
  generated by a function called twice, which is four `useTransform` calls in a
  helper — they are written out.

It sits between the Scale narration and Scene 6 with no break, and that narration
lost its "so the picture has to change" ending: with Scene 5 in front of it, the
promise was being made a scene early.

**A seam it does _not_ claim.** Scene 5 draws the six-server topology; Scene 6
opens on the six survivors' ranges taken from the _seven_-server topology, so the
two rings are not the same set of arcs. At this density the difference is
invisible, and no test asserts equality — unlike Scenes 2 and 3, where the frames
genuinely are identical.

## Scene 8 is the argument with the numbers unlocked

The plan described an operator console — vnode tick toggles, a zoom viewport,
sample traffic, a remap overlay. That was written when the sandbox was the thing
this replaced, and a console of toggles is a worse brief than the one the story
now supplies: nine slides made five specific claims with one example each, and the
sandbox's job is to let somebody test them with their own numbers.

So there are two controls and two readouts. Server count and positions per
server; **spread** (how far from even, in points) and **what the last change
cost**. Nothing else, because nothing else was earned.

It reproduces the story from the viewer's own actions, which is the check that it
is the same model and not a second one:

| what you do               | what it says                                   | which scene said it |
| ------------------------- | ---------------------------------------------- | ------------------- |
| positions 150 → 1         | spread 5.9 → 66.3 pts, 83.4% of the ring moved | 4                   |
| add a server at 150 each  | 13.2% of the ring moved                        | 7                   |
| drop a server at 1 each   | one neighbour takes all of it                  | 3                   |
| drop a server at 150 each | all five share it                              | 4                   |

Three things it needed that the timed scenes did not:

- **One circle per server, not one per position.** The other ring scenes draw an
  arc per position, which is affordable at three and at thirty and is not at five
  hundred. A `pathLength="1"` circle with the server's ranges as its dash pattern
  is the same picture in one element — the device the full-scale scenes use, and
  the only reason this one can be dragged to four thousand positions.
- **A settle value instead of a beat.** Every change sets one motion value to zero
  and runs it to one; the bars read it as "move to the new number" and the two
  rings read it in opposite directions. Two topologies cannot be tweened — changing
  the position count changes every boundary — so the only honest transition is a
  crossfade.
- **The readout is derived, not held.** It was briefly written when the crossfade
  finished, which made the one number the scene exists for depend on an animation
  having run. That is the coupling that made the deck's countdown unreachable, and
  half a second of politeness is not worth inviting it back.

Two bugs worth recording, both invisible without looking:

- **`border-ui-border` was never a Tailwind utility** — only a CSS variable — so
  every control's border fell back to `currentColor`. It is in the config now.
- **A selected state appended after a base class is a coin toss.** Tailwind
  resolves two utilities for one property by stylesheet order, not attribute
  order, so the chosen position looked identical to the other five. The base
  carries no colour now and the two states are alternatives.

## How the story is written

Everything a viewer reads follows the sentence half of **ASD-STE100 Simplified
Technical English**, and none of its dictionary. One idea per sentence, twenty
words at most, active voice, no em-dash asides, no metaphor, one term per concept.
The ~900-word approved vocabulary is not adopted: it is built for maintenance
procedures and would cost this story words it depends on — _absorb_, _density_,
_share_, _even_.

`copy.test.js` enforces the mechanical half against every narration paragraph and
every in-scene line: sentence length, no smuggled second clause, no word that
measures duration where the ring is measured in distance, and one term per
concept — a server has _positions_, a position owns a _range_, and slot, token,
span, segment and section are all rejected. The rest — active voice, no metaphor — is a review question, not a test.

The in-scene lines follow the same rules as the slides, in about thirty words
rather than a hundred and seventy. They were rewritten twice: once to the sentence
limit, which made them clipped, and again with connectives, which is what the
slides needed too.

The prose is short-sentenced but not clipped. An early pass made every sentence
five to eight words, which read as a list rather than as speech — the fix was to
vary the length between about seven and nineteen words and to join clauses with
ordinary connectives, which STE permits. Sentence length is a ceiling, not a
target.

Four things this turned up:

- **The rules limit sentences, not paragraphs.** The first pass split every pair of
  short sentences into its own paragraph, which turned each slide into a list of
  fragments with a gap between each one. STE allows six sentences in a descriptive
  paragraph; the slides are now two paragraphs of three or four.
- **Titles are capped at four words because of the scramble**, not the writing. The
  heading face is proportional, so a block glyph is not the width of the letter it
  replaces, and a title set near the width of its column reflows as it resolves.
- **Paragraphs have to fill the measure.** The column is a fixed width, so a
  paragraph shorter than about two and a half lines stops before the right edge
  and the block stops reading as one column. `text-wrap: balance` makes this
  worse, not better: it shortens lines deliberately, so every paragraph settles at
  its own width. Paragraphs are now written to a character band and a test holds
  them there.
- **`bg-cyber-border` was never a class.** `cyber-border` is registered under
  `borderColor`, so it makes a border utility and no background one — the hairline
  rule above every narration title had never drawn anything. It is `bg-ui-border`
  now. That is the second dead Tailwind class found this way, after
  `border-ui-border`.

The hairline above each title is gone with them, and the opening slide is left
aligned like the rest. A centred opening and left-aligned chapters are two
typographic systems in one deck, and a reader notices the switch rather than the
emphasis. `lead` now changes exactly one thing: the size of the title.

The part number and section label above each title are gone. The label repeated
what the title said, the ticks down the edge of the deck already show how far
through a viewer is, and the numbering had been rewritten twice as scenes were
inserted — a fair sign it tracked a structure the story never committed to. The
opening slide now names the subject, set larger and centred, and is otherwise the
same component as the rest.

## Two things that hold a composition together

**The right-hand column is drawn from the first frame, not faded up.** The ring is
composed off-centre to leave room for a panel, so a scene that opens on the ring
alone reads as a ring pushed out of true.

Fading the panel up was the first answer and it was worse. A ghost of a panel is a
third thing to look at, and the moment a line of commentary appears beneath it at
full strength the column is showing two opacities at once — which is confusing in
a way that an empty column is not. Moving the ring instead was considered and
rejected: it makes every scene open with a large gesture that competes with its
own content, and it leaves the commentary with nowhere to sit.

What the column shows is the panel's _chrome_ — heading, server names, colour
swatches, empty bar tracks, the even-share mark — at full strength, with only the
bars and the numbers animating in. That is not a ghost. It is a panel with no
numbers in it yet, which is exactly what is true. Scene 5 does the same with an
empty slot where its strip will be.

**A narration title tears in the last second and a half.** Two horizontal bands
slide against each other and separate into red and blue for a third of a second.

It fired with the countdown bar at first, which put two changes on screen at the
same moment and made a viewer choose between them. The bar now has the slide's
last few seconds to itself and the title takes a bow at the end of them, which is
a `counting.closing` substate of the deck machine rather than a timer beside it.
Neither happens once a viewer has taken over, because then nothing is about to
happen.

The bands are pseudo-elements reading `data-text`, which keeps one copy of the
title in the document. The first attempt drew four real spans, which is how this
effect is usually built and which put four copies of every heading in the DOM — a
text query found four of them, and a reader would have copied four.

## What the story is selling

The comparison the whole thing is against — plain modulo — was made once in the
opening slide and never again. The sandbox now states it every time the roster
changes: **13.2% of the ring moved · plain modulo would have moved 85.7%**.

The number is exact rather than sampled. A key keeps its server only when
`k mod n` equals `k mod m`, which happens for `min(n, m)` values in every `n * m`,
so the fraction that moves is `1 - min(n, m) / nm`. It appears only when the
number of servers changed, because changing how many positions each server holds
is not something plain modulo has an opinion about.

`spread` was removed to make room for it. It was the distance in points between
the largest and smallest share, which is a real measure and not one anybody reads
off a label — and the bars beside it already show the balance.

Both figures sit in the panel column, under the shares, where every other scene
puts its numbers. They started in the control bar and did two things wrong there:
a measurement among the controls reads as another control, and on a narrow window
the second figure pushed the controls themselves onto a new row.

**A change is a change of roster, not of density.** Changing how many positions
each server holds also moves keys, and reporting that under the same heading made
one number answer two questions — a reader could not tell whether 31% was the
price of a server leaving or of turning a dial. Density is a setting; the roster
change is the event, and only the event is costed. Anyone who wants to know how
density affects the cost sets the density first and then adds a server, which is
the comparison they were reaching for anyway.

## The density label came and went

Every dense scene briefly carried a fixed line under the ring — `6 SERVERS · 150
POSITIONS EACH` — on the reasoning that a viewer arriving by link has nothing
telling them which ring they are looking at. It was removed: it is true on every
frame and useful on almost none, and a line that never changes stops being read
after the first scene.

What it was really covering for was the narration, which now names the step
directly. The Scale slide says that every ring so far has been a simplified one
and that what follows is the same ring at close to production scale.

The full-scale scene's opening note went at the same time, and for good. The Scale
slide states the density and Scene 5 shows it, so a third telling arrived over a
ring the viewer had already been told about — and because the note blurs the
artwork to say it, the ring was on screen unblurred for a moment first, which read
as the note being late rather than as the scene starting.

## The transport is one button

Back and Next are gone. The reasoning for them held — a scene that has finished
has nothing to offer but a replay, and stepping lets somebody return to the moment
they missed — and the control did not. A step is only meaningful at a rest, the
rests are unevenly spaced, and pressing Next twice lands somewhere a viewer has no
way to predict, so a control that reads as a scrubber behaves like a chapter list
nobody has seen. What is left is Replay, which is never ambiguous.

The steps themselves stay. They are the scene's structure and what `sceneRests`
checks every scene against, not only a control surface.

## Every slide has an address

`#/key-routes` rather than `/key-routes`, so a link into the middle of the story
works from a static host, a preview build or a file, with no rewrite rule. The
leading slash keeps the fragment from naming an element and sending the browser
looking for something to scroll to. The slug is the slide's own `key` — they were
already unique and already kebab-case, and a second name for the same thing is how
two names drift.

**Deliberate moves push; automatic ones replace.** The machine records `viaViewer`
on the action that moved it, which is the one thing the address bar cannot work
out for itself. Without that split a story that plays itself fills the history with
entries nobody asked for, and the back button stops being a way out of the page and
becomes a way to walk backwards through it a slide at a time.

Two things this turned up, both invisible until a deep link existed to expose them:

- **The stack mounted at zero and animated to its position.** On the opening slide
  that is invisible, because zero is the answer; on a link into the middle it is a
  second of the deck scrolling past somebody who asked to be somewhere in
  particular. `initial={false}` says start where you already are.
- **It also has to be measured before it mounts.** `y = -index × height`, so a
  stack rendered before the height is known is positioned at zero whatever
  `initial` says. The slides now wait for the first measurement.

Sync is opt-in (`urlSync`), because owning the address is a claim about being the
page — true of the story, not of a deck rendered as one example among others in
Storybook.

## The old demo is gone

The freeform sandbox this repository started as has been removed, and the guided
story is now what `index.html` builds. That took out `src/components/*` (the v1
ring visualisation, controls, console, metrics), `src/state/` (its stores and
machines), `src/hooks/`, `src/context/`, `src/hocs/`, `src/constants/` and
`src/utils/` — and with them `d3`, `seedrandom`, `@xstate/store` and `react-scan`,
none of which the story imports.

Two things moved rather than went:

- **`src/components/story-scenes/` is now `src/components/`.** The extra level
  existed only to keep the scenes away from v1's components, and with those gone
  it was a directory that meant nothing.
- **The slide list is `src/components/Story.jsx`, not a Storybook file.** Defining
  the deck inside a `.stories.jsx` was fine while the deck was a prototype beside
  a different application, and became the wrong place for it the moment the deck
  _became_ the application. Storybook and `storyDeck.test.jsx` both import it from
  there now.

`src/themes/` stayed whole. Only `colors` is read by the story, but `index.css`
resolves CSS variables out of the rest of it, so pruning the unused keys is a
separate job from removing v1.

Scene 8 in the plan — the sandbox — no longer has an implementation to inherit.
That is deliberate: the freeform demo it described was the thing this replaced, and
if it comes back it should be built on the ring the story has taught rather than
kept alive beside it.

## Two things a holistic review turned up

Both had been noted before and both had been mis-estimated, which is the reason
for writing them down properly.

**The even-share mark in Scene 7 was measuring against a fleet that was not there
yet.** The panel was handed the seven-server shares with no `evenShare` override,
so it derived the mark from the row count and fixed it at a seventh for the whole
scene. The first third of the scene therefore drew six servers, each holding a
sixth of the ring, every one of them over an even share — when six servers holding
a sixth each is the most even a ring can be. It is the same defect that was found
and fixed in Scene 3, and the sandbox had already got it right.

The mark now moves on `timeline.roster`, the window the newcomer's row slides into
the table on, because the row arriving _is_ the server starting to exist. Between
that and the handover the panel says something true and useful: seven servers now,
six of them over, one at nothing.

The earlier note here said this would need a beat of its own, on the grounds that
the roster changes during the handover and a moving mark would trip the rest
guard. That was wrong, and wrong for a knowable reason — the roster slide is
already its own window, deliberately separated from the handover so that six lanes
giving something up means something. There was no step inside it to trip.

**Scene 3 spent its first third rebuilding a picture already on screen.** It
landed its own markers, swept its own arcs and placed its own keys, arriving at
the frame Scene 2 had just ended on — the frame `Story.jsx` puts no slide between
them in order to preserve. Twelve of its thirty-five seconds went on it.

It now opens assembled. The establishing windows are kept as intervals of no
length at beat zero, because `rangeProgress` reads a zero-length window as
complete and every layer can go on asking "how far through my window are we" and
be told "all the way". The alternative — a second, settled code path per layer —
is the version that rots, since the drawing and the timeline would then hold
separate opinions about what the scene opens on. That is exactly the bug the
full-scale scene had when it kept its own copy of the timeline.

The panel is the one thing that still arrives, because it is the one thing Scene 2
never put on screen. The ring carries straight over and the measurement of it turns
up: that is a scene beginning rather than the previous slide being redrawn.

`lookupScene.test.jsx` now asserts the seam at **beat zero** rather than at the
settled rest, which is the claim that actually matters. Scene 3 is 25.3 beats to
19.6, or 35 seconds to 27.

## Arcs are flat, everywhere

The head-bright fade is gone from all three ring scenes. It stated the one thing a
uniform band cannot — that a range _ends_ at its server and begins at the one
before — and it reads beautifully on three arcs. It does not survive thirty. A fade
needs room to be a gradient, and in fifty pixels it is an edge, so the dark tail of
one arc against the bright head of the next reads as a gap and a fully owned ring
looks broken.

Two escapes were tried before flatness won, and recording them matters because both
looked like the answer:

- **Switching it off partway through Scene 4**, which is what shipped. It left the
  story with two treatments and no event to explain the change from one to the other.
- **Scaling how far the fade falls to how much room the arc has.** One rule, and
  Scenes 2 and 3 came out pixel-for-pixel unchanged — but across Scene 4's thirty
  arcs it produced tails at every alpha from 0.26 to 0.99 on the same ring, which is
  a third thing to look at rather than a subtler version of the first.

What the fade said is said by movement instead, and always was. Scene 2 sweeps every
arc _backwards_ from its server to the position before it: the ownership rule
performed rather than shaded. A still frame never had to carry it. `OwnershipArc`
keeps a `fade` prop for the Storybook comparison that settled this and no scene
passes it.

### The positions are placed, not hashed

Full-size dots overlap on a hashed ring — twelve of the thirty neighbouring pairs
touch and two are 1.1px apart — and the picture cannot be fixed by re-rolling it.
52,800 candidate casts and vnode key formats were measured (ten name families ×
every triple from 1..16 × which departs × ten formats) and **none got below seven
collisions**. Only 744 of the 52,800 put the three-server ring anywhere near even
in the first place, which is the genuinely scarce property and the one the current
cast is close to the best on.

So Scene 4's positions are chosen instead. `placedRing.js` lays slots evenly across
each arc between the three real positions, then jitters each within the room it has
above a minimum gap.

**What it costs.** These are not where `cache-3#7` hashes to. The defence is that
the scene never claims they are: what it claims is that a server holding many
positions has its failure absorbed by several neighbours rather than one, and that
is a fact about counting, not about this sample. Names and hash values have already
left the ring by the time the split runs, precisely because the scene has stopped
asking anyone to look at an individual position.

**What is kept in exchange.**

- **The three `#0` positions stay real hashes**, so the frame Scene 4 opens on —
  Scene 3's ring — is untouched, and the density bridge still opens on exactly the
  marks Scene 4 ends on. Both are asserted.
- **The ring must not read as arranged.** Perfectly even spacing would be a worse
  lie than the clumping, because evenness is the thing consistent hashing has to
  work for. A test holds the widest gap at least half again the tightest.
- **The server assignment is shuffled, then repaired.** A repeating `A B C` cycle
  would put every one of the departing server's ranges next to the same neighbour,
  so a failure would hand the lot to one and the scene would demonstrate the
  opposite of its argument by construction. The order is shuffled for irregularity
  and then pair-swapped until the successor counts balance.

|        | min gap | max gap | ratio | collisions   | shares             | after       | bigger takes |
| ------ | ------- | ------- | ----- | ------------ | ------------------ | ----------- | ------------ |
| hashed | 1.1px   | 233px   | 205:1 | **12 of 30** | 35.6 / 31.6 / 32.9 | 51.5 / 48.5 | 51%          |
| placed | 37.8px  | 53.8px  | 1.7:1 | **0**        | 32.6 / 35.5 / 31.9 | 49.9 / 50.1 | 51%          |

Every claim survives, and the closing split is now dead even rather than 51.5/48.5.

### Which unlocked a choice the hash was making for us

Under a hash the position count was not free. Ten was the only value from one to
twelve whose ring started anywhere near even, so every airier option was ruled out
by the balance rather than by the argument — six hashed starts **sixteen points**
from even against the one-position ring's four and a half, which would give the
viewer two changes to account for and let them credit the wrong one.

Placed, evenness is built rather than drawn for, and the count became a free
choice. **Scene 4 now runs at six positions each.**

|                          | dots | min gap | ratio | collisions | shares             | spread   |
| ------------------------ | ---- | ------- | ----- | ---------- | ------------------ | -------- |
| hashed, 10 each _(was)_  | 30   | 1px     | 205:1 | **12**     | 35.6 / 31.6 / 32.9 | 4.0      |
| hashed, 6 each           | 18   | 7px     | 36:1  | **4**      | 35.9 / 23.9 / 40.1 | **16.2** |
| placed, 6 each _(ships)_ | 18   | 51px    | 2.2:1 | **0**      | 34.9 / 34.4 / 30.7 | 4.2      |

Eighteen dots rather than thirty, a minimum gap of three dot widths rather than
two, and the argument comes out _stronger_: the failure breaks into six pieces and
the bigger survivor takes half of what was lost. The scene is also 1.4 beats
shorter, since fifteen positions are dealt out during the split rather than
twenty-seven.

The copy moved with it — the Scale slide now says "Six positions each cut the
damage in half", Scene 4's step reads `Six positions each`, and its closing line
says six pieces. `spreadModel.test.js` asserts the whole thing, including a test
whose only job is to record _why_ six needs the placement: it holds hashed-six
above fifteen points of spread and placed-six below six.

## The polar ground stays in Scene 1, and nowhere else

Scene 1 has two grids and neither is decoration: a cartesian one under the number
line and a polar one that resolves in as the line bends. The scene's central move is
that the _coordinate system_ changes, and those two grids are what make that
something a viewer sees rather than something they are told.

That looked like an argument for carrying the polar grid forward — the story spends
seven more scenes on the ring it describes, and drew none of it. So it was built:
one component from `LAYOUT`, on every single-ring scene, and on the narration slides
too, on the reasoning that an interstitial should read as a moment in the same
object rather than as a separate page.

**Looked at, and removed.** On the interstitials it was plainly wrong: a slide of
prose has no geometry, and a polar figure behind it is a motif rather than a ground.
On the scenes it was closer, and still lost — by the time a scene has a ring, arcs,
marks, a panel and its own animation on it, a grid underneath is one more thing
happening. The rule it would have justified was a good one and it did not save it.

Two things survive the experiment, both worth keeping written down:

- **The narration slides' cartesian wash is gone**, and it should have gone
  regardless of any of this. Three percent white at thirty-five percent opacity is
  about one percent over the background — roughly a tenth of what Scene 1 draws, and
  invisible. It had a comment arguing it put the slides "on the same surface" as the
  scenes, which is an argument that was never actually delivered to anyone.
- **Scenes 6 and 7 could never have had it anyway.** The ground's circles land at
  112 and 180 against a lane band running 92 to 226, so they would have read as more
  lanes. If this is ever revisited, that is the measurement to start from.

## The opening scene has a postscript

Scene 1 ended on three keys sitting still on a closed ring. True about where three
keys are, poor about what a hash ring is — a cache is not three values at rest, it
is a stream of them, and every one lands somewhere by the rule that put those three
where they are.

So the scene now **clears itself and then runs**. The slide has said what it has to
say, and everything that said it goes: the two bounds labels, the standing
commentary in the corner, and the three keys the scene was about. What is left is a
ring with keys landing on it, which is nice to look at, marks the end of the slide,
and is about to be carried off the screen anyway.

|                    | beat        |                                                 |
| ------------------ | ----------- | ----------------------------------------------- |
| ends joined        | 11.8 → 16.3 | the last line read, everything still up         |
| clear              | 16.3 → 18.7 | writing goes, then the three keys one at a time |
| **the ring alone** | 18.7 → 19.6 | a step, and the frame the clearing lands on     |
| arrive             | 19.6 → 20.4 | the first of the traffic fades up               |
| keys keep arriving | 20.4 → 23.4 | four and a half seconds of a working ring       |

**Things go in the order they stop being needed.** The furniture around the ring
first, then the examples on it. A key's _name_ goes ahead of its mark, because the
name is the part that stops being true first — the mark is still a position on the
ring after nobody is being told which key is at it.

**And the quiet ring is a beat, not a gap.** An earlier version interlocked the
arrivals with the departures so the ring was never empty, on the reasoning that a
gap is a stall. It is — when the only thing leaving is three keys. Once the labels
and the commentary go with them, the clearing is the event and the quiet ring is
what it lands on.

Two departures were tried before the fade. **Shrinking** reads as the mark being
deleted, and these are not deleted. **Sinking them inside the ring**, along the path
the traffic rises from, was meant to say the examples were going back into the
stream; it read as them falling out of the picture.

### The traffic itself

About three or four keys on the ring at a time, out of a pool of eighteen, each
there for five and a half seconds and landing about a second and a half apart —
slow enough that watching one is a choice rather than a reflex. Two earlier speeds
were quicker and both read as a shimmer, where the _rate_ is what you notice, which
is a texture and not a fact.

Two things make it decoration rather than content:

- **It is marked `data-ephemeral`.** A step lands where nothing is moving and this
  never stops moving, so the two are irreconcilable unless the rest guard steps over
  it. Same exemption the arrival glow and the seam pulse take.
- **It runs on its own clock**, not on the scene's beat. That is what carries it
  through the slide being taken off the screen — and it only works because leaving a
  scene now holds its last frame instead of rewinding it.

**They are named, and that took a correction.** The first version gave them no
labels and half opacity, on the reasoning that anything unreadable cannot compete
with the three keys the scene made claims about. It could not compete with anything:
an unnamed dot is a particle, and a ring with particles landing on it is being
decorated rather than used. They now carry names in the shapes the story's own keys
take. Names sit **inside** the ring, which is arithmetic rather than taste: the
closed ring is 263 units across a stage 620 deep, so it clears the top and bottom by
about forty and there is nowhere outside it to put a label at those angles.

**The pool is placed, not hashed**, and for once that is not Scene 4's argument.
Eighteen raw hash positions put the closest pair nine ten-thousandths of the ring
apart — about a pixel and a half — so two keys arrived on top of each other. But
evenly spacing them would be worse in the other direction: keys that arrive one
after another are neighbours in the pool, so even spacing marches them round the
ring like a clock hand. Evenly spaced slots with a bounded wobble give the
separation, and a stride co-prime to the count gives the scatter in time.

**They arrive one at a time.** A pool of eighteen with each on the ring for a fifth
of a turn settles at three or four, and it used to reach that in a single frame:
every key whose window contained the starting instant appeared together. The clock
counts turns rather than resetting, and a key has not started until the clock has
come round to it.

**Which is also why the clock can be held.** Everything else in the story is a pure
function of a beat, so a frame can be pinned and looked at. This runs on wall time,
so a pinned frame showed an empty ring and a review story had nothing in it.
`pinnedTurns` holds the clock at a chosen point, which is how a still frame of a
moving thing gets looked at.

## The ring arrives from somewhere now

Scene 2's ring was simply _there_ on the first frame — the one thing in the story
that appeared without having come from anywhere, where every other mark grows,
sweeps, falls or resolves. It now draws itself round from the seam over about a beat
before anything lands on it, in the same `pathLength="1"` dash units the ownership
arcs use, so it is made of the device the rest of the scene is made of rather than a
second one.

The seam tick waits for the ring to come back round to it. That makes the seam the
place the ring was drawn _from_ rather than a mark that happened to be there first,
which is a thing the scene otherwise asserts with a tick and never demonstrates.

## Arriving is not the same as leaving

A slide is inactive for the whole of the deck's transition, at _both_ ends of it,
and `active` cannot tell those apart. While the transition was a quarter of a
second nothing had to: reduced motion made it a near-cut and both ends were over
before they could be read. At the full second and a bit they are opposites — one is
a slide with nothing on it yet, the other a slide with everything on it still — and
two faults fell out of the confusion.

**A title arrived finished, then broke up, then finished again.** `useScramble`
returns the resolved string when it is inactive, so the completed title rode in on
the transition, and only when the slide landed did it dissolve and resolve. The
viewer read it, watched it come apart, and read it again.

The first fix carried it in as static noise instead, and that was wrong for a
reason worth keeping: **noise only reads as something resolving while it is
actually moving.** A frozen row of block glyphs riding in on a slide looks broken,
not loading. So nothing is there at all until the slide lands, and then one thing
happens — the title arrives out of nothing and settles into itself. `useScramble`
still holds noise underneath rather than the answer, because the resolve is started
by an effect and a title left resolved would paint one frame of the finished text
at the instant it becomes visible.

The paragraphs now start at 0.3s rather than 0.45s and overlap the title's resolve.
Waiting for it cost half a second on top of a transition already a second long, and
bought a beat of an empty slide nobody asked for. The title is still the first
thing to appear and the first to settle, which is all the order has to establish.

**Everything reset as it left.** The paragraphs animated back to hidden and every
scene ran `progress.set(0)`, so a slide the viewer had finished with played its own
arrival backwards, and a scene rewound to its opening frame while still on screen.
Both now hold what they had. The rewind happens on the way back _in_, which is the
same moment and a quieter one, since by then nobody is watching the frame it
rewinds from.

Both fixes need the same distinction, so `current` is threaded from the deck to
`NarrationSlide` and through every scene wrapper to `useSceneTimeline` as
`arriving`. It defaults to `active` in both, so anything rendered on its own — every
Storybook story — behaves exactly as it did.

The alternative was to keep the transition fast enough to hide all this, which is
what reduced motion had been doing by accident. That would have been a decision to
stop the deck moving properly in order to avoid fixing what the movement revealed.

### What it costs, measured

A narration slide is fully settled **1.97s** after a slide change begins: 1.05s of
travel, then the title fades up over 0.3s while resolving over about 0.5s, with the
paragraphs starting at 0.3s and the last one landing at 0.92s. The title is legible
around 1.55s.

Nothing overlaps the travel, and that is the remaining lever. Letting the title
begin before the slide lands would save 0.21s at 80% of travel, 0.37s at 65%, or
0.53s at halfway — but the deck has no signal for "nearly there", so it would need
a timer keyed to the transition's own duration, and a second one for the reduced
motion case. Not built, because two seconds on a slide that then holds for several
is a small thing to buy with a race against an animation.

## A slide between Scenes 2 and 3, against a decision that said not to

`Story.jsx` had this written down: "Two slides, no break. Scene 2 ends on the frame
Scene 3 opens on and a narration slide between them would spend the continuity the
pair was built to have." Scene 3's opening establishing sequence was removed to
build that seam, and `lookupScene.test.jsx` asserts the two frames match
attribute-for-attribute at beat zero.

The seam was real and it was being spent on the wrong thing. Everything up to Scene
3 builds a ring and puts a key on it. Then Scene 3 fails a server, having never
said that servers fail — so it opens with an _answer_ to a question the story last
asked four slides earlier on the opening slide. A demonstration of something nobody
has been told is a problem is only a thing that happens.

So one slide now asks it:

> **Servers come and go**
>
> So far the ring has held still. Real caches do not. A server fails, or somebody
> adds one to carry the load. Either way the group sharing the keys is a different
> size.
>
> That is the moment consistent hashing is built for, and one question decides
> whether it works. When a server leaves or a new one joins, how many keys have to
> move?

It also names _joining_, which nothing had until Scene 7 did it, so the leave-and-
rejoin pair the story spends five scenes on is finally framed as one problem.

**What survives.** The frame identity is untouched and still asserted — a viewer
reads the slide and looks up to find the ring exactly where they left it, which is
a weaker continuity than unbroken motion but a better place to spend it, since the
slide gives them something to come back _from_. The deck's guard was rewritten
rather than deleted: it now requires exactly one interstitial there and checks the
slide is the question rather than any interstitial that happens to have drifted in.

The rule in `Story.jsx` is restated to match. An interstitial earns its place by
asking the question the scene after it answers, which is why Scenes 5 and 6 still
have nothing between them.

The deck is now thirteen slides, six of them narration, ~50 seconds of reading.

### Scene 4's closing line names what changed, not just what happened

It read "The same failure broke into six pieces, and neither neighbour took much
over half" — true, self-contained, and written as though the viewer had not just
watched the other version. The scene exists to be held against Scene 3, whose
closing line is "All of them went to the same neighbour, which now owns roughly
twice what it did", so the answer has to be an answer:

> One neighbour took all of it last time. This time the extra positions broke the
> same failure into six pieces, and each neighbour took about half.

Eight words then eighteen, which is the shape the in-scene lines want — a short
sentence that fixes the comparison, then the one that carries it. It also puts the
_cause_ in the sentence rather than leaving the viewer to supply it, which is what
the old wording asked them to do.

Both halves are checked rather than asserted: the failure breaks into exactly six
pieces, and the two neighbours take 50.4% and 49.6% of what was lost.

### The closing highlight stopped hiding the ring

Everything not remapped used to fall to a twelfth opacity while the moved stretches
stayed lit. That answers "which pieces moved" and answers a second question nobody
asked: at that depth the ring stops being a ring and becomes six slivers floating
in the dark. The scene's argument is a _negative_ — that the rest of the ring was
untouched — and it cannot make that argument with the rest of the ring taken away.

Two changes, and they compose. The dim is now 0.45 rather than 0.12, so the
untouched ring stays legible as a ring. And the moved stretches are named from
_outside_ the band by a rail, which says "these ones" without needing anything else
to be hidden — the same `pathLength="1"` dash device the ring itself uses, so it
costs one circle per absorbing server however many pieces the failure broke into.

The restore is unchanged and still does the work the note above it describes: the
highlight is a moment passed through, and the frame the scene rests on afterwards
is the whole ring. Two tests hold it — the survivors' arcs stay above 0.3 while the
moved pieces stay brighter than them, and the rail is absent both before the
highlight and after the restore.

### Three marks tried and rejected

- **A tick instead of a dot.** Mathematically it is what the proportion asks for: to
  hold the one-position ring's 1:28 ratio in a 49px gap the mark has to be under two
  pixels. It lost the round-is-a-server grammar and looked like a different diagram.
- **Fading dots into ticks over the split.** Too much happening at once, on top of
  ten positions arriving and the keys leaving.
- **A shrunken dot with its outline held at full weight**, so a close pair reads as
  two marks with dark between. It reads as a target rather than a node, and was the
  worst-looking of everything tried.

### On the clustering

Measured rather than eyeballed. The gaps between Scene 4's thirty positions have a
coefficient of variation of **1.14**, against **1.00** for an ideally random
placement — very slightly clumpier than typical, which is what a hash does. Seven of
the thirty gaps are under ten pixels and one is 1.1px.

Every alternative vnode key format that looks tidier is _less_ random:
`vnode:{id}:{i}` comes out at 0.71, `{id}-{i}` at 0.84. Reseeding to one of those
would draw a more uniform distribution than hashing actually produces, which is
exactly the false impression worth avoiding. The close pairs are real and stay.

## The cut into production scale, and three ways to bridge it

Scene 4 ends on three servers at ten positions each: thirty marks, countable, each
with an arc of its own. The next thing on screen is Scene 5 — six _different_
servers at a hundred and fifty positions each. Four things change at that slide
boundary, and the narration between them mentions one:

|                | Scene 4 ends         | Scene 5 opens           |
| -------------- | -------------------- | ----------------------- |
| positions each | 10                   | 150                     |
| servers        | 2 survivors          | 6                       |
| cast           | `cache-3`, `cache-5` | `cache-01` … `cache-06` |
| notation       | a mark per position  | no marks at all         |

The geometry is at least shared, so the ring does not move. Everything else is a
cut, and the thing the viewer most needs to believe — that the dense ring is the
sparse one with more in it rather than a different picture — is exactly the thing
they are asked to take on trust.

**It can be shown, and the reason is a property of the model rather than a trick of
the drawing.** A server's positions are `hash(id#0)` up to `hash(id#n-1)`, so
raising `n` _appends_. Of the sixty positions on a six-server ring at ten each,
**zero move** at a hundred and fifty. Every boundary the viewer has been looking at
is still exactly where it was, and a hundred and forty more appear between them.
That is the same claim the whole story is about, arriving one scene before the
viewer is asked to believe it at scale. `densityRamp.test.js` asserts it, because
the bridge is worthless without it.

So the drawing splits in two. **Marks are additive and never move** — one path per
server per tranche, so a tranche fades in and stays, which is what makes nine
hundred boundaries affordable. **Ownership crossfades**, because inserting a
position genuinely hands the range before it to somebody else; two levels are two
answers rather than one answer at two resolutions. The crossfade is bearable
precisely because the marks underneath are not crossfading: the eye holds the
boundaries while the colour behind them resolves.

Positions lead ownership by one movement, on two separate scalars (`positionsAt`
and `levelAt`). New boundaries appear, _then_ the colours rearrange onto them —
cause and then effect. Driven off one scalar the two moved together, and a viewer
watching that has no way to tell which explains the other. Both are whole numbers
at every rest, so steps still land where nothing is in flight.

Marks thin as they multiply and retire before the densest level. At a hundred and
fifty positions each, 757 of the 900 boundaries land within three pixels of the one
before, so a tick per boundary has stopped being a mark and become a fill. Drawing
it while it can be counted and retiring it when it cannot _is_ the notation change
— made visibly, where the cut used to make it silently between two slides.

### Why the number on screen is the biggest piece, not the spread

Spread — the distance between the largest and smallest share — is the obvious
figure and it is not monotone at these sample sizes. Six servers sit at 14.8 points
at ten positions each, **3.0 at thirty**, and 5.9 at a hundred and fifty. A scene
showing it at every level would show its own argument failing halfway through, and
would be telling the truth. That is the trap the plan's 1/3/8 stepper fell into in
Scene 4, in a new place.

The largest single range falls monotonically and by a lot — 7.27% to 0.70% over the
same span — and it is also the figure that matters, because what makes a failure
spread out is that no one range is big enough to hurt when it moves. A test records
both, so the choice is checkable rather than remembered.

Levels are `10 → 30 → 150`. One step between the fixed ends rather than four,
because each is a crossfade and a sequence of dissolves reads as a slideshow of
unrelated rings.

### The three treatments

In Storybook under **Bridges / 01 Density Ramp**, one component, three stagings —
so what is compared is the staging rather than three separately-tuned pictures.
None is wired into the deck.

- **A. Fill in** — the ramp alone, on the cast the following scenes use. 14.7
  beats. Opens at the density Scene 4 ends on, so the notation matches; the roster
  and the cast still jump.
- **B. Carry over** — opens on Scene 4's two survivors holding _the same positions_
  Scene 4 left them on, because they keep their real ids and a position is a hash of
  one. Four more arrive, then the ramp. 17.1 beats, nothing ever cut. Costs a colour:
  the fourth arrival takes `virtualGold`, which Scene 7's joining server wants.
- **C. Through the window** — the ramp with Scene 5's strip up from the first frame,
  held on one section while the density rises under it. The section goes from 2
  servers to 6 without the window moving, so the claim Scene 5 makes by sweeping is
  made here by waiting. Folds the bridge into Scene 5 rather than adding a slide,
  and fills the right-hand column with something true that then grows — the one
  principle the three rejected answers to that problem never satisfied.
- **D. Multiply** — Scene 4's own device at the next order of magnitude. 18.1 beats.
  Opens on the exact frame Scene 4 shows before the failure, deals twenty more
  positions per server out on tethers, collapses the dots into ticks in a beat of
  its own, then washes the last hundred and twenty each in as ticks.

### Why D is the strongest of them

It is the only one that reuses a movement the viewer has already been taught. The
tether is Scene 4's, unchanged: a line from a server's first position to a new one,
fading as the mark lands, which is what makes a burst of marks in one colour read
as _one server taking more places_ rather than as a crowd of new servers. Nothing
has to be relearned.

Its opening frame is not merely similar to Scene 4's, it is the same one — same
server ids, so the same hashes, so the same thirty marks in the same thirty places
at the same radius. `densityRampScene.test.jsx` asserts it mark for mark, in the
manner of the Scene 2/3 seam test, because a later retiming or change of cast would
break it silently and the bridge is pointless once it is untrue.

And it is the only treatment that makes the notation change a thing that _happens_.
A dot and a tick for the same position are on screen together for one movement and
the ring does nothing else while they trade places. Elsewhere in this bridge the
marks simply fade; here they visibly become the boundaries they always were.

Two things it does not solve, both worth deciding on:

- **It rewinds Scene 4's failure**, since it opens on three servers rather than two.
  The narration slide between them has to absorb that. The deck already does this
  once — `Story.jsx` puts a break between Scenes 3 and 4 for exactly this reason,
  because Scene 4 puts the failed server back too.
- **It does not fix the roster.** Three servers at production density hands on to
  Scene 5's six. The cut moves rather than disappearing, though it moves to where it
  does least damage: at that density nothing is followable individually anyway.

Treatment B remains the experiment in fixing the roster, and the two compose — a
roster prelude is orthogonal to how the density ramp is staged.

### One thing the staging got wrong twice

Both times the fault was the same: two things riding one scalar.

Marks and ownership were driven off a single ramp value, so boundaries and colours
moved together and nothing said which explained the other. They are now
`positionsAt` and `levelAt`, one movement apart — positions arrive, then ownership
resolves onto them.

Then the mark layer's retirement was driven off the position count, so the final
tranche of three hundred and sixty ticks washed in and dissolved inside the same
movement, never once being a frame. Retirement now rides the last ownership resolve
— the one movement in the scene with nothing else to say — so the ticks land, and
then the whole notation sinks into the ring it was describing.

## Recommended next move

**Whatever Scene 8 becomes.** The spine is done: the deck is the application, its discrete state is a chart, and every slide has an address. What is left is the interactive end of the plan — a sandbox built on the ring the story has taught, rather than the freeform demo this replaced.

Smaller things still open:

- **`prefers-reduced-motion` stops at the deck.** It swaps the slide transition and nothing else, so six scenes of continuously animating SVG run at full motion regardless. For a piece whose whole pedagogy is movement, the honest answer is probably to jump each scene to its final rest and hold, rather than to play it.
- **There is no way forward through a scene.** The transport is one Replay button, so a viewer who has the point eight seconds into a scene waits out the rest of it. Per-scene URLs are the plumbing for a chapter jump; nothing is on it yet.
- **`scenePlayer.js` still models pause, seek and stepping** in both directions, none of which the transport offers any more. The steps themselves stay — they are what `sceneRests` checks against — but the vocabulary around them reads as support for something that was removed.
- **Scene 6's low-to-high density opening** is now partly redundant with Scene 4, which makes the density argument at a scale where positions are still countable. Worth deciding whether Scene 6 still needs its own ramp.
- **The modulo comparison is made once, in the sandbox.** It is the number the whole story is against, and the linear narrative states it in prose on the opening slide and never again. Scene 7's handover is where it would land hardest, and `moduloCost` already exists.
