// Vice Cover Studio — fixed scenes for screenshots.
//
// `?shot=editor` shows the app with a sample photo loaded; `?shot=cover`
// shows the exported cover alone, full screen. Every scene is driven by
// query parameters, so a screenshot is reproducible:
//   ?shot=cover&photos=boulevard,pier&layout=strip&grade=sunset
//     &caption=SUNSET%20HEIST&subtitle=OCEAN%20DRIVE&size=wide
// `photos` names samples under samples/ (comma-separated, one per panel in
// order); `size` is a key of SIZES; `sun`, `palms`, `halftone`, `grain` and
// `vignette` are 0 or 1; `colour` is a CSS colour for the title.
// window.__shotReady is set once the scene has painted.

import { SIZES } from './layouts.js';

const EFFECT_INPUTS = { sun: 'fx-sun', palms: 'fx-palms', halftone: 'fx-halftone', grain: 'fx-grain', vignette: 'fx-vignette' };

/** Reads a 0/1 effect flag, falling back when the query leaves it out. */
function effectFlag(query, name, fallback) {
  const raw = query.get(name);
  if (raw === null) return fallback;
  return raw !== '0' && raw.toLowerCase() !== 'false';
}

function clampNumber(value, low, high, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(low, Math.min(high, number));
}

export async function runShot(shot, query, api) {
  const { state, loadSample, redraw, syncButtons } = api;
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const sizeKey = query.get('size') ?? 'square';
  const size = SIZES[sizeKey] ?? SIZES.square;
  state.sizeKey = sizeKey;
  state.w = size.w;
  state.h = size.h;
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('caption') !== null) {
    state.title = query.get('caption');
    document.getElementById('title').value = state.title;
  }
  if (query.get('subtitle') !== null) {
    state.subtitle = query.get('subtitle');
    document.getElementById('subtitle').value = state.subtitle;
  }
  if (query.get('colour')) state.titleColour = query.get('colour');
  state.effects = {
    sun: effectFlag(query, 'sun', true),
    palms: effectFlag(query, 'palms', true),
    halftone: effectFlag(query, 'halftone', true),
    grain: effectFlag(query, 'grain', true),
    vignette: effectFlag(query, 'vignette', true),
  };
  for (const [key, id] of Object.entries(EFFECT_INPUTS)) {
    document.getElementById(id).checked = state.effects[key];
  }

  const names = (query.get('photos') ?? query.get('photo') ?? 'boulevard').split(',');
  for (const name of names) await loadSample(name.trim());
  state.panels = state.panels.map((panel, i) => ({ ...panel, photo: i % state.photos.length }));
  // `pans` shifts each panel's photo vertically (positive shows more of the
  // photo's top, so a face survives a wide crop); `zooms` zooms each panel.
  if (query.get('pans')) {
    query.get('pans').split(',').forEach((value, i) => {
      if (state.panels[i]) state.panels[i].dy = clampNumber(value, -1.4, 1.4, 0);
    });
  }
  if (query.get('zooms')) {
    query.get('zooms').split(',').forEach((value, i) => {
      if (state.panels[i]) state.panels[i].zoom = clampNumber(value, 1, 3, 1);
    });
  }
  syncButtons();
  redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
