# MoveNet SinglePose Lightning (vendored)

Used only on the device, inside the offline pose page `assets/pose/pose.html` (D-064).

- Model: MoveNet SinglePose Lightning v4 by Google, https://tfhub.dev/google/movenet/singlepose/lightning/4 , licence Apache-2.0.
- TF.js graph conversion: `@vladmandic/human-models` 3.0.4 (`models/movenet-lightning.json` + `.bin`), licence MIT (see `LICENSE-conversion-MIT`).
- Runtime bundled with it: TensorFlow.js 4.22.0 (`tfjs-core`, `tfjs-backend-cpu`, `tfjs-converter`), licence Apache-2.0.
- Checksums (sha256): json `df8cbde44d00f533ccc4916a7c6ebc17316532fb3fadad114ec667fef22872e9`, bin `bf97bc10d9c8a11200b0190ed64ce039b6252f1aff7cb552aca99b3d191c2f34`.

Rebuild the page after changing anything here: `npm run build:pose`.
Before a store release, the app's "about/licences" text must credit these (Apache-2.0 §4 attribution); see docs/RELEASE_CHECKLIST.md.
