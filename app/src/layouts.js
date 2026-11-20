// The four panel layouts of a cover. A layout is a list of panel rectangles
// in cover pixels, plus the band the caption sits in. Every rectangle is
// axis-aligned; the gap between panels scales with the cover size so a
// 1080-wide export and a 1920-wide one keep the same look.

/**
 * A panel rectangle inside the cover.
 * @typedef {{ x: number, y: number, w: number, h: number }} PanelRect
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   blurb: string,
 *   panels: (w: number, h: number) => PanelRect[],
 * }} CoverLayout
 */

function gapFor(w, h) {
  return Math.round(Math.min(w, h) * 0.012);
}

/** @type {CoverLayout[]} */
export const LAYOUTS = [
  {
    id: 'hero',
    name: 'Hero',
    blurb: 'One photo, full bleed',
    panels(w, h) {
      return [{ x: 0, y: 0, w, h }];
    },
  },
  {
    id: 'duo',
    name: 'Duo',
    blurb: 'Two photos side by side',
    panels(w, h) {
      const g = gapFor(w, h);
      const half = (w - g) / 2;
      return [
        { x: 0, y: 0, w: half, h },
        { x: half + g, y: 0, w: half, h },
      ];
    },
  },
  {
    id: 'trio',
    name: 'Trio',
    blurb: 'One wide photo, two stacked',
    panels(w, h) {
      const g = gapFor(w, h);
      const left = Math.round(w * 0.6 - g / 2);
      const right = w - left - g;
      const half = (h - g) / 2;
      return [
        { x: 0, y: 0, w: left, h },
        { x: left + g, y: 0, w: right, h: half },
        { x: left + g, y: half + g, w: right, h: half },
      ];
    },
  },
  {
    id: 'quad',
    name: 'Quad',
    blurb: 'Four photos in a grid',
    panels(w, h) {
      const g = gapFor(w, h);
      const halfW = (w - g) / 2;
      const halfH = (h - g) / 2;
      return [
        { x: 0, y: 0, w: halfW, h: halfH },
        { x: halfW + g, y: 0, w: halfW, h: halfH },
        { x: 0, y: halfH + g, w: halfW, h: halfH },
        { x: halfW + g, y: halfH + g, w: halfW, h: halfH },
      ];
    },
  },
];

/** Finds a layout by id, falling back to the first one. */
export function layoutById(id) {
  return LAYOUTS.find((entry) => entry.id === id) ?? LAYOUTS[0];
}

/** Returns the panel rectangles of a layout at a cover size. */
export function layoutPanels(id, w, h) {
  return layoutById(id).panels(w, h);
}

/** How many photo panels a layout has. */
export function layoutPanelCount(id) {
  return layoutById(id).panels(100, 100).length;
}

/**
 * The caption band: the rectangle the title and kicker are drawn in,
 * anchored to the bottom of the cover with a margin that scales.
 */
export function captionBand(w, h) {
  const margin = Math.round(Math.min(w, h) * 0.045);
  const bandH = Math.round(h * 0.24);
  return { x: margin, y: h - bandH - margin, w: w - margin * 2, h: bandH };
}
