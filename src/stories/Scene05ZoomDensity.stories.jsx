import { ZoomDensityScene } from '../components/ZoomDensityScene';
import { ZOOM_BEATS } from '../components/DensityZoom';

/**
 * Scene 5: the boundaries are real, and they are everywhere.
 *
 * The magnifier proves the smear is structure; the sweep proves it is structure
 * wherever you point it.
 */
const meta = {
  title: 'Hash Ring/Guided Story/Scene 05 Zoom Density',
  component: ZoomDensityScene,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    pinnedProgress: { control: { type: 'range', min: 0, max: ZOOM_BEATS.end, step: 0.05 } },
  },
};

export default meta;

export const Playing = { args: {} };
export const WholeRing = { args: { pinnedProgress: 0.6 } };
export const Bracketed = { args: { pinnedProgress: ZOOM_BEATS.magnify.from - 0.2 } };
export const Magnified = { args: { pinnedProgress: ZOOM_BEATS.pan.from - 0.4 } };
export const MidSweep = {
  args: { pinnedProgress: (ZOOM_BEATS.pan.from + ZOOM_BEATS.pan.to) / 2 },
};

/** The closing act: the rule from Scene 2, at nine hundred positions. */
export const KeyLanded = { args: { pinnedProgress: ZOOM_BEATS.land.to } };
export const Walking = {
  args: { pinnedProgress: (ZOOM_BEATS.route.from + ZOOM_BEATS.route.to) / 2 },
};
export const OwnerFound = { args: { pinnedProgress: ZOOM_BEATS.route.to + 0.6 } };
