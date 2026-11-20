// Vice Cover Studio — the editor wiring.
//
// A photo (or several) and a caption become a GTA-style multi-panel cover,
// drawn live on canvas and exported as a PNG. A `?shot=` query sets up a
// fixed scene for a screenshot instead (see shots.js).

import { drawCover } from './cover.js';
import { GRADES } from './grades.js';
import { LAYOUTS, SIZES } from './layouts.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const thumbsEl = document.getElementById('thumbs');
const panelLabel = document.getElementById('panel-label');
const zoomInput = document.getElementById('zoom');
const previewWrap = document.getElementById('preview');

const state = {
  w: 1080,
  h: 1080,
  sizeKey: 'square',
  layout: 'strip',
  grade: 'sunset',
  title: 'SUNSET HEIST',
  subtitle: 'OCEAN DRIVE',
  titleColour: '#ffffff',
  titleSize: 1,
  effects: { sun: true, palms: true, halftone: true, grain: true, vignette: true },
  photos: [],
  panels: [],
  selected: 0,
};

const TITLE_COLOURS = { White: '#ffffff', Gold: '#ffd166', Pink: '#ff5da2' };

let fontsLoaded = false;

/** Loads Anton and Archivo once; the cover still draws on fallbacks. */
async function loadFonts() {
  if (fontsLoaded) return;
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('900 20px Archivo'),
      document.fonts.load('700 20px Archivo'),
    ]);
    await document.fonts.ready;
  } catch {
    // The system fallback still draws; the cover never depends on the webfont.
  }
  fontsLoaded = true;
}

/** How many panels the current layout has at the current size. */
function countPanels() {
  return LAYOUTS[state.layout].panels(state.w, state.h).length;
}

/** One panel setting per layout panel, keeping the old ones where they fit. */
function refreshPanels() {
  const total = countPanels();
  const kept = [];
  for (let i = 0; i < total; i += 1) {
    kept.push(state.panels[i] ?? {
      photo: state.photos.length ? i % state.photos.length : 0,
      zoom: 1,
      dx: 0,
      dy: 0,
    });
  }
  state.panels = kept;
  if (state.selected >= total) state.selected = 0;
}

function repaint() {
  refreshPanels();
  drawCover(canvas, state);
  const total = countPanels();
  panelLabel.textContent = `Panel ${state.selected + 1} of ${total} — drag the preview to move the photo, scroll to zoom`;
  zoomInput.value = String(state.panels[state.selected]?.zoom ?? 1);
}

function showStatus(text) {
  statusEl.textContent = text;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function addPhoto(img, name) {
  state.photos.push({ img, name });
  renderThumbs();
  repaint();
}

async function addSample(name) {
  try {
    const img = await loadImage(`./samples/${name}.jpg`);
    addPhoto(img, name);
    showStatus(`Loaded sample photo ${name}.`);
  } catch {
    showStatus(`Could not load the sample photo ${name}.`);
  }
}

async function addFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  try {
    const img = await loadImage(URL.createObjectURL(file));
    addPhoto(img, file.name);
    showStatus(`Loaded ${file.name}.`);
  } catch {
    showStatus(`Could not read ${file.name} as an image.`);
  }
}

function renderThumbs() {
  thumbsEl.innerHTML = '';
  if (state.photos.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'No photos yet — add one below, or try a sample.';
    thumbsEl.appendChild(empty);
    return;
  }
  state.photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = `Use ${photo.name} in the selected panel`;
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    button.appendChild(thumb);
    button.addEventListener('click', () => {
      refreshPanels();
      state.panels[state.selected].photo = i;
      repaint();
      showStatus(`Panel ${state.selected + 1} now shows ${photo.name}.`);
    });
    thumbsEl.appendChild(button);
  });
}

/** Builds the layout, grade, size and title-colour buttons from the tables. */
function buildButtons() {
  const layoutBox = document.getElementById('layouts');
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option';
    button.textContent = layout.label;
    button.title = layout.hint;
    button.addEventListener('click', () => {
      state.layout = key;
      state.selected = 0;
      markActive();
      repaint();
    });
    layoutBox.appendChild(button);
  }
  const gradeBox = document.getElementById('grades');
  for (const [key, grade] of Object.entries(GRADES)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option grade';
    button.textContent = grade.label;
    button.title = grade.hint;
    button.style.setProperty('--accent', grade.accent);
    button.addEventListener('click', () => {
      state.grade = key;
      markActive();
      repaint();
    });
    gradeBox.appendChild(button);
  }
  const sizeBox = document.getElementById('sizes');
  for (const [key, size] of Object.entries(SIZES)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option';
    button.textContent = size.label;
    button.addEventListener('click', () => {
      state.sizeKey = key;
      state.w = size.w;
      state.h = size.h;
      markActive();
      repaint();
    });
    sizeBox.appendChild(button);
  }
  const colourBox = document.getElementById('title-colours');
  for (const [name, colour] of Object.entries(TITLE_COLOURS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option swatch';
    button.textContent = name;
    button.style.setProperty('--swatch', colour);
    button.addEventListener('click', () => {
      state.titleColour = colour;
      markActive();
      repaint();
    });
    colourBox.appendChild(button);
  }
}

/** Marks the buttons that match the current state as active. */
function markActive() {
  const markBox = (boxId, table, key) => {
    const keys = Object.keys(table);
    document.getElementById(boxId).querySelectorAll('.option').forEach((button, i) => {
      button.classList.toggle('active', keys[i] === key);
    });
  };
  markBox('layouts', LAYOUTS, state.layout);
  markBox('grades', GRADES, state.grade);
  markBox('sizes', SIZES, state.sizeKey);
  document.querySelectorAll('#title-colours .option').forEach((button) => {
    const swatch = button.style.getPropertyValue('--swatch').trim();
    button.classList.toggle('active', swatch === state.titleColour);
  });
}

/** Which layout panel sits under a point of the displayed canvas. */
function panelUnder(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * state.w;
  const y = ((clientY - rect.top) / rect.height) * state.h;
  const rects = LAYOUTS[state.layout].panels(state.w, state.h);
  const hit = rects.findIndex((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
  return { index: hit === -1 ? 0 : hit, x, y };
}

let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const found = panelUnder(event.clientX, event.clientY);
  state.selected = found.index;
  drag = { x: found.x, y: found.y, panel: state.panels[found.index] };
  canvas.setPointerCapture(event.pointerId);
  repaint();
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * state.w;
  const y = ((event.clientY - rect.top) / rect.height) * state.h;
  const panel = LAYOUTS[state.layout].panels(state.w, state.h)[state.selected];
  drag.panel.dx = Math.max(-0.6, Math.min(0.6, drag.panel.dx + (x - drag.x) / panel.w));
  drag.panel.dy = Math.max(-0.6, Math.min(0.6, drag.panel.dy + (y - drag.y) / panel.h));
  drag.x = x;
  drag.y = y;
  repaint();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
});
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  refreshPanels();
  const panel = state.panels[state.selected];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (event.deltaY < 0 ? 1.08 : 0.93)));
  repaint();
}, { passive: false });

document.getElementById('photo').addEventListener('change', async (event) => {
  for (const file of event.target.files) await addFile(file);
  event.target.value = '';
});
for (const sample of ['boulevard', 'pier']) {
  document.getElementById(`sample-${sample}`).addEventListener('click', () => addSample(sample));
}
previewWrap.addEventListener('dragover', (event) => event.preventDefault());
previewWrap.addEventListener('drop', async (event) => {
  event.preventDefault();
  for (const file of event.dataTransfer.files) await addFile(file);
});

document.getElementById('title').addEventListener('input', (event) => {
  state.title = event.target.value;
  repaint();
});
document.getElementById('subtitle').addEventListener('input', (event) => {
  state.subtitle = event.target.value;
  repaint();
});
document.getElementById('title-size').addEventListener('input', (event) => {
  state.titleSize = Number(event.target.value);
  repaint();
});
zoomInput.addEventListener('input', (event) => {
  refreshPanels();
  state.panels[state.selected].zoom = Number(event.target.value);
  repaint();
});
document.getElementById('fit').addEventListener('click', () => {
  refreshPanels();
  const photo = state.panels[state.selected].photo;
  state.panels[state.selected] = { photo, zoom: 1, dx: 0, dy: 0 };
  repaint();
});
for (const [key, id] of Object.entries({ sun: 'fx-sun', palms: 'fx-palms', halftone: 'fx-halftone', grain: 'fx-grain', vignette: 'fx-vignette' })) {
  document.getElementById(id).addEventListener('change', (event) => {
    state.effects[key] = event.target.checked;
    repaint();
  });
}
document.getElementById('export').addEventListener('click', () => {
  repaint();
  canvas.toBlob((blob) => {
    if (!blob) {
      showStatus('Export failed in this browser.');
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vice-cover-${state.w}x${state.h}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    showStatus(`Saved vice-cover-${state.w}x${state.h}.png — ${state.w} × ${state.h}.`);
  }, 'image/png');
});

buildButtons();
markActive();
renderThumbs();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  await loadFonts();
  await runShot(shot, query, {
    state,
    loadSample: addSample,
    loadImage,
    redraw: repaint,
    setStatus: showStatus,
    syncButtons: markActive,
  });
} else {
  await loadFonts();
  repaint();
  showStatus('Add a photo, pick a layout and a grade, then export your cover.');
}
