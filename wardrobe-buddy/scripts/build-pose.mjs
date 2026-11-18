// Builds assets/pose/pose.html: one offline page holding TensorFlow.js (CPU backend) and the
// MoveNet SinglePose Lightning model, for on-device body-pose detection on her photo (D-064).
//   npm run build:pose
// The output is committed, so app builds (EAS, web) don't need TensorFlow.js installed.
// The page's Content-Security-Policy allows no network requests at all (default-src 'none').
import { build } from 'esbuild';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendor = join(root, 'vendor', 'movenet');
const generated = join(root, 'scripts', 'pose', '.model.generated.js');

const json = readFileSync(join(vendor, 'movenet-lightning.json'), 'utf8');
const bin = readFileSync(join(vendor, 'movenet-lightning.bin'));
writeFileSync(generated, `export const MODEL_JSON = ${JSON.stringify(json)};\nexport const MODEL_B64 = ${JSON.stringify(bin.toString('base64'))};\n`);

try {
  const res = await build({
    entryPoints: [join(root, 'scripts', 'pose', 'page.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2019',
    platform: 'browser',
    write: false,
    legalComments: 'none',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const html = `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
<meta name="referrer" content="no-referrer">
<title>Wardrobe Buddy pose</title>
<!-- Body-pose model: MoveNet SinglePose Lightning v4 by Google (Apache-2.0, tfhub.dev/google/movenet/singlepose/lightning/4),
     TensorFlow.js graph conversion by Vladimir Mandic (@vladmandic/human-models, MIT). TensorFlow.js: Apache-2.0. -->
</head><body><script>${js}</script></body></html>
`;
  writeFileSync(join(root, 'assets', 'pose', 'pose.html'), html);
  console.log(`assets/pose/pose.html ${(html.length / 1e6).toFixed(1)} MB`);
} finally {
  rmSync(generated, { force: true });
}
