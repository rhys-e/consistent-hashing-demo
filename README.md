# Consistent Hashing, explained

A guided story of how a consistent hash ring assigns work. A hash space is drawn
as a number line and bent into a ring. Keys and servers take positions on it from
their names. A key belongs to the first server clockwise. One server fails and a
neighbour inherits its range. The same failure is shown again with many positions
per server, then at production density as a new server joins. The last ring lets
you change the counts yourself.

It runs itself. Each slide plays, a bar counts down, and it moves on. Touch
anything and it hands over: arrow keys, wheel, swipe, and per-scene step
controls.

## Commands

```bash
npm install
npm run dev
```

```bash
npm test
npm run lint
npm run format
```

```bash
npm run build
npm run preview
npm run storybook
```

`npm run dev:cyber` and `npm run dev:holographic` start the same story with a
different theme. Matching `build:*` scripts produce those builds.
