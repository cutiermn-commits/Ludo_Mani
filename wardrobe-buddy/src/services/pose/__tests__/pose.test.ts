import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { isLocalFile } from '../PoseProvider';
import { createPoseChannel } from '../types';

const ROOT = path.join(__dirname, '..', '..', '..', '..');

jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('expo-asset', () => ({ Asset: {} }));

describe('local-file check', () => {
  it('lets only local files load in the hidden view', () => {
    expect(isLocalFile('file:///data/user/0/cache/ExponentAsset-1.html')).toBe(true);
    expect(isLocalFile('https://example.com/x.html')).toBe(false);
    expect(isLocalFile('about:blank')).toBe(false);
    expect(isLocalFile('javascript:alert(1)')).toBe(false);
  });
});

describe('pose channel', () => {
  it('waits for the page, sends one request and resolves with its answer', async () => {
    const sent: string[] = [];
    const ch = createPoseChannel<string>((target, json) => sent.push(`${target}:${json}`));
    ch.attach('page');
    const p = ch.run('AAAA');
    await Promise.resolve();
    expect(sent).toEqual([]); // not ready yet
    ch.receive(JSON.stringify({ type: 'ready' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(sent).toHaveLength(1);
    const { id } = JSON.parse(sent[0].slice('page:'.length));
    ch.receive(JSON.stringify({ id: 999, ok: true, keypoints: [9] })); // not ours
    ch.receive('not json');
    ch.receive({ not: 'a string' });
    ch.receive(JSON.stringify({ id, ok: true, keypoints: [1, 2, 3] }));
    await expect(p).resolves.toEqual([1, 2, 3]);
  });

  it('a request with no page attached fails at once instead of waiting', async () => {
    const ch = createPoseChannel<string>(() => undefined, 1000, 1000);
    ch.receive(JSON.stringify({ type: 'ready' }));
    await expect(ch.run('x')).rejects.toThrow('not attached');
  });

  it('fails cleanly on an error, a model that does not load, a page that never loads, or a closed page', async () => {
    const ch = createPoseChannel<string>(() => undefined, 50, 50);
    ch.attach('page');
    await expect(ch.run('x')).rejects.toThrow('did not load');
    ch.receive(JSON.stringify({ type: 'failed', error: 'no model' }));
    await expect(ch.run('x')).rejects.toThrow('no model');

    const sent: string[] = [];
    const ok = createPoseChannel<string>((_t, json) => sent.push(json), 1000, 1000);
    ok.attach('page');
    ok.receive(JSON.stringify({ type: 'ready' }));
    const failing = ok.run('x');
    await new Promise((r) => setTimeout(r, 0));
    ok.receive(JSON.stringify({ id: JSON.parse(sent[0]).id, ok: false, error: 'bad input size' }));
    await expect(failing).rejects.toThrow('bad input size');
    const closed = ok.run('x');
    await new Promise((r) => setTimeout(r, 0));
    ok.reset();
    await expect(closed).rejects.toThrow('closed');
  });
});

describe('offline pose page (D-064)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'assets', 'pose', 'pose.html'), 'utf8');
  it('blocks every network request with its Content-Security-Policy', () => {
    const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];
    expect(csp).toBe("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'");
    expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+href=|<img|<iframe/i);
  });
  it('carries the model inline and names its licences', () => {
    expect(html.length).toBeGreaterThan(5e6);
    expect(html).toContain('MoveNet SinglePose Lightning');
    expect(html).toContain('Apache-2.0');
  });
  it('the page script never navigates, opens windows or fetches', () => {
    const page = fs.readFileSync(path.join(ROOT, 'scripts', 'pose', 'page.js'), 'utf8');
    expect(page).not.toMatch(/\blocation\b|window\.open|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
  });
  it('is built from the vendored, reviewed model (not a stale or swapped copy)', () => {
    const bin = fs.readFileSync(path.join(ROOT, 'vendor', 'movenet', 'movenet-lightning.bin'));
    expect(crypto.createHash('sha256').update(bin).digest('hex')).toBe('bf97bc10d9c8a11200b0190ed64ce039b6252f1aff7cb552aca99b3d191c2f34');
    expect(html.includes(bin.toString('base64'))).toBe(true);
  });
  it('the vendored model is the reviewed one', () => {
    const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'vendor', 'movenet', 'movenet-lightning.json'), 'utf8'));
    expect(json.signature.inputs['input:0'].tensorShape.dim.map((d: { size: string }) => d.size)).toEqual(['1', '192', '192', '3']);
    expect(json.signature.outputs['Identity:0'].tensorShape.dim.map((d: { size: string }) => d.size)).toEqual(['1', '1', '17', '3']);
  });
});

describe('pose hosts are locked down', () => {
  const native = fs.readFileSync(path.join(ROOT, 'src', 'services', 'pose', 'PoseProvider.tsx'), 'utf8');
  const web = fs.readFileSync(path.join(ROOT, 'src', 'services', 'pose', 'PoseProvider.web.tsx'), 'utf8');
  it('phone WebView: only the bundled file, no navigation away, no extra windows', () => {
    expect(native).toContain("require('@/assets/pose/pose.html')");
    expect(native).toContain("originWhitelist={['file://*']}");
    expect(native).toContain('onShouldStartLoadWithRequest={(r: { url: string }) => isLocalFile(r.url)}');
    expect(native).not.toMatch(/allowUniversalAccessFromFileURLs|allowFileAccessFromFileURLs|mixedContentMode/);
    expect(native).toContain('setSupportMultipleWindows={false}');
    expect(native).not.toMatch(/https?:\/\//);
  });
  it('browser iframe: sandboxed (scripts only), messages only from that frame', () => {
    expect(web).toContain("sandbox: 'allow-scripts'");
    expect(web).not.toContain('allow-same-origin');
    expect(web).toContain('e.source === frame.contentWindow');
    expect(web).not.toMatch(/https?:\/\//);
  });
});
