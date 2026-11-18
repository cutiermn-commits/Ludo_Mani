import * as fs from 'fs';
import * as path from 'path';

/**
 * Store-release gates that are open on purpose during the owner's test period. These tests keep
 * the blockers written down, so nobody ships them by accident.
 */
jest.mock('expo-image-manipulator', () => ({}));
jest.mock('expo-image-picker', () => ({}));

const ROOT = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('release gates', () => {
  it('while her full-body photo is stored unblurred (D-063), the release blocker stays open', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BODY_PHOTO_BLURRED } = require('@/services/photos/selfie');
    if (BODY_PHOTO_BLURRED) return;
    expect(read('docs/RELEASE_CHECKLIST.md')).toMatch(/BLOCKER \(D-063\)/);
    expect(read('.claude/skills/release-checklist/SKILL.md')).toMatch(/D-063 blocker/);
    expect(read('docs/legal/privacy-parents.en.md')).toMatch(/NOT blurred/);
  });

  it('the WebView diagnostics opt-out is configured for Android (D-064, privacy audit)', () => {
    const app = JSON.parse(read('app.json'));
    expect(app.expo.plugins).toContain('./plugins/withWebViewPrivacy');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const plugin = require('../../plugins/withWebViewPrivacy');
    expect(plugin.KEY).toBe('android.webkit.WebView.MetricsOptOut');
  });

  it('permission texts make no promise the app no longer keeps', () => {
    const app = read('app.json');
    expect(app).not.toMatch(/face is blurred/i);
  });
});
