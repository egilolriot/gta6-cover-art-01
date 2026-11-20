// Draws the cover on a canvas: the layout's panels filled with the photos,
// the grade washed over the whole cover, and the caption lettering in the
// bottom band. Every number derives from the canvas size, so the same state
// renders identically at 1080 x 1080 and at 1920 x 1080.
import { captionBand, layoutPanels } from './layouts.js';
import { gradeById } from './grades.js';

/** The fallback panel setup when the state names no panel of its own. */
function panelSetup(state, index) {
  const saved = state.panels?.[index];
  return {
    slot: saved?.slot ?? index % Math.max(1, state.photos.length),
    zoom: saved?.zoom ?? 1,
    x: saved?.x ?? 0.5,
    y: saved?.y ?? 0.5,
  };
}

function roundedPath(ctx, rect, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
  } else {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
}

/** Draws one photo cover-fitting a panel, honouring zoom and focal point. */
function drawPhoto(ctx, photo, rect, zoom, fx, fy) {
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = rect.x + rect.w / 2 - fx * dw;
  let dy = rect.y + rect.h / 2 - fy * dh;
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  ctx.drawImage(photo, dx, dy, dw, dh);
}

/** Draws the placeholder a panel shows while its photo slot is empty. */
function drawEmptyPanel(ctx, rect, label) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  wash.addColorStop(0, '#2a1245');
  wash.addColorStop(1, '#7a1e5e');
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  const stripe = Math.max(18, rect.w * 0.06);
  for (let x = rect.x - rect.h; x < rect.x + rect.w; x += stripe * 2) {
    ctx.beginPath();
    ctx.moveTo(x, rect.y + rect.h);
    ctx.lineTo(x + rect.h, rect.y);
    ctx.lineTo(x + rect.h + stripe, rect.y);
    ctx.lineTo(x + stripe, rect.y + rect.h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const size = Math.max(18, Math.min(rect.w, rect.h) * 0.09);
  ctx.font = `800 ${size}px Archivo, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** Fits a one-line font size so `text` fits `maxWidth`, starting at `size`. */
function fitSize(ctx, text, maxWidth, size, family, weight) {
  let current = size;
  ctx.font = `${weight} ${current}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && current > 14) {
    current = Math.max(14, current * 0.92);
    ctx.font = `${weight} ${current}px ${family}`;
  }
  return current;
}

/** Draws the caption block: accent rule, kicker line, then the big title. */
function drawLettering(ctx, band, caption, sub, grade) {
  const text = (caption || '').trim().toUpperCase();
  const kicker = (sub || '').trim().toUpperCase();
  const pad = Math.round(band.h * 0.06);
  let cursor = band.y + band.h - pad;
  ctx.textBaseline = 'alphabetic';

  if (text) {
    let size = Math.round(band.h * 0.5);
    let lines = [text];
    size = fitSize(ctx, text, band.w, size, 'Anton, sans-serif', '');
    if (ctx.measureText(text).width > band.w) {
      const words = text.split(/\s+/);
      if (words.length > 1) {
        const mid = Math.ceil(words.length / 2);
        lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
        size = Math.round(band.h * 0.36);
        size = Math.min(
          fitSize(ctx, lines[0], band.w, size, 'Anton, sans-serif', ''),
          fitSize(ctx, lines[1], band.w, size, 'Anton, sans-serif', ''),
        );
      }
    }
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = 'rgba(10, 4, 18, 0.85)';
    ctx.fillStyle = grade.text;
    const lineHeight = size * 1.02;
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const baseline = cursor - (lines.length - 1 - i) * lineHeight;
      ctx.strokeText(lines[i], band.x, baseline);
      ctx.fillText(lines[i], band.x, baseline);
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    cursor -= lines.length * lineHeight + band.h * 0.1;
  }

  if (kicker) {
    const kickerSize = Math.max(14, Math.round(band.h * 0.15));
    ctx.font = `800 ${kickerSize}px Archivo, sans-serif`;
    try {
      ctx.letterSpacing = `${Math.round(kickerSize * 0.28)}px`;
    } catch {
      // Older canvas implementations ignore letter spacing; keep drawing.
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = grade.accent;
    ctx.fillText(kicker, band.x, cursor);
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // Ignore.
    }
    const ruleW = Math.round(band.w * 0.16);
    const ruleH = Math.max(3, Math.round(band.h * 0.03));
    ctx.fillStyle = grade.accent;
    ctx.fillRect(band.x, cursor - kickerSize - band.h * 0.09, ruleW, ruleH);
  }
}

/**
 * Draws the whole cover onto `canvas` from `state`:
 * `{ size: { w, h }, layout, grade, caption, sub, photos, panels }`.
 * The canvas is resized to the state's size first.
 */
export function drawCover(canvas, state) {
  const { w, h } = state.size;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const grade = gradeById(state.grade);
  const panels = layoutPanels(state.layout, w, h);
  const radius = Math.round(Math.min(w, h) * 0.008);

  ctx.fillStyle = '#14081f';
  ctx.fillRect(0, 0, w, h);

  panels.forEach((rect, index) => {
    const setup = panelSetup(state, index);
    const photo = state.photos[setup.slot] ?? null;
    ctx.save();
    roundedPath(ctx, rect, radius);
    ctx.clip();
    if (photo) {
      drawPhoto(ctx, photo, rect, setup.zoom, setup.x, setup.y);
    } else {
      drawEmptyPanel(ctx, rect, `PHOTO ${setup.slot + 1}`);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.003);
    roundedPath(ctx, rect, radius);
    ctx.stroke();
  });

  // The grade: a sky gradient over everything, then its tint.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(1, grade.skyBottom);
  ctx.save();
  ctx.globalAlpha = grade.skyAlpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = grade.tintAlpha;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Shade the foot so the lettering stays readable on any photo.
  const shade = ctx.createLinearGradient(0, h * 0.5, 0, h);
  shade.addColorStop(0, 'rgba(10, 4, 18, 0)');
  shade.addColorStop(1, 'rgba(10, 4, 18, 0.62)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);

  // Vignette: darken the corners a touch.
  const vignette = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vignette.addColorStop(0, 'rgba(10, 4, 18, 0)');
  vignette.addColorStop(1, 'rgba(10, 4, 18, 0.32)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  drawLettering(ctx, captionBand(w, h), state.caption, state.sub, grade);

  const tagSize = Math.max(11, Math.round(Math.min(w, h) * 0.014));
  ctx.font = `700 ${tagSize}px Archivo, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillText('VICE COVER STUDIO', w - Math.round(Math.min(w, h) * 0.03), h - Math.round(Math.min(w, h) * 0.025));
}
