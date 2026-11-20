// Vice Cover Studio — panel layouts and export sizes.
//
// A layout is a pair of functions of the cover size in pixels: `panels`
// returns the rectangles the photos fill, `band` the strip the caption sits
// in. Panels are painted first and the caption is painted over them on a
// scrim, so no layout ever hides the lettering. Fractions keep every layout
// working at all three export sizes.

function full(w, h) {
  return [{ x: 0, y: 0, w, h }];
}

function splitVertical(w, h, topFraction) {
  const top = Math.round(h * topFraction);
  const half = Math.round(w / 2);
  return [
    { x: 0, y: 0, w, h: top },
    { x: 0, y: top, w: half, h: h - top },
    { x: half, y: top, w: w - half, h: h - top },
  ];
}

function quarters(w, h) {
  const halfW = Math.round(w / 2);
  const halfH = Math.round(h / 2);
  return [
    { x: 0, y: 0, w: halfW, h: halfH },
    { x: halfW, y: 0, w: w - halfW, h: halfH },
    { x: 0, y: halfH, w: halfW, h: h - halfH },
    { x: halfW, y: halfH, w: w - halfW, h: h - halfH },
  ];
}

function columns(w, h, count) {
  const one = Math.round(w / count);
  const rects = [];
  for (let i = 0; i < count; i += 1) {
    rects.push({ x: i * one, y: 0, w: i === count - 1 ? w - i * one : one, h });
  }
  return rects;
}

function captionBand(w, h, topFraction) {
  return { x: 0, y: h * topFraction, w, h: h * (1 - topFraction) };
}

export const LAYOUTS = {
  hero: {
    label: 'Hero',
    hint: 'One photo, full bleed, big caption',
    panels: full,
    band(w, h) {
      return captionBand(w, h, 0.64);
    },
  },
  strip: {
    label: 'Sunset Strip',
    hint: 'Wide hero on top, two panels below',
    panels(w, h) {
      return splitVertical(w, h, 0.6);
    },
    band(w, h) {
      return captionBand(w, h, 0.72);
    },
  },
  grid: {
    label: 'Vice Grid',
    hint: 'Four panels, two by two',
    panels: quarters,
    band(w, h) {
      return captionBand(w, h, 0.74);
    },
  },
  trio: {
    label: 'Boulevard Trio',
    hint: 'Three tall panels side by side',
    panels(w, h) {
      return columns(w, h, 3);
    },
    band(w, h) {
      return captionBand(w, h, 0.7);
    },
  },
};

/** The export sizes the app offers, in pixels. */
export const SIZES = {
  square: { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};
