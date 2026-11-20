// Draws the cover onto a canvas: the photos in their panels, the colour grade,
// the sun, the palm silhouettes, the halftone and grain, and the bold caption.
// Everything here is plain Canvas 2D, deterministic (a fixed seed drives the
// grain, so two runs of the same state paint the same bytes) and offline: no
// image, font or library is fetched, every asset is a file under app/.
import { GRADES } from './grades.js';
import { LAYOUTS } from './layouts.js';

/** A small seeded generator, so the grain and the halftone never change. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Paints one palm silhouette: a curved, tapering trunk and six long fronds
 *  that arc out of the crown and droop at the tip. Thin strokes and a small
 *  scale keep it a frame at the corner, never a blot over a face. */
function drawPalm(ctx, x, y, s, lean, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.scale(s, s);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  // Trunk: a filled taper that bends right as it rises.
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.quadraticCurveTo(-2, -70, 22, -132);
  ctx.lineTo(30, -126);
  ctx.quadraticCurveTo(10, -66, 5, 0);
  ctx.closePath();
  ctx.fill();
  // Fronds: long blades out of the crown, each drooping toward its tip.
  const crown = [28, -130];
  const fronds = [
    [-150, -52, -128, -128, -168, -58],
    [-132, -104, -104, -178, -118, -128],
    [-88, -138, -58, -206, -44, -168],
    [-26, -156, -2, -224, 30, -188],
    [34, -146, 74, -212, 108, -158],
    [86, -112, 136, -162, 158, -92],
    [112, -66, 162, -100, 168, -34],
  ];
  for (const [c1x, c1y, c2x, c2y, ex, ey] of fronds) {
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(crown[0], crown[1]);
    ctx.bezierCurveTo(crown[0] + c1x, crown[1] + c1y, crown[0] + c2x, crown[1] + c2y, crown[0] + ex, crown[1] + ey);
    ctx.stroke();
  }
  // Coconuts under the crown.
  ctx.beginPath();
  ctx.arc(crown[0] - 6, crown[1] + 10, 6, 0, Math.PI * 2);
  ctx.arc(crown[0] + 7, crown[1] + 12, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Fills a rectangle with a vertical gradient from the grade's colour stops. */
function verticalWash(ctx, w, h, stops, mode, top = 0, bottom = h) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  const n = stops.length - 1;
  stops.forEach((colour, i) => g.addColorStop(i / n, colour));
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, bottom - top);
  ctx.restore();
}

/** Splits a title into at most two lines that each fit `maxWidth` at `size`. */
function wrapTitle(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = words[0];
  for (const word of words.slice(1)) {
    const trial = `${line} ${word}`;
    if (ctx.measureText(trial).width <= maxWidth) {
      line = trial;
    } else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  if (lines.length <= 2) return lines;
  // Three or more lines: keep the first, pack the rest into the second.
  return [lines[0], lines.slice(1).join(' ')];
}

/**
 * Draws the cover. `state` holds:
 *   w, h: export size in pixels; layout, grade: keys of LAYOUTS / GRADES
 *   title, subtitle: the caption lines; titleColour: fill of the title
 *   titleSize: 0.7..1.4, a multiplier on the fitted size
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
  const scale = w / 1080; // every stroke and gap scales with the cover width
  const frame = Math.max(6, Math.round(w * 0.011));
  const gutter = Math.max(4, Math.round(w * 0.006));
  const rng = mulberry32(20261120);

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0d0714';
  ctx.fillRect(0, 0, w, h);

  // --- Photos in their panels, each cropped by its own zoom and pan. ---
  const panels = layout.panels(w, h);
  panels.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: 0, zoom: 1, dx: 0, dy: 0 };
    const inset = {
      x: rect.x + (rect.x === 0 ? frame : gutter / 2),
      y: rect.y + (rect.y === 0 ? frame : gutter / 2),
      w: rect.w - (rect.x === 0 ? frame : gutter / 2) - (rect.x + rect.w >= w ? frame : gutter / 2),
      h: rect.h - (rect.y === 0 ? frame : gutter / 2) - (rect.y + rect.h >= h ? frame : gutter / 2),
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(inset.x, inset.y, inset.w, inset.h);
    ctx.clip();
    const entry = state.photos[panel.photo] ?? null;
    const photo = entry && entry.img ? entry.img : null;
    if (photo) {
      const base = Math.max(inset.w / photo.naturalWidth, inset.h / photo.naturalHeight);
      const zoom = base * (panel.zoom || 1);
      const pw = photo.naturalWidth * zoom;
      const ph = photo.naturalHeight * zoom;
      const cx = inset.x + inset.w / 2 + (panel.dx || 0) * inset.w;
      const cy = inset.y + inset.h / 2 + (panel.dy || 0) * inset.h;
      ctx.filter = grade.photo;
      ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
      ctx.filter = 'none';
    } else {
      // No photo yet: a dusk gradient and a quiet invitation, never blank.
      const g = ctx.createLinearGradient(inset.x, inset.y, inset.x + inset.w, inset.y + inset.h);
      g.addColorStop(0, '#3b1d5e');
      g.addColorStop(0.55, '#c2437a');
      g.addColorStop(1, '#ff8a3d');
      ctx.fillStyle = g;
      ctx.fillRect(inset.x, inset.y, inset.w, inset.h);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `700 ${Math.round(22 * scale)}px Archivo, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', inset.x + inset.w / 2, inset.y + inset.h / 2);
    }
    ctx.restore();
  });

  // --- Grade: warm wash, low dusk, then the sun disc. ---
  verticalWash(ctx, w, h, grade.wash, 'overlay', h * 0.08, h);
  verticalWash(ctx, w, h, grade.dusk, 'multiply', h * 0.3, h);
  if (state.effects.sun && grade.sun) {
    // A small retro sun with slits, tucked in the top-right corner so it
    // never sits on a face: a graphic, not a disc pasted over the photo. The
    // slits are cut on a scratch canvas, so they never erase the photo.
    const sx = w * 0.9;
    const sy = h * 0.1;
    const sr = h * 0.052;
    const sunCanvas = document.createElement('canvas');
    const pad = Math.ceil(sr * 1.7);
    sunCanvas.width = pad * 2;
    sunCanvas.height = pad * 2;
    const sctx = sunCanvas.getContext('2d');
    sctx.fillStyle = grade.sun;
    sctx.beginPath();
    sctx.arc(pad, pad, sr, 0, Math.PI * 2);
    sctx.fill();
    sctx.globalCompositeOperation = 'destination-out';
    [0.08, 0.3, 0.55].forEach((f, i) => {
      const slitH = Math.max(2, sr * 0.09 + i * sr * 0.05);
      sctx.fillRect(pad - sr, pad + sr * f, sr * 2, slitH);
    });
    const glow = ctx.createRadialGradient(sx, sy, sr * 0.1, sx, sy, sr * 1.5);
    glow.addColorStop(0, grade.sun);
    glow.addColorStop(0.5, grade.sun + '44');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = glow;
    ctx.fillRect(sx - sr * 1.6, sy - sr * 1.6, sr * 3.2, sr * 3.2);
    ctx.drawImage(sunCanvas, sx - pad, sy - pad);
    ctx.restore();
  }

  // --- Palm silhouettes along the foot, behind the caption. ---
  if (state.effects.palms) {
    const palmColour = 'rgba(16, 6, 24, 0.88)';
    drawPalm(ctx, w * 0.02, h * 0.99, 0.72 * scale, -0.08, palmColour);
    drawPalm(ctx, w * 0.995, h * 1.0, 0.6 * scale, 0.14, palmColour);
  }

  // --- Halftone dots across the lower third, like a printed poster. ---
  if (state.effects.halftone) {
    const top = h * 0.62;
    const step = Math.max(9, Math.round(15 * scale));
    ctx.save();
    ctx.fillStyle = 'rgba(10, 4, 18, 0.16)';
    for (let y = top; y < h; y += step) {
      const row = Math.round((y - top) / step);
      for (let x = (row % 2) * step * 0.5; x < w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.2, 2.1 * scale), 0, Math.PI * 2);
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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const cx = w / 2;
  if (subtitle) {
    const subSize = Math.max(13, Math.round(h * 0.028));
    ctx.font = `900 ${subSize}px Archivo, sans-serif`;
    try {
      ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`;
    } catch {
      /* letterSpacing is Chrome-only; the spacing is a bonus, not a need. */
    }
    ctx.fillStyle = grade.accent;
    ctx.fillText(subtitle, cx, band.y + subSize * 1.5);
    try {
      ctx.letterSpacing = '0px';
    } catch {
      /* See above. */
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
    const lines = wrapTitle(ctx, title, maxWidth);
    if (lines.length === 2) {
      size = Math.round(size * 0.82);
      ctx.font = `${size}px Anton, sans-serif`;
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
      ctx.strokeText(line, cx, y);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = state.titleColour || '#ffffff';
      ctx.fillText(line, cx, y);
      y += lineHeight;
    }
    // Accent rule under the title.
    const ruleW = Math.min(w * 0.3, ctx.measureText(lines[0]).width * 0.5);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(cx - ruleW / 2, y - lineHeight * 0.28, ruleW, Math.max(3, 5 * scale));
  }

  // --- Vignette and grain, last, so they sit over everything. ---
  if (state.effects.vignette) {
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(8,2,14,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.effects.grain) {
    const count = Math.round((w * h) / 1100);
    ctx.save();
    for (let i = 0; i < count; i++) {
      const gx = rng() * w;
      const gy = rng() * h;
      ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(gx, gy, 1.4 * scale, 1.4 * scale);
    }
    ctx.restore();
  }
  ctx.restore();
}
