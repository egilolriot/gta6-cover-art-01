// Panel layouts for the cover. Every layout is a function of the cover size in
// pixels and returns the panels that photos fill, each a rectangle in pixels,
// plus the band the caption sits in. Panels are drawn first; the caption is
// drawn over them on a scrim, so a layout never hides the lettering.
export const LAYOUTS = {
  hero: {
    label: 'Hero',
    hint: 'One photo, full bleed, big caption',
    panels(w, h) {
      return [{ x: 0, y: 0, w, h }];
    },
    band(w, h) {
      return { x: 0, y: h * 0.66, w, h: h * 0.34 };
    },
  },
  strip: {
    label: 'Sunset Strip',
    hint: 'Wide hero on top, two panels below',
    panels(w, h) {
      const top = Math.round(h * 0.6);
      return [
        { x: 0, y: 0, w, h: top },
        { x: 0, y: top, w: Math.round(w / 2), h: h - top },
        { x: Math.round(w / 2), y: top, w: w - Math.round(w / 2), h: h - top },
      ];
    },
    band(w, h) {
      return { x: 0, y: h * 0.74, w, h: h * 0.26 };
    },
  },
  grid: {
    label: 'Vice Grid',
    hint: 'Four panels, two by two',
    panels(w, h) {
      const hw = Math.round(w / 2);
      const hh = Math.round(h / 2);
      return [
        { x: 0, y: 0, w: hw, h: hh },
        { x: hw, y: 0, w: w - hw, h: hh },
        { x: 0, y: hh, w: hw, h: h - hh },
        { x: hw, y: hh, w: w - hw, h: h - hh },
      ];
    },
    band(w, h) {
      return { x: 0, y: h * 0.76, w, h: h * 0.24 };
    },
  },
  trio: {
    label: 'Boulevard Trio',
    hint: 'Three tall panels side by side',
    panels(w, h) {
      const tw = Math.round(w / 3);
      return [
        { x: 0, y: 0, w: tw, h },
        { x: tw, y: 0, w: tw, h },
        { x: 2 * tw, y: 0, w: w - 2 * tw, h },
      ];
    },
    band(w, h) {
      return { x: 0, y: h * 0.72, w, h: h * 0.28 };
    },
  },
};

/** The export sizes the app offers, in pixels. */
export const SIZES = {
  square: { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};
