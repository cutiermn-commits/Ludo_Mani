// Extends app.json. The web build can be served from a sub-path (web/site.json basePath);
// for the own-origin site (D-055) it is the root, so WEB_BASE_URL is not set.
// Native builds are unaffected. VERIFIED: experiments.baseUrl, Expo SDK 58 app config docs.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments ?? {}),
    ...(process.env.WEB_BASE_URL ? { baseUrl: process.env.WEB_BASE_URL } : {}),
  },
});
