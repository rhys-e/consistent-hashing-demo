export const angleScale = position => {
  // Scale linearly from [0,1] to [0, 2π]
  return position * 2 * Math.PI;
};

export const positionToArcAngle = position => {
  // This shifts the 0 position from 3 o'clock to 12 o'clock
  return angleScale(position) - Math.PI / 2;
};

export const toXY = (pos, SVG_WIDTH, SVG_HEIGHT, SVG_RADIUS) => {
  const angle = positionToArcAngle(pos);
  return [
    SVG_WIDTH / 2 + SVG_RADIUS * Math.cos(angle),
    SVG_HEIGHT / 2 + SVG_RADIUS * Math.sin(angle),
  ];
};
