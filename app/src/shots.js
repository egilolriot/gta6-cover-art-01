// Fixed scenes for screenshots: ?shot=editor shows the app with a sample photo
// loaded; ?shot=cover shows the exported cover alone, full screen. Every scene
// is driven by query parameters, so a screenshot is reproducible:
//   ?shot=cover&photos=boulevard,pier&layout=strip&grade=sunset
//     &caption=SUNSET%20HEIST&subtitle=OCEAN%20DRIVE&size=wide
// `photos` names samples under samples/ (or several, comma-separated, one per
// panel in order); `size` is a key of SIZES; `sun`, `palms`, `halftone`,
// `grain` and `vignette` are 0 or 1; `colour` is a CSS colour for the title.
// window.__shotReady is set once the scene has painted.
import { SIZES } from './layouts.js';

function flag(query, name, fallback) {
  const value = query.get(name);
  if (value === null) return fallback;
  return value !== '0' && value.toLowerCase() !== 'false';
}

export async function runShot(shot, query, api) {
  const { state, loadSample, redraw, syncButtons } = api;
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const size = SIZES[query.get('size') ?? 'square'] ?? SIZES.square;
  state.sizeKey = query.get('size') ?? 'square';
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
    sun: flag(query, 'sun', true),
    palms: flag(query, 'palms', true),
    halftone: flag(query, 'halftone', true),
    grain: flag(query, 'grain', true),
    vignette: flag(query, 'vignette', true),
  };
  for (const [key, id] of Object.entries({ sun: 'fx-sun', palms: 'fx-palms', halftone: 'fx-halftone', grain: 'fx-grain', vignette: 'fx-vignette' })) {
    document.getElementById(id).checked = state.effects[key];
  }

  const photos = (query.get('photos') ?? query.get('photo') ?? 'boulevard').split(',');
  for (const name of photos) await loadSample(name.trim());
  state.panels = state.panels.map((panel, i) => ({ ...panel, photo: i % state.photos.length }));
  // `pans` shifts each panel's photo vertically (positive shows more of the
  // photo's top, so a face survives a wide crop); `zooms` zooms each panel.
  if (query.get('pans')) {
    query.get('pans').split(',').forEach((value, i) => {
      if (state.panels[i]) state.panels[i].dy = Math.max(-1.4, Math.min(1.4, Number(value) || 0));
    });
  }
  if (query.get('zooms')) {
    query.get('zooms').split(',').forEach((value, i) => {
      if (state.panels[i]) state.panels[i].zoom = Math.max(1, Math.min(3, Number(value) || 1));
    });
  }
  syncButtons();
  redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
