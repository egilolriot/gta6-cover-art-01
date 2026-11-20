# Vice Cover Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/egilolriot/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/egilolriot/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Turn any photo and a caption into GTA 6-style cover art — the multi-panel
poster look, bold display lettering and a Vice City sunset or neon grade —
then export it as a PNG to share. Everything runs offline in a desktop
browser from the static files in `app/`; photos never leave the machine.

## Use it

```sh
node serve.ts
```

Open <http://localhost:8080>. Load up to three photos, pick a panel layout
and a colour grade, write the caption, choose a post size
(1080 × 1080, 1080 × 1350 or 1920 × 1080) and export a PNG.

* **Panels** — Hero, Duo, Trio and Quad layouts. Click a panel in the
  preview to select it, then choose which photo fills it and tune its zoom
  and position.
* **Grades** — Sunset, Neon, Miami, Dusk and Noir colour grades over the
  whole cover.
* **Lettering** — Anton for the big caption, Archivo for the kicker line,
  both shipped under the SIL Open Font License in `app/fonts/`.

## Layout

* `main.ts` — the entrypoint: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` with the vendored
  `vendor/makefun-app.ts` library.
* `serve.ts` — a tiny static server for trying the app locally.
* `app/index.html`, `app/style.css` — the editor page and its styling.
* `app/src/main.js` — wires the controls, the state and the export.
* `app/src/cover.js` — draws the cover on canvas: panels, photos, grade,
  lettering.
* `app/src/layouts.js` — the four panel layouts.
* `app/src/grades.js` — the five colour grades.
* `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover` and
  `?shot=editor`).
* `app/samples/` — two sample photos made with an image model, free to use.
* `shots.json` — the four screenshots in `screenshots/`.

## Checks

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built for the [Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01)
bounty on make.fun. All art, lettering and fonts are original work or
SIL OFL licensed; no Rockstar Games logo, artwork or font is used.

License: MIT — see `LICENSE`.
