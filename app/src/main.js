// Wires the editor: photos in, layout and grade picked, caption typed, cover
// out as a PNG. A `?shot=` query sets up a fixed scene for a screenshot
// instead (./shots.js). State is plain data; drawCover (./cover.js) paints it.
import { drawCover } from './cover.js';
import { gradeById, GRADES } from './grades.js';
import { LAYOUTS, layoutPanelCount, layoutPanels } from './layouts.js';
import { runShot } from './shots.js';

const SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: '1080 × 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: '1080 × 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: '1920 × 1080' },
];

const PHOTO_SLOTS = 3;

const state = {
  size: SIZES[0],
  layout: 'trio',
  grade: 'sunset',
  caption: 'Sunset Heist',
  sub: 'VICE CITY',
  photos: Array(PHOTO_SLOTS).fill(null),
  panels: [],
  selected: 0,
};

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subInput = document.getElementById('sub');
const status = document.getElementById('status');
const panelList = document.getElementById('panel-list');

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Rebuilds the per-panel setup for the current layout, keeping what fits. */
function resetPanels() {
  const count = layoutPanelCount(state.layout);
  state.panels = Array.from({ length: count }, (_, index) => {
    const kept = state.panels[index];
    return kept ?? { slot: index % PHOTO_SLOTS, zoom: 1, x: 0.5, y: 0.5 };
  });
  state.selected = Math.min(state.selected, count - 1);
}

/** Paints the cover, then outlines the selected panel for the editor. */
function redraw() {
  drawCover(canvas, state);
  // A cover screenshot shows the finished art, never the editor's outline.
  if (document.body.classList.contains('shot-cover')) return;
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const rect = rects[state.selected];
  if (!rect) return;
  const ctx = canvas.getContext('2d');
  const grade = gradeById(state.grade);
  ctx.save();
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(3, Math.min(canvas.width, canvas.height) * 0.006);
  ctx.setLineDash([18, 10]);
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.restore();
}

function markActive(container, value) {
  container.querySelectorAll('button').forEach((button) => {
    const on = button.dataset.value === value;
    button.classList.toggle('active', on);
    button.setAttribute('aria-pressed', String(on));
  });
}

function buildPicker(containerId, entries, current, onPick) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  entries.forEach((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.value = entry.id;
    button.textContent = entry.label ?? entry.name;
    button.title = entry.blurb ?? '';
    button.addEventListener('click', () => {
      onPick(entry.id);
      markActive(container, entry.id);
    });
    container.appendChild(button);
  });
  markActive(container, current);
}

function buildPickers() {
  buildPicker('layout-picker', LAYOUTS, state.layout, (id) => {
    state.layout = id;
    resetPanels();
    renderPanelList();
    redraw();
  });
  buildPicker('grade-picker', GRADES, state.grade, (id) => {
    state.grade = id;
    redraw();
  });
  buildPicker(
    'size-picker',
    SIZES.map((size) => ({ ...size, name: size.label })),
    state.size.id,
    (id) => {
      state.size = SIZES.find((size) => size.id === id) ?? SIZES[0];
      redraw();
    },
  );
}

/** Builds the per-panel rows: photo slot, zoom and position sliders. */
function renderPanelList() {
  panelList.innerHTML = '';
  state.panels.forEach((panel, index) => {
    const row = document.createElement('div');
    row.className = `panel-row${index === state.selected ? ' selected' : ''}`;

    const head = document.createElement('div');
    head.className = 'panel-head';
    const title = document.createElement('span');
    title.textContent = `Panel ${index + 1}`;
    const slot = document.createElement('select');
    slot.setAttribute('aria-label', `Photo for panel ${index + 1}`);
    for (let s = 0; s < PHOTO_SLOTS; s += 1) {
      const option = document.createElement('option');
      option.value = String(s);
      option.textContent = `Photo ${s + 1}`;
      slot.appendChild(option);
    }
    slot.value = String(panel.slot);
    slot.addEventListener('change', () => {
      panel.slot = Number(slot.value);
      redraw();
    });
    head.append(title, slot);
    row.append(head);

    const sliders = [
      { key: 'zoom', label: 'Zoom', min: 1, max: 2.5, step: 0.05 },
      { key: 'x', label: 'Across', min: 0, max: 1, step: 0.01 },
      { key: 'y', label: 'Down', min: 0, max: 1, step: 0.01 },
    ];
    sliders.forEach(({ key, label, min, max, step }) => {
      const wrap = document.createElement('label');
      wrap.className = 'slider';
      const text = document.createElement('span');
      text.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(panel[key]);
      input.setAttribute('aria-label', `${label} for panel ${index + 1}`);
      input.addEventListener('input', () => {
        panel[key] = Number(input.value);
        redraw();
      });
      wrap.append(text, input);
      row.append(wrap);
    });

    row.addEventListener('click', (event) => {
      if (event.target === row || event.target === title) selectPanel(index);
    });
    panelList.appendChild(row);
  });
}

function selectPanel(index) {
  state.selected = index;
  panelList.querySelectorAll('.panel-row').forEach((row, i) => {
    row.classList.toggle('selected', i === index);
  });
  redraw();
}

canvas.addEventListener('click', (event) => {
  const box = canvas.getBoundingClientRect();
  const x = ((event.clientX - box.left) / box.width) * canvas.width;
  const y = ((event.clientY - box.top) / box.height) * canvas.height;
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const hit = rects.findIndex((rect) => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h);
  if (hit !== -1) selectPanel(hit);
});

for (let slot = 0; slot < PHOTO_SLOTS; slot += 1) {
  const input = document.getElementById(`photo-${slot}`);
  const name = document.getElementById(`photo-name-${slot}`);
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      state.photos[slot] = await loadImage(URL.createObjectURL(file));
      name.textContent = file.name;
      status.textContent = `Photo ${slot + 1} loaded.`;
      redraw();
    } catch {
      status.textContent = `Could not read ${file.name}.`;
    }
  });
}

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
subInput.addEventListener('input', () => {
  state.sub = subInput.value;
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${state.size.w}x${state.size.h}.png`;
    a.click();
    status.textContent = `Saved vice-cover-${state.size.w}x${state.size.h}.png`;
  }, 'image/png');
});

/** Applies a screenshot scene: sample photo, caption, layout, grade, size. */
async function applyShot(config) {
  const [w, h] = config.size.split('x').map(Number);
  state.size = SIZES.find((size) => size.w === w && size.h === h) ?? { id: config.size, w, h, label: config.size };
  state.layout = config.layout;
  state.grade = config.grade;
  state.caption = config.caption;
  state.sub = config.sub;
  captionInput.value = config.caption;
  subInput.value = config.sub;
  // Fill every photo slot for the scene: the named sample first, the other
  // sample second, the named one again, so no panel shows a placeholder.
  const otherSample = config.photo === 'pier' ? 'boulevard' : 'pier';
  try {
    state.photos[0] = await loadImage(`samples/${config.photo}.jpg`);
    state.photos[1] = await loadImage(`samples/${otherSample}.jpg`);
    state.photos[2] = state.photos[0];
    // Show the sample names in the editor, so the shot reads as loaded.
    [`${config.photo}.jpg (sample)`, `${otherSample}.jpg (sample)`, `${config.photo}.jpg (sample)`].forEach(
      (label, slot) => {
        const el = document.getElementById(`photo-name-${slot}`);
        if (el) el.textContent = label;
      },
    );
  } catch {
    state.photos[0] = null;
  }
  resetPanels();
  buildPickers();
  renderPanelList();
  redraw();
}

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, applyShot);
} else {
  resetPanels();
  buildPickers();
  renderPanelList();
  redraw();
  document.fonts.ready.then(() => redraw());
}
