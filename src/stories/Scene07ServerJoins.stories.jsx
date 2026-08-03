import { ServerJoinsScene } from '../components/FullScaleScene';
import { LANE_BEATS, handoverPhasesOf } from '../components/FullScaleLanes';

/** Mid-flight of one handover, derived rather than pinned: the timings move. */
const midFlight = index => {
  const { flightFrom, flightTo } = handoverPhasesOf(LANE_BEATS, index);
  return (flightFrom + flightTo) / 2;
};

/**
 * Scene 7: the payoff, measured. A seventh server joins, each server hands over in
 * turn, the lanes fold back into one ring, and what the newcomer took is picked
 * out on it.
 *
 * It opens on lanes already separated, because Scene 6 is the slide before it and
 * replaying that movement costs half a minute to show something just watched.
 */
const meta = {
  title: 'Hash Ring/Guided Story/Scene 07 Server Joins',
  component: ServerJoinsScene,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    pinnedProgress: {
      description: 'Pins the scene to a moment on its timeline, in beats.',
      control: { type: 'range', min: 0, max: LANE_BEATS.end, step: 0.05 },
    },
    vnodesPerServer: { control: { type: 'range', min: 1, max: 800, step: 1 } },
    serverCount: { control: { type: 'range', min: 2, max: 6, step: 1 } },
  },
  args: { serverCount: 6, vnodesPerServer: 150 },
};

export default meta;

export const Joining = {
  args: {},
};

export const LanesAtRest = {
  args: { pinnedProgress: LANE_BEATS.settled },
};

export const NewLane = {
  args: { pinnedProgress: LANE_BEATS.join.to },
};

/**
 * The one handover played slowly enough to be read: the lane lit, its ranges in
 * flight. The other five run at a third of this length — see `HandoverInProgress`.
 */
export const FirstHandover = {
  args: { pinnedProgress: midFlight(0) },
};

/** Part-way through the sequence: some have handed over, some have not. */
export const HandoverInProgress = {
  args: { pinnedProgress: midFlight(3) },
};

export const HandoverComplete = {
  args: { pinnedProgress: LANE_BEATS.handover.to },
};

/** Everything the newcomer owns, alone, before the others come back up. */
export const NewcomerAlone = {
  args: { pinnedProgress: LANE_BEATS.newcomer.to },
};

export const LanesAssembled = {
  args: { pinnedProgress: LANE_BEATS.assembled },
};

/** Lanes folding back in from the inside, the ring refilling as each rejoins. */
export const FoldingBackIn = {
  args: {
    pinnedProgress: LANE_BEATS.merge.from + (LANE_BEATS.merge.to - LANE_BEATS.merge.from) / 2,
  },
};

export const RingRestored = {
  args: { pinnedProgress: LANE_BEATS.merge.to },
};

export const NewServerHighlighted = {
  args: { pinnedProgress: LANE_BEATS.end },
};
