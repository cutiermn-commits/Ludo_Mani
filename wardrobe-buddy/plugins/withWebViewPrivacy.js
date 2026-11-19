// Android: stop the system WebView from uploading anonymous diagnostics to Google (privacy audit
// 2026-11-18, D-064). VERIFIED: developer.android.com "Managing WebView objects" → "Opt out of
// metrics collection": <meta-data android:name="android.webkit.WebView.MetricsOptOut" android:value="true" />.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const KEY = 'android.webkit.WebView.MetricsOptOut';

function withWebViewPrivacy(config) {
  return withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, KEY, 'true');
    return c;
  });
}

module.exports = withWebViewPrivacy;
module.exports.KEY = KEY;
