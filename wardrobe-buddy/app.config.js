// Extends app.json. The web build is served from a sub-path on GitHub Pages
// (/Ludo_Mani/wardrobe), set by scripts/build-web.mjs through WEB_BASE_URL.
// Native builds are unaffected. VERIFIED: experiments.baseUrl, Expo SDK 58 app config docs.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments ?? {}),
    ...(process.env.WEB_BASE_URL ? { baseUrl: process.env.WEB_BASE_URL } : {}),
  },
});
