// Fixed scenes for screenshots. `?shot=cover` shows the finished cover alone;
// `?shot=editor` shows the editor with a sample photo loaded. The query picks
// the scene: photo (a sample name), caption, sub, layout, grade and size
// (for example `?shot=cover&photo=pier&caption=Sunset%20Heist&layout=trio`).
// `apply` sets the scene up; it runs twice, once before the web fonts arrive
// and once after, so the painted cover uses the real lettering.
// window.__shotReady is set once the scene is painted.
export async function runShot(shot, query, apply) {
  const config = {
    photo: query.get('photo') ?? 'pier',
    caption: query.get('caption') ?? 'Sunset Heist',
    sub: query.get('sub') ?? 'VICE CITY',
    layout: query.get('layout') ?? 'trio',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? '1080x1080',
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await apply(config);
  await document.fonts.ready;
  await apply(config);
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
}
