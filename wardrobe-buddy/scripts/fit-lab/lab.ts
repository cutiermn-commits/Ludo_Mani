import * as fs from 'fs';

import { cutoutBackground } from '@/domain/image/cutout';
import { garmentShape, maskOf, mirrorMatch, turnImage, turnMask, uprightTurn, type Turn } from '@/domain/fit/garmentShape';

/** Measure cut-out, way-up and shape on the synthetic photo set against its ground truth. */
const [prep, photos, out] = process.argv.slice(2);
const truth = JSON.parse(fs.readFileSync(`${photos}/truth.json`, 'utf8'));
const rows: Record<string, unknown>[] = [];
for (const name of Object.keys(truth)) {
  const t = truth[name];
  const meta = JSON.parse(fs.readFileSync(`${prep}/${name}.json`, 'utf8'));
  const data = new Uint8Array(fs.readFileSync(`${prep}/${name}.rgba`));
  const res = cutoutBackground({ width: meta.w, height: meta.h, data });
  const row: Record<string, unknown> = { name, cat: t.cat, sub: t.sub, variant: t.variant, bg: t.bg };
  if (!res.ok) {
    row.cut = res.reason;
    rows.push(row);
    continue;
  }
  row.cut = 'ok';
  const m = maskOf(res.image);
  const turn = uprightTurn(m, t.cat, t.sub);
  const want: Turn = t.rot === 90 ? 1 : t.rot === 180 ? 2 : t.rot === 270 ? 3 : 0;
  row.turn = turn;
  row.wantTurn = want;
  row.scores = [mirrorMatch(m), mirrorMatch(turnMask(m, 1))].map((v) => Math.round(v * 100) / 100);
  const up = turnImage(res.image, turn);
  const um = maskOf(up);
  const shape = garmentShape(um, t.cat, t.sub);
  row.shape = shape;
  // truth anchors: photo shares → cut-out pixels → turned
  const toCut = (p: [number, number]) => {
    let x = p[0] * meta.w - res.crop.x;
    let y = p[1] * meta.h - res.crop.y;
    const w = res.crop.w;
    const h = res.crop.h;
    for (let i = 0; i < turn; i++) {
      // one clockwise turn of a w×h picture
      const nx = (i % 2 ? w : h) - 1 - y;
      const ny = x;
      x = nx;
      y = ny;
    }
    return { x: x / up.width, y: y / up.height };
  };
  const a = t.anchors as Record<string, [number, number]>;
  if (shape && turn === want) {
    if (a.shoulderL) {
      const L = toCut(a.shoulderL);
      const R = toCut(a.shoulderR);
      const lo = { x: shape.cx - shape.bodyHalf, y: shape.top };
      const hi = { x: shape.cx + shape.bodyHalf, y: shape.top };
      const span = Math.abs(R.x - L.x) || 1;
      const errL = Math.hypot(Math.min(L.x, R.x) - lo.x, (Math.min(L.x, R.x) === L.x ? L.y : R.y) - lo.y);
      const errR = Math.hypot(Math.max(L.x, R.x) - hi.x, (Math.max(L.x, R.x) === R.x ? R.y : L.y) - hi.y);
      row.anchorErr = Math.round((Math.max(errL, errR) / span) * 100); // % of shoulder span
    }
    if (a.waistL) {
      const L = toCut(a.waistL);
      const R = toCut(a.waistR);
      const span = Math.abs(R.x - L.x) || 1;
      const errL = Math.hypot(Math.min(L.x, R.x) - (shape.cx - shape.bodyHalf), L.y - shape.top);
      const errR = Math.hypot(Math.max(L.x, R.x) - (shape.cx + shape.bodyHalf), R.y - shape.top);
      row.anchorErr = Math.round((Math.max(errL, errR) / span) * 100);
    }
  }
  fs.writeFileSync(`${out}/${name}.cut.rgba`, Buffer.from(up.data));
  fs.writeFileSync(`${out}/${name}.cut.json`, JSON.stringify({ w: up.width, h: up.height, shape }));
  rows.push(row);
}
fs.writeFileSync(`${out}/report.json`, JSON.stringify(rows, null, 1));
const ok = rows.filter((r) => r.cut === 'ok');
console.log(`cut ok ${ok.length}/${rows.length}`);
for (const r of rows) console.log([r.name, r.cut, r.turn !== undefined ? `turn ${r.turn}/${r.wantTurn}` : '', r.scores ? JSON.stringify(r.scores) : '', r.anchorErr !== undefined ? `err ${r.anchorErr}%` : ''].join('  '));
