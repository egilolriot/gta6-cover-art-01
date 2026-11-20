// Colour grades: a Vice City sunset or neon look, applied on canvas with plain
// 2D operations so the app needs no library and no network. Each grade names:
//  - photo: the CSS filter string drawn over each photo before it is painted
//  - wash: a top-to-bottom gradient painted over the whole cover in "overlay"
//  - dusk: a second gradient painted in "multiply" for the low, warm shadows
//  - sun: the colour of the sun disc, or null for no disc
//  - accent: the colour of the subtitle and the caption underline
//  - scrim: the colour the caption band fades up from
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    hint: 'Magenta dusk over a hot orange horizon',
    photo: 'saturate(1.35) contrast(1.12) brightness(1.04) sepia(0.12)',
    wash: ['rgba(255, 122, 26, 0.0)', 'rgba(255, 94, 98, 0.34)', 'rgba(188, 42, 141, 0.42)'],
    dusk: ['rgba(64, 12, 64, 0.0)', 'rgba(64, 12, 64, 0.28)'],
    sun: '#ffd166',
    accent: '#ffb703',
    scrim: '20, 6, 32',
  },
  neon: {
    label: 'Neon Nights',
    hint: 'Cyan and magenta neon over deep blue',
    photo: 'saturate(1.45) contrast(1.18) brightness(0.98) hue-rotate(-8deg)',
    wash: ['rgba(0, 229, 255, 0.0)', 'rgba(0, 229, 255, 0.22)', 'rgba(255, 0, 166, 0.38)'],
    dusk: ['rgba(10, 8, 48, 0.0)', 'rgba(10, 8, 48, 0.34)'],
    sun: '#ff5da2',
    accent: '#00e5ff',
    scrim: '8, 6, 40',
  },
  gold: {
    label: 'Gold Hour',
    hint: 'Warm gold light, soft and rich',
    photo: 'saturate(1.25) contrast(1.08) brightness(1.08) sepia(0.22)',
    wash: ['rgba(255, 214, 120, 0.0)', 'rgba(255, 170, 60, 0.26)', 'rgba(214, 120, 30, 0.36)'],
    dusk: ['rgba(66, 32, 8, 0.0)', 'rgba(66, 32, 8, 0.26)'],
    sun: '#fff3c4',
    accent: '#ffd166',
    scrim: '34, 18, 4',
  },
  noir: {
    label: 'Palm Noir',
    hint: 'High-contrast black and white with a hot edge',
    photo: 'saturate(0.12) contrast(1.35) brightness(1.02)',
    wash: ['rgba(255, 255, 255, 0.0)', 'rgba(255, 255, 255, 0.10)', 'rgba(255, 64, 96, 0.22)'],
    dusk: ['rgba(0, 0, 0, 0.0)', 'rgba(0, 0, 0, 0.38)'],
    sun: '#ffffff',
    accent: '#ff4d6d',
    scrim: '8, 8, 10',
  },
  dusk: {
    label: 'Pastel Dusk',
    hint: 'Soft pink and lavender evening',
    photo: 'saturate(1.15) contrast(1.05) brightness(1.06) hue-rotate(12deg)',
    wash: ['rgba(255, 183, 213, 0.0)', 'rgba(255, 150, 200, 0.22)', 'rgba(150, 120, 255, 0.30)'],
    dusk: ['rgba(48, 24, 72, 0.0)', 'rgba(48, 24, 72, 0.24)'],
    sun: '#ffe3f1',
    accent: '#ff9ecf',
    scrim: '30, 16, 48',
  },
};
