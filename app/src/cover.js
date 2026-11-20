// Vice Cover Studio — the cover painter.
//
// drawCover paints the whole poster onto a canvas: the photos in their
// panels, the colour grade, the retro sun, the palm silhouettes, the
// halftone and grain, and the bold caption. Everything is plain Canvas 2D
// and offline — no image, font or library is fetched, every asset is a file
// under app/. The grain runs off a fixed seed, so the same state always
// paints the same pixels.

import { GRADES } from './grades.js';
import { LAYOUTS } from './layouts.js';

/** Deterministic pseudo-random stream, so the grain never changes. */
function seededStream(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** One palm silhouette: a bending trunk, seven drooping fronds, two nuts. */
function paintPalm(ctx, baseX, baseY, size, tilt, colour) {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(tilt);
  ctx.scale(size, size);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  // Trunk, tapering as it bends.
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.quadraticCurveTo(-4, -72, 20, -134);
  ctx.lineTo(29, -128);
  ctx.quadraticCurveTo(8, -68, 4, 0);
  ctx.closePath();
  ctx.fill();
  // Fronds arc out of the crown and droop toward their tips.
  const crownX = 26;
  const crownY = -132;
  const blades = [
    [-138, -40, -118, -118, -156, -46],
    [-120, -96, -96, -168, -108, -120],
    [-80, -132, -52, -198, -38, -160],
    [-22, -150, 2, -218, 32, -182],
    [36, -140, 76, -206, 110, -152],
    [88, -106, 138, -156, 160, -86],
    [114, -58, 164, -92, 170, -28],
  ];
  for (const [ax, ay, bx, by, ex, ey] of blades) {
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.bezierCurveTo(crownX + ax, crownY + ay, crownX + bx, crownY + by, crownX + ex, crownY + ey);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(crownX - 7, crownY + 9, 6, 0, Math.PI * 2);
  ctx.arc(crownX + 6, crownY + 11, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Fills the cover (or a vertical slice of it) with a gradient wash. */
function paintWash(ctx, width, height, stops, blend, fromY, toY) {
  const wash = ctx.createLinearGradient(0, fromY, 0, toY);
  stops.forEach((colour, index) => wash.addColorStop(index / (stops.length - 1), colour));
  ctx.save();
  ctx.globalCompositeOperation = blend;
  ctx.fillStyle = wash;
  ctx.fillRect(0, fromY, width, toY - fromY);
  ctx.restore();
}

/** The sun disc with horizontal slits, drawn on a scratch canvas first so
 *  the slits never erase the photo underneath. */
function paintSun(ctx, centreX, centreY, radius, colour) {
  const pad = Math.ceil(radius * 1.8);
  const scratch = document.createElement('canvas');
  scratch.width = pad * 2;
  scratch.height = pad * 2;
  const sctx = scratch.getContext('2d');
  sctx.fillStyle = colour;
  sctx.beginPath();
  sctx.arc(pad, pad, radius, 0, Math.PI * 2);
  sctx.fill();
  sctx.globalCompositeOperation = 'destination-out';
  const slits = [0.1, 0.32, 0.56];
  slits.forEach((fraction, i) => {
    const slitHeight = Math.max(2, radius * (0.08 + i * 0.05));
    sctx.fillRect(pad - radius, pad + radius * fraction, radius * 2, slitHeight);
  });
  const halo = ctx.createRadialGradient(centreX, centreY, radius * 0.1, centreX, centreY, radius * 1.6);
  halo.addColorStop(0, colour);
  halo.addColorStop(0.5, `${colour}44`);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = halo;
  ctx.fillRect(centreX - radius * 1.7, centreY - radius * 1.7, radius * 3.4, radius * 3.4);
  ctx.drawImage(scratch, centreX - pad, centreY - pad);
  ctx.restore();
}

/** Greedy title wrap: as many words per line as fit, at most two lines. */
function fitTitleLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [words[0]];
  for (const word of words.slice(1)) {
    const candidate = `${lines[lines.length - 1]} ${word}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      lines[lines.length - 1] = candidate;
    } else {
      lines.push(word);
    }
  }
  return lines.length > 2 ? [lines[0], lines.slice(1).join(' ')] : lines;
}

/**
 * Paints the cover. `state` carries:
 *   w, h: export size in pixels; layout, grade: keys of LAYOUTS / GRADES
 *   title, subtitle: the caption lines; titleColour: the title fill
 *   titleSize: 0.7..1.4, a multiplier on the fitted title size
 *   effects: { sun, palms, halftone, grain, vignette }
 *   photos: image elements (or null); panels: one { photo, zoom, dx, dy }
 *   entry per layout panel, dx/dy in fractions of the panel size.
 */
export function drawCover(canvas, state) {
  const { w, h } = state;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.hero;
  const scale = w / 1080; // strokes, gaps and type all scale with the width
  const frame = Math.max(6, Math.round(w * 0.011));
  const gutter = Math.max(4, Math.round(w * 0.006));
  const random = seededStream(20261120);

  ctx.save();
  ctx.fillStyle = '#0d0714';
  ctx.fillRect(0, 0, w, h);

  // --- Photos, each cropped by its own zoom and pan inside its panel. ---
  const rects = layout.panels(w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: 0, zoom: 1, dx: 0, dy: 0 };
    const leftPad = rect.x === 0 ? frame : gutter / 2;
    const rightPad = rect.x + rect.w >= w ? frame : gutter / 2;
    const topPad = rect.y === 0 ? frame : gutter / 2;
    const bottomPad = rect.y + rect.h >= h ? frame : gutter / 2;
    const inset = {
      x: rect.x + leftPad,
      y: rect.y + topPad,
      w: rect.w - leftPad - rightPad,
      h: rect.h - topPad - bottomPad,
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(inset.x, inset.y, inset.w, inset.h);
    ctx.clip();
    const entry = state.photos[panel.photo] ?? null;
    const photo = entry && entry.img ? entry.img : null;
    if (photo) {
      const cover = Math.max(inset.w / photo.naturalWidth, inset.h / photo.naturalHeight);
      const zoom = cover * (panel.zoom || 1);
      const drawnW = photo.naturalWidth * zoom;
      const drawnH = photo.naturalHeight * zoom;
      const centreX = inset.x + inset.w / 2 + (panel.dx || 0) * inset.w;
      const centreY = inset.y + inset.h / 2 + (panel.dy || 0) * inset.h;
      ctx.filter = grade.photo;
      ctx.drawImage(photo, centreX - drawnW / 2, centreY - drawnH / 2, drawnW, drawnH);
      ctx.filter = 'none';
    } else {
      // No photo yet: a dusk gradient and a quiet invitation, never blank.
      const empty = ctx.createLinearGradient(inset.x, inset.y, inset.x + inset.w, inset.y + inset.h);
      empty.addColorStop(0, '#3b1d5e');
      empty.addColorStop(0.55, '#c2437a');
      empty.addColorStop(1, '#ff8a3d');
      ctx.fillStyle = empty;
      ctx.fillRect(inset.x, inset.y, inset.w, inset.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = `700 ${Math.round(22 * scale)}px Archivo, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', inset.x + inset.w / 2, inset.y + inset.h / 2);
    }
    ctx.restore();
  });

  // --- Grade: warm wash, low dusk, then the sun in the top-right corner. ---
  paintWash(ctx, w, h, grade.wash, 'overlay', h * 0.08, h);
  paintWash(ctx, w, h, grade.dusk, 'multiply', h * 0.3, h);
  if (state.effects.sun && grade.sun) {
    paintSun(ctx, w * 0.9, h * 0.1, h * 0.052, grade.sun);
  }

  // --- Palm silhouettes along the foot, behind the caption. ---
  if (state.effects.palms) {
    const palm = 'rgba(16, 6, 24, 0.88)';
    paintPalm(ctx, w * 0.02, h * 0.99, 0.72 * scale, -0.08, palm);
    paintPalm(ctx, w * 0.995, h, 0.6 * scale, 0.14, palm);
  }

  // --- Halftone dots across the lower third, like a printed poster. ---
  if (state.effects.halftone) {
    const top = h * 0.62;
    const step = Math.max(9, Math.round(15 * scale));
    ctx.save();
    ctx.fillStyle = 'rgba(10, 4, 18, 0.16)';
    let row = 0;
    for (let y = top; y < h; y += step, row += 1) {
      const offset = (row % 2) * step * 0.5;
      // The dots swell toward the foot of the poster, like print ink.
      const depth = (y - top) / Math.max(1, h - top);
      const radius = Math.max(1.2, 2.1 * scale * (0.7 + depth * 0.8));
      for (let x = offset; x < w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- Caption scrim, then the lettering. ---
  const band = layout.band(w, h);
  const scrim = ctx.createLinearGradient(0, band.y - h * 0.06, 0, h);
  scrim.addColorStop(0, `rgba(${grade.scrim}, 0)`);
  scrim.addColorStop(0.45, `rgba(${grade.scrim}, 0.55)`);
  scrim.addColorStop(1, `rgba(${grade.scrim}, 0.88)`);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, band.y - h * 0.06, w, h - band.y + h * 0.06);

  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const centreX = w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (subtitle) {
    const subSize = Math.max(13, Math.round(h * 0.028));
    ctx.font = `900 ${subSize}px Archivo, sans-serif`;
    try {
      ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`;
    } catch {
      // letterSpacing is Chrome-only; the spacing is a bonus, not a need.
    }
    ctx.fillStyle = grade.accent;
    ctx.fillText(subtitle, centreX, band.y + subSize * 1.5);
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // See above.
    }
  }
  if (title) {
    const maxWidth = w * 0.9;
    let size = Math.round(h * 0.115 * (state.titleSize || 1));
    ctx.font = `${size}px Anton, sans-serif`;
    while (size > 16 && ctx.measureText(title).width > maxWidth) {
      size -= 2;
      ctx.font = `${size}px Anton, sans-serif`;
    }
    let lines = fitTitleLines(ctx, title, maxWidth);
    if (lines.length === 2) {
      size = Math.round(size * 0.82);
      ctx.font = `${size}px Anton, sans-serif`;
      lines = fitTitleLines(ctx, title, maxWidth);
    }
    const lineHeight = size * 1.02;
    const blockHeight = lineHeight * lines.length;
    let y = band.y + (band.h - blockHeight) / 2 + size * 0.78 + (subtitle ? size * 0.28 : 0);
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    for (const line of lines) {
      ctx.font = `${size}px Anton, sans-serif`;
      ctx.lineWidth = Math.max(3, size * 0.16);
      ctx.strokeStyle = '#12081c';
      ctx.shadowColor = grade.accent;
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = Math.round(size * 0.05);
      ctx.shadowOffsetY = Math.round(size * 0.05);
      ctx.strokeText(line, centreX, y);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = state.titleColour || '#ffffff';
      ctx.fillText(line, centreX, y);
      y += lineHeight;
    }
    // Accent rule under the title.
    const ruleWidth = Math.min(w * 0.3, ctx.measureText(lines[0]).width * 0.5);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(centreX - ruleWidth / 2, y - lineHeight * 0.28, ruleWidth, Math.max(3, 5 * scale));
  }

  // --- Vignette and grain last, so they sit over everything. ---
  if (state.effects.vignette) {
    const vignette = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(8, 2, 14, 0.42)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.effects.grain) {
    const specks = Math.round((w * h) / 1100);
    ctx.save();
    for (let i = 0; i < specks; i += 1) {
      const gx = random() * w;
      const gy = random() * h;
      ctx.fillStyle = random() > 0.5 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
      ctx.fillRect(gx, gy, 1.4 * scale, 1.4 * scale);
    }
    ctx.restore();
  }
  ctx.restore();
}
