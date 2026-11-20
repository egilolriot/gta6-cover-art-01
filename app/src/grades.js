// Vice Cover Studio — colour grades.
//
// Each grade is one look for the cover: a filter laid over every photo, two
// gradients washed across the whole poster, a sun colour (or none), an accent
// for the subtitle and the rule under the title, and the RGB of the scrim the
// caption fades up from. All five are applied with plain Canvas 2D, so the
// app stays offline and needs no library at all.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    hint: 'Magenta dusk falling over a hot orange horizon',
    photo: 'saturate(1.4) contrast(1.1) brightness(1.05) sepia(0.14)',
    wash: ['rgba(255, 130, 30, 0)', 'rgba(255, 90, 100, 0.32)', 'rgba(190, 40, 145, 0.44)'],
    dusk: ['rgba(60, 10, 60, 0)', 'rgba(60, 10, 60, 0.3)'],
    sun: '#ffd166',
    accent: '#ffb703',
    scrim: '18, 5, 30',
  },
  neon: {
    label: 'Neon Nights',
    hint: 'Cyan and magenta neon glowing over deep blue',
    photo: 'saturate(1.5) contrast(1.16) brightness(0.97) hue-rotate(-10deg)',
    wash: ['rgba(0, 230, 255, 0)', 'rgba(0, 230, 255, 0.2)', 'rgba(255, 0, 170, 0.4)'],
    dusk: ['rgba(12, 8, 52, 0)', 'rgba(12, 8, 52, 0.36)'],
    sun: '#ff5da2',
    accent: '#00e5ff',
    scrim: '6, 5, 38',
  },
  gold: {
    label: 'Gold Hour',
    hint: 'Warm late-afternoon gold, soft and rich',
    photo: 'saturate(1.28) contrast(1.07) brightness(1.09) sepia(0.24)',
    wash: ['rgba(255, 216, 120, 0)', 'rgba(255, 168, 58, 0.28)', 'rgba(212, 118, 28, 0.38)'],
    dusk: ['rgba(68, 34, 8, 0)', 'rgba(68, 34, 8, 0.28)'],
    sun: '#fff3c4',
    accent: '#ffd166',
    scrim: '36, 20, 6',
  },
  noir: {
    label: 'Palm Noir',
    hint: 'High-contrast black and white with a hot red edge',
    photo: 'saturate(0.1) contrast(1.38) brightness(1.03)',
    wash: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.08)', 'rgba(255, 60, 95, 0.24)'],
    dusk: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.4)'],
    sun: '#ffffff',
    accent: '#ff4d6d',
    scrim: '6, 6, 8',
  },
  dusk: {
    label: 'Pastel Dusk',
    hint: 'Soft pink and lavender evening light',
    photo: 'saturate(1.18) contrast(1.04) brightness(1.07) hue-rotate(14deg)',
    wash: ['rgba(255, 185, 215, 0)', 'rgba(255, 148, 200, 0.24)', 'rgba(148, 118, 255, 0.32)'],
    dusk: ['rgba(46, 22, 70, 0)', 'rgba(46, 22, 70, 0.26)'],
    sun: '#ffe3f1',
    accent: '#ff9ecf',
    scrim: '28, 14, 46',
  },
};
