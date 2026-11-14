// Extends app.json. The web build can be served from a sub-path (GitHub Pages: /ludo_mani/play),
// set by scripts/build-web.mjs through WEB_BASE_URL. Native builds are unaffected.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments ?? {}),
    ...(process.env.WEB_BASE_URL ? { baseUrl: process.env.WEB_BASE_URL } : {}),
  },
});
