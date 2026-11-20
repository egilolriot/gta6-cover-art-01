// Vice Cover Studio: wires the editor. A photo (or several) and a caption become
// a GTA-style multi-panel cover, drawn live on canvas and exported as a PNG.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
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

let fontsReady = false;
async function ensureFonts() {
  if (fontsReady) return;
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('900 20px Archivo'),
      document.fonts.load('700 20px Archivo'),
    ]);
    await document.fonts.ready;
  } catch {
    /* The system fallback still draws; the cover never depends on the webfont. */
  }
  fontsReady = true;
}

function panelCount() {
  return LAYOUTS[state.layout].panels(state.w, state.h).length;
}

/** Keeps one panel setting per layout panel, reusing the old ones where they fit. */
function ensurePanels() {
  const n = panelCount();
  const next = [];
  for (let i = 0; i < n; i++) {
    const old = state.panels[i];
    next.push(
      old ?? {
        photo: state.photos.length ? i % state.photos.length : 0,
        zoom: 1,
        dx: 0,
        dy: 0,
      },
    );
  }
  state.panels = next;
  if (state.selected >= n) state.selected = 0;
}

function redraw() {
  ensurePanels();
  drawCover(canvas, state);
  const n = panelCount();
  panelLabel.textContent = `Panel ${state.selected + 1} of ${n} — drag the preview to move the photo, scroll to zoom`;
  zoomInput.value = String(state.panels[state.selected]?.zoom ?? 1);
}

function setStatus(text) {
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

async function addPhoto(img, name) {
  state.photos.push({ img, name });
  renderThumbs();
  redraw();
}

async function addSample(name) {
  try {
    const img = await loadImage(`./samples/${name}.jpg`);
    await addPhoto(img, name);
    setStatus(`Loaded sample photo ${name}.`);
  } catch {
    setStatus(`Could not load the sample photo ${name}.`);
  }
}

async function addFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  try {
    const img = await loadImage(URL.createObjectURL(file));
    await addPhoto(img, file.name);
    setStatus(`Loaded ${file.name}.`);
  } catch {
    setStatus(`Could not read ${file.name} as an image.`);
  }
}

function renderThumbs() {
  thumbsEl.innerHTML = '';
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
      ensurePanels();
      state.panels[state.selected].photo = i;
      redraw();
      setStatus(`Panel ${state.selected + 1} now shows ${photo.name}.`);
    });
    thumbsEl.appendChild(button);
  });
  if (!state.photos.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'No photos yet — add one below, or try a sample.';
    thumbsEl.appendChild(empty);
  }
}

/** Builds the layout, grade and size buttons from the tables. */
function buildOptionButtons() {
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
      syncButtons();
      redraw();
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
      syncButtons();
      redraw();
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
      syncButtons();
      redraw();
    });
    sizeBox.appendChild(button);
  }
  const colourBox = document.getElementById('title-colours');
  for (const [name, colour] of Object.entries({ White: '#ffffff', Gold: '#ffd166', Pink: '#ff5da2' })) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option swatch';
    button.textContent = name;
    button.style.setProperty('--swatch', colour);
    button.addEventListener('click', () => {
      state.titleColour = colour;
      syncButtons();
      redraw();
    });
    colourBox.appendChild(button);
  }
}

function syncButtons() {
  const mark = (boxId, key) => {
    document.getElementById(boxId).querySelectorAll('.option').forEach((button, i) => {
      button.classList.toggle('active', Object.keys(boxId === 'layouts' ? LAYOUTS : boxId === 'grades' ? GRADES : boxId === 'sizes' ? SIZES : { White: 0, Gold: 0, Pink: 0 })[i] === key);
    });
  };
  mark('layouts', state.layout);
  mark('grades', state.grade);
  mark('sizes', state.sizeKey);
  document.querySelectorAll('#title-colours .option').forEach((button) => {
    button.classList.toggle('active', button.style.getPropertyValue('--swatch').trim() === state.titleColour);
  });
}

/** Which layout panel sits under a point of the displayed canvas. */
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * state.w;
  const y = ((clientY - rect.top) / rect.height) * state.h;
  const panels = LAYOUTS[state.layout].panels(state.w, state.h);
  const hit = panels.findIndex((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
  return { index: hit === -1 ? 0 : hit, x, y };
}

let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const { index, x, y } = panelAt(event.clientX, event.clientY);
  state.selected = index;
  drag = { x, y, panel: state.panels[index] };
  canvas.setPointerCapture(event.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * state.w;
  const y = ((event.clientY - rect.top) / rect.height) * state.h;
  const panels = LAYOUTS[state.layout].panels(state.w, state.h);
  const panel = panels[state.selected];
  drag.panel.dx += (x - drag.x) / panel.w;
  drag.panel.dy += (y - drag.y) / panel.h;
  drag.panel.dx = Math.max(-0.6, Math.min(0.6, drag.panel.dx));
  drag.panel.dy = Math.max(-0.6, Math.min(0.6, drag.panel.dy));
  drag.x = x;
  drag.y = y;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
});
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  ensurePanels();
  const panel = state.panels[state.selected];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (event.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
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
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (event) => {
  state.subtitle = event.target.value;
  redraw();
});
document.getElementById('title-size').addEventListener('input', (event) => {
  state.titleSize = Number(event.target.value);
  redraw();
});
zoomInput.addEventListener('input', (event) => {
  ensurePanels();
  state.panels[state.selected].zoom = Number(event.target.value);
  redraw();
});
document.getElementById('fit').addEventListener('click', () => {
  ensurePanels();
  state.panels[state.selected] = { photo: state.panels[state.selected].photo, zoom: 1, dx: 0, dy: 0 };
  redraw();
});
for (const [key, id] of Object.entries({ sun: 'fx-sun', palms: 'fx-palms', halftone: 'fx-halftone', grain: 'fx-grain', vignette: 'fx-vignette' })) {
  document.getElementById(id).addEventListener('change', (event) => {
    state.effects[key] = event.target.checked;
    redraw();
  });
}
document.getElementById('export').addEventListener('click', () => {
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed in this browser.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${state.w}x${state.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-cover-${state.w}x${state.h}.png — ${state.w} × ${state.h}.`);
  }, 'image/png');
});

buildOptionButtons();
syncButtons();
renderThumbs();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  await ensureFonts();
  await runShot(shot, query, {
    state,
    loadSample: addSample,
    loadImage,
    redraw,
    setStatus,
    syncButtons,
  });
} else {
  await ensureFonts();
  redraw();
  setStatus('Add a photo, pick a layout and a grade, then export your cover.');
}
