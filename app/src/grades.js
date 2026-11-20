// The five colour grades of a cover. A grade is a sky gradient washed over
// the whole cover, a warm or cool tint, and the colours of the lettering, so
// one choice re-colours panels, title and accents together.

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   blurb: string,
 *   skyTop: string,
 *   skyBottom: string,
 *   skyAlpha: number,
 *   tint: string,
 *   tintAlpha: number,
 *   text: string,
 *   accent: string,
 * }} ColourGrade
 */

/** @type {ColourGrade[]} */
export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    blurb: 'Vice City golden hour',
    skyTop: '#ff9a3d',
    skyBottom: '#ff2e63',
    skyAlpha: 0.4,
    tint: '#ff7a18',
    tintAlpha: 0.15,
    text: '#fff7e6',
    accent: '#ffd166',
  },
  {
    id: 'neon',
    name: 'Neon',
    blurb: 'Pink and cyan after dark',
    skyTop: '#7b2fff',
    skyBottom: '#00e5ff',
    skyAlpha: 0.36,
    tint: '#ff2ea6',
    tintAlpha: 0.15,
    text: '#ffffff',
    accent: '#ff2ea6',
  },
  {
    id: 'miami',
    name: 'Miami',
    blurb: 'Pastel pink over ocean blue',
    skyTop: '#ff6ec7',
    skyBottom: '#00c2ff',
    skyAlpha: 0.36,
    tint: '#ff6ec7',
    tintAlpha: 0.13,
    text: '#ffffff',
    accent: '#ffe600',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    blurb: 'Purple evening, ember streets',
    skyTop: '#3b2d5c',
    skyBottom: '#e8734a',
    skyAlpha: 0.4,
    tint: '#7b5cff',
    tintAlpha: 0.16,
    text: '#ffe9d6',
    accent: '#ff9a3d',
  },
  {
    id: 'noir',
    name: 'Noir',
    blurb: 'Black, white and one red accent',
    skyTop: '#3a3a44',
    skyBottom: '#0c0c12',
    skyAlpha: 0.36,
    tint: '#000000',
    tintAlpha: 0.18,
    text: '#f5f5f5',
    accent: '#e63946',
  },
];

/** Finds a grade by id, falling back to the first one. */
export function gradeById(id) {
  return GRADES.find((entry) => entry.id === id) ?? GRADES[0];
}
