// Vice Cover Studio — the program that hands the entry in.
//
// It copies this repository's app/ (the static cover maker) and screenshots/
// (three or four shots of it at work) to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library. Node 22, standard library only: nothing is installed
// before it runs, and it runs twice, so both runs must write the same bytes —
// the app itself is deterministic, and this program writes nothing that
// depends on the time.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

/** Walks a directory tree and totals its files and bytes. */
function tally(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const inner = tally(path);
      files += inner.files;
      bytes += inner.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

/** Refuses early, loudly, where the gate would refuse the entry. */
function checkShots() {
  const names = existsSync(shotsDir) ? readdirSync(shotsDir).filter((name) => !name.startsWith('.')) : [];
  if (names.length < 3 || names.length > 4) {
    throw new Error(`screenshots/ must hold 3 or 4 images, found ${names.length}`);
  }
  for (const name of names) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > 262144) throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
    if (!/\.(png|jpe?g)$/i.test(name)) throw new Error(`screenshots/${name} is not a PNG or JPEG`);
  }
  return names;
}

const shotNames = checkShots();
const app = tally(appDir);
if (!existsSync(join(appDir, 'index.html'))) {
  throw new Error('app/index.html is missing');
}

mkdirSync(outputDir, { recursive: true });
cpSync(appDir, join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

// The scorer's own caps: only text_max_bytes shapes the bytes; the rest
// refuse here an entry the scorer would refuse (more than 4 screenshots or
// one over 256 KiB; more than 993 files in app/ or 48 MiB of app files in
// all, or a path under app/ over 1000 bytes).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(
  `handed in app/ (${app.files} files, ${app.bytes} bytes) and ${shotNames.length} screenshots: ${shotNames.join(', ')}`,
);
