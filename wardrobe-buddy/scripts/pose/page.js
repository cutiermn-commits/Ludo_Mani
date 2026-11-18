// Runs inside the offline pose page (assets/pose/pose.html), built by scripts/build-pose.mjs (D-064).
// MoveNet SinglePose Lightning on TensorFlow.js' plain-JavaScript CPU backend. The model is inlined
// in the page, and the page's Content-Security-Policy blocks every network request.
// Protocol (JSON messages):
//   in : { id, input }   input = base64 of 192×192×3 RGB bytes (already letterboxed by the app)
//   out: { type: 'ready' } once the model is loaded
//        { id, ok: true, keypoints: number[51] }   17 × (y, x, score), 0–1 of the 192 square
//        { id, ok: false, error }
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import { loadGraphModel } from '@tensorflow/tfjs-converter';

import { MODEL_B64, MODEL_JSON } from './.model.generated.js';

const SIZE = 192;

function b64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function send(msg) {
  const text = JSON.stringify(msg);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
  else if (window.parent && window.parent !== window) window.parent.postMessage(text, '*'); // the app checks the source frame
}

const modelReady = (async () => {
  await tf.setBackend('cpu');
  const j = JSON.parse(MODEL_JSON);
  const bin = b64ToBytes(MODEL_B64);
  const weightSpecs = j.weightsManifest.flatMap((m) => m.weights);
  return loadGraphModel(tf.io.fromMemory({ modelTopology: j.modelTopology, weightSpecs, weightData: bin.buffer }));
})();

async function run(msg) {
  try {
    const model = await modelReady;
    const bytes = b64ToBytes(msg.input);
    if (bytes.length !== SIZE * SIZE * 3) throw new Error('bad input size');
    const out = tf.tidy(() => model.execute(tf.tensor(Int32Array.from(bytes), [1, SIZE, SIZE, 3], 'int32')));
    const keypoints = Array.from(await out.data());
    out.dispose();
    send({ id: msg.id, ok: true, keypoints });
  } catch (e) {
    send({ id: msg.id, ok: false, error: String((e && e.message) || e) });
  }
}

// Native: the app calls window.wbPose(json). Web: the app posts the json to this frame.
window.wbPose = (text) => run(typeof text === 'string' ? JSON.parse(text) : text);
window.addEventListener('message', (e) => {
  if (e.source !== window.parent || typeof e.data !== 'string') return;
  try {
    run(JSON.parse(e.data));
  } catch {
    /* not ours */
  }
});

modelReady.then(
  () => send({ type: 'ready' }),
  (e) => send({ type: 'failed', error: String((e && e.message) || e) }),
);
