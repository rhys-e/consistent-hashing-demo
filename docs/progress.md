# Hash Ring Visual Redesign — Progress

Status against [`hash-ring-visual-design-plan.md`](./hash-ring-visual-design-plan.md), as of 2026-07-29.

**Verdict:** The opening scenes now share one drawing layer, so Scene 1 provably opens on the frame Scene 0 closes on. Both Scene 6 candidates are built and comparable in Storybook, which was the plan's highest-risk unknown; the treatment decision is now a judgement call rather than a guess.

## Scenes

| Scene                | Plan status                    | Notes                                                                                                                                            |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0 Hash Space**     | Mostly done                    | Rail draw-on, beam, hash decode, key settle. Draws through the shared `HashSpaceLayers` at bend 0. Missing: Next advance, hover-to-replay a key. |
| **1 Wrap Into Ring** | Mostly done                    | Parametric morph, seam pulse, polar grid resolving in, Replay. Opens on Scene 0's closing frame — asserted, not eyeballed.                       |
| **2 Lookup**         | Not started                    |                                                                                                                                                  |
| **3 Server leaves**  | Model done, scene not started  | `remapDelta` asserts the single-neighbour spike; nothing drawn yet.                                                                              |
| **4 Virtual nodes**  | Not started                    | 6A reads well at 3 vnodes per server, so it may serve this scene too.                                                                            |
| **5 Zoom density**   | Not started                    | Optional for the first pass.                                                                                                                     |
| **6 Full-scale**     | **Both candidates prototyped** | 6A lanes and 6C strip, same model and same load panel, at 3 / 150 / 500 vnodes per server. Awaiting a decision.                                  |
| **7 Remap at scale** | Highlight prototyped on both   | Each treatment carries the joining-server highlight; the metric comes from `remapDelta`, not from a caption.                                     |
| **8 Sandbox**        | Not started                    | Existing freeform app still the live demo.                                                                                                       |

## Technical approach

| Item                                    | Status                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Stay on SVG                             | On track — 3,500 vnodes draws as one path per server                                        |
| Parametric projection                   | Done — `src/story/projection.js`, plus `ringPoint`/`ringArcPath` for the closed-ring scenes |
| Motion tween layer                      | Done — `useSceneTimeline` + Motion, out-of-render attribute updates                         |
| Shared stage scale                      | Done — `STAGE` carries geometry _and_ text offsets                                          |
| Hash decode / easing / sample keys      | Done                                                                                        |
| Story machine (xstate scenes)           | Not started — scenes are still standalone stories                                           |
| `ringModel` (owners, load, remap delta) | Done — `src/story/ringModel.js`, 14 tests                                                   |
| Layered SVG stage (shared layers)       | Done for the hash space — `HashSpaceLayers` draws Scenes 0 and 1                            |
| `d3` → `d3-shape` cleanup               | Not done                                                                                    |
| Navigation / URL / skip-to-sandbox      | Not started                                                                                 |

## PoC plan (risk order) vs what we did

Plan order: **6A/6C → 7 → 3 → 1 → rest**.

Steps **1, 2 and 4 are now done**; step 3 (Scene 3's removal) is asserted in the model but not drawn.

Against the success criteria:

- _The full-scale view reads as summarised, not literal_ — met by 6A. Each lane is one server's own ranges, so no slice of the ring is ever coloured as though one server owned it.
- _Adding a server visibly moves only a small fraction_ — met by both, and the fraction is computed rather than asserted (13.2% for a seventh server at 150 vnodes each).
- _The ring reads as a wrapped number range_ — met by Scene 1.
- _Metrics corroborate what was just seen_ — the share panel's even-share mark does this; the bars are read against it rather than against each other.
- _Removing a server without vnodes overloads one neighbour_ — asserted in `ringModel`, not yet drawn.

### On the two treatments

Both are honest. The difference is what they make easy:

- **6A lanes** shows balance without reading the panel, because ink per lane is share, and it degrades gracefully — at 3 vnodes per server the imbalance is obvious in the same picture. It keeps the ring, which Scene 7 needs.
- **6C strip** gives every range the same width budget and echoes Scene 0, but at 900+ ranges the stripes read as coloured noise, and judging balance means reading the numbers. Its ring is decorative.

The remap highlight is where they separate most. In 6A the stolen slivers sit in the joining server's own lane and on a highlight ring, both at true angular width. In 6C the honest widths are sub-pixel, so a separate marker rail above the strip carries "where" while the strip keeps "how much" — the first attempt, padding each sliver to 1.5px, painted a third of the strip to state a claim of an eighth.

Recommendation: **6A**, with the strip kept for Scene 5's zoom rather than as the full-scale view.

## Open questions

- Which Scene 6 treatment survives — now a decision to make in Storybook rather than an unknown.
- Is a naive-modulo comparison mode worth including?
- Should sample request traffic run continuously in sandbox, or only on demand?
- Is the existing app sandbox-only, or kept as a parallel entry?

## Recommended next move

Pick the Scene 6 treatment, then build **Scene 3** — the one remaining PoC step, and the scene that has to make virtual nodes feel necessary. After that the story needs its spine: the xstate scene machine and navigation, since eight standalone stories are not a demo.
