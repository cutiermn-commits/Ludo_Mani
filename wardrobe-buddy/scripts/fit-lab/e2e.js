// Real app in a browser: onboarding, her photo, many realistic garments, then outfits worn on the
// avatar and on the photo. Screenshots of the mirror for each outfit.
const { chromium } = require('playwright');
const [, , PHOTOS, PEOPLE, OUT, PERSON = 'girl-a'] = process.argv;
const GARMENTS = [
  ['tshirt--side', 'T-shirt'], ['jeans--upside', 'jeans'], ['sneakers--up', 'trainers'], ['hoodie--side', 'hoodie'],
  ['leggings--up', 'leggings'], ['dress-frock--up', 'dress'], ['shirt-armsout--up', 'shirt'], ['skirt--side', 'skirt'],
  ['sweater--upside', 'jumper'], ['trousers--exif', 'trousers'], ['jacket--up', 'jacket'], ['top-sleeveless--up', 'top'],
  ['shorts--side', 'shorts'], ['dress-strap--exif', 'dress'], ['shirt-long--side', 'shirt'], ['tshirt-stripes--up', 'T-shirt'],
];
const OUTFITS = [
  ['tshirt--side', 'jeans--upside', 'sneakers--up'],
  ['hoodie--side', 'leggings--up'],
  ['dress-frock--up', 'sneakers--up'],
  ['shirt-armsout--up', 'skirt--side'],
  ['sweater--upside', 'trousers--exif'],
  ['tshirt--side', 'jeans--upside', 'jacket--up'],
  ['top-sleeveless--up', 'shorts--side'],
  ['dress-strap--exif'],
  ['shirt-long--side', 'trousers--exif'],
  ['tshirt-stripes--up', 'skirt--side'],
];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 1400 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errors = [];
  const external = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ' ' + m.text().slice(0, 300)); });
  p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 200)));
  ctx.on('request', (r) => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && !['data:', 'blob:'].includes(u.protocol)) external.push(r.url()); });
  const btn = (name) => p.getByRole('button', { name, exact: true }).filter({ visible: true }).first();
  const tab = (name) => p.getByRole('tab', { name }).click();
  await p.goto(process.env.APP_URL || 'http://localhost:8092/');
  await btn('English').click();
  await btn('Next').click();
  const q = await p.getByText(/What is \d+ × \d+\?/).textContent();
  const [, a, c] = q.match(/(\d+) × (\d+)/);
  await p.getByLabel('Answer').fill(String(a * c));
  await btn('Continue').click();
  await btn('No, we will tell it ourselves').click();
  await btn('Next').click();
  await p.getByLabel('Nickname').fill('Star');
  await btn('11–12 years').click();
  await btn('Next').click();
  await btn('Next').click();
  await btn("Let's go!").click();
  await p.waitForTimeout(800);
  // Her photo
  await tab(/Me/);
  await p.waitForTimeout(400);
  const fc0 = p.waitForEvent('filechooser');
  await btn('Choose a photo').click();
  (await fc0).setFiles(`${PEOPLE}/${PERSON}.jpg`);
  const found = await p.getByText(/Found you!|Found your shoulders|couldn't find you|did not work/).first().waitFor({ timeout: 60000 }).then(() => 'ok').catch(() => 'timeout');
  console.log('pose', found, (await p.getByText(/Found you!|Found your shoulders|couldn't find you/).first().textContent().catch(() => '')).slice(0, 60));
  await p.screenshot({ path: `${OUT}/me-photo.png` });
  console.log('early errors', JSON.stringify(errors, null, 1));
  if (process.env.ONLY_POSE) {
    await b.close();
    return;
  }
  // Clothes
  const cutResult = {};
  for (const [file, type] of GARMENTS) {
    await tab(/Wardrobe/);
    await p.waitForTimeout(300);
    await btn('Add clothes').click();
    await p.waitForTimeout(400);
    const fc = p.waitForEvent('filechooser');
    await btn('Choose a photo').click();
    (await fc).setFiles(`${PHOTOS}/${file}.jpg`);
    await p.getByText(/Cut out!|I could not cut this one out/).first().waitFor({ timeout: 30000 });
    cutResult[file] = (await p.getByText(/Cut out!/).count()) ? 'cut' : 'NOT CUT';
    await btn(type).click();
    await btn('Save').click();
    await p.waitForTimeout(700);
  }
  console.log('cut', JSON.stringify(cutResult));
  // My day: tiles in creation order within each row; each file's tile is found by its position.
  await tab(/My day/);
  await p.waitForTimeout(800);
  const tileOf = async (file) => {
    const [, type] = GARMENTS.find(([f]) => f === file);
    const same = GARMENTS.filter(([, t]) => t === type).map(([f]) => f);
    const idx = same.indexOf(file);
    const re = new RegExp(`\\b${type.replace(/[-]/g, '\\-')}\\b`, 'i');
    const all = p.getByRole('button', { name: re }).filter({ visible: true });
    const n = await all.count();
    return all.nth(n - same.length + idx); // My day is the last screen in the page
  };
  const shoot = async (name) => {
    await p.evaluate(() => document.querySelectorAll('div').forEach((d) => { if (d.scrollHeight > d.clientHeight + 5) d.scrollTop = 0; }));
    await p.waitForTimeout(2600); // let reactions finish
    const mirror = p.getByRole('button', { name: /Tap for a surprise/ }).filter({ visible: true }).first();
    await mirror.screenshot({ path: `${OUT}/${name}.png` });
  };
  await p.screenshot({ path: `${OUT}/myday-start.png`, fullPage: true });
  console.log((await p.getByRole('button').filter({ visible: true }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).join(' | ').slice(0, 2000));
  for (const [i, outfit] of OUTFITS.entries()) {
    for (const mode of ['Avatar', 'My photo']) {
      await p.getByRole('button', { name: mode, exact: true }).filter({ visible: true }).last().click();
      await p.waitForTimeout(300);
      if (await p.getByRole('button', { name: 'Clear my outfit' }).filter({ visible: true }).count()) { await btn('Clear my outfit').click(); await p.waitForTimeout(300); }
      for (const f of outfit) {
        const t = await tileOf(f);
        await t.scrollIntoViewIfNeeded();
        await t.click();
        await p.waitForTimeout(250);
      }
      await shoot(`outfit${i}-${mode === 'Avatar' ? 'avatar' : 'photo'}`);
    }
  }
  console.log('errors', JSON.stringify(errors.slice(0, 5)), 'external', JSON.stringify(external));
  await b.close();
})();
