# Consistent Hashing, explained

A guided story rather than a sandbox. A hash space is drawn as a number line and
bent into a ring; servers take positions on it by the same hash; a key routes to
the first server clockwise from it; one server fails and a neighbour inherits all
of its work; the same failure is shown again with ten positions per server, and
then at production density with a server joining.

It runs itself — each slide plays, a bar counts down, and it moves on. Touch
anything and it hands over: arrow keys, wheel, swipe, and per-scene step controls.

## How it is put together

|                   |                                                                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/story/`      | The domain. Hashing and ownership (`ringModel`, `ringDash`, `topology`), the projection a straight line and a ring share (`projection`), and how a scene is timed (`sceneSteps`, `useSceneTimeline`, `deckMachine`). No React components. |
| `src/components/` | The scenes, and the deck that runs them. `RingParts` holds the marks the ring scenes share.                                                                                                                                               |
| `src/stories/`    | Storybook, one file per scene, with every scene pinned at each of its beats.                                                                                                                                                              |

Two rules the whole thing rests on:

- **A scene is a pure function of one number.** Beats live in a motion value and
  never in React state, so stepping backwards runs a scene backwards and no scene
  stores a frame. `sceneRests.test.jsx` renders every scene either side of every
  step and requires the frames to be identical.
- **Discrete state is a chart, continuous state is not.** `deckMachine` owns which
  slide is showing and whether the viewer has taken over; it never sees a beat.

## Development

### Setup

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

## Linting and Formatting

This project uses ESLint and Prettier for code quality and consistent formatting.

### ESLint

ESLint is configured with the React plugin and includes the exhaustive-deps rule to ensure proper dependency arrays in React hooks.

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix
```

### Prettier

Prettier is used for consistent code formatting.

```bash
# Format files
npm run format

# Check if files are formatted correctly
npm run format:check
```

### Pre-commit Hooks

This project uses Husky and lint-staged to run linting and formatting checks before each commit.

### VS Code Integration

For VS Code users, the project includes recommended settings for automatic linting and formatting on save. Make sure you have the ESLint and Prettier extensions installed.

Required extensions:

- ESLint: dbaeumer.vscode-eslint
- Prettier: esbenp.prettier-vscode
