import * as fs from 'fs';
import * as path from 'path';

import { createPoseChannel } from '../types';

const ROOT = path.join(__dirname, '..', '..', '..', '..');

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

  it('fails cleanly on an error, a model that does not load, a page that never loads, or a closed page', async () => {
    const ch = createPoseChannel<string>(() => undefined, 50);
    ch.attach('page');
    await expect(ch.run('x')).rejects.toThrow('did not load');
    ch.receive(JSON.stringify({ type: 'failed', error: 'no model' }));
    await expect(ch.run('x')).rejects.toThrow('no model');

    const sent: string[] = [];
    const ok = createPoseChannel<string>((_t, json) => sent.push(json), 1000);
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
    expect(csp).toBe("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'");
    expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+href=|<img|<iframe/i);
  });
  it('carries the model inline and names its licences', () => {
    expect(html.length).toBeGreaterThan(5e6);
    expect(html).toContain('MoveNet SinglePose Lightning');
    expect(html).toContain('Apache-2.0');
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
    expect(native).toContain('onShouldStartLoadWithRequest={(r: { url: string }) => r.url === uri}');
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
