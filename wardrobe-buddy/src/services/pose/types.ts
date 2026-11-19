import { createContext, useContext } from 'react';

/**
 * Runs MoveNet on one 192×192×3 RGB input inside the offline pose page and returns the raw
 * 51 numbers (D-064). Implemented by PoseProvider: a hidden WebView on phones, a sandboxed
 * iframe in the browser. The page has no network access (CSP default-src 'none').
 */
export type RunPose = (input: Uint8Array) => Promise<number[]>;

export const PoseContext = createContext<RunPose | null>(null);

export function useRunPose(): RunPose {
  const run = useContext(PoseContext);
  if (!run) throw new Error('usePose outside PoseProvider');
  return run;
}

/**
 * Shared message handling for both hosts: one request at a time is fine (a photo every few minutes).
 * `send(target, json)` delivers to the page; the host attaches the page (WebView or iframe) when it mounts.
 */
/** ASSUMPTION starting values: long enough for a slow phone, short enough that she isn't left waiting. */
export const POSE_TIMEOUTS = { readyMs: 15000, runMs: 20000 } as const;

export function createPoseChannel<Target>(send: (target: Target, json: string) => void, runMs: number = POSE_TIMEOUTS.runMs, readyMs: number = POSE_TIMEOUTS.readyMs) {
  let target: Target | null = null;
  let seq = 0;
  const pending = new Map<number, { resolve: (kp: number[]) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  let readyResolve: (() => void) | null = null;
  let readyReject: ((e: Error) => void) | null = null;
  let ready = new Promise<void>((res, rej) => {
    readyResolve = res;
    readyReject = rej;
  });
  ready.catch(() => undefined);

  return {
    attach(t: Target | null) {
      target = t;
    },
    get target() {
      return target;
    },
    /** Feed every message string the page sends. Ignores anything that isn't ours. */
    receive(text: unknown) {
      if (typeof text !== 'string') return;
      let msg: { type?: string; id?: number; ok?: boolean; keypoints?: number[]; error?: string };
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }
      if (msg.type === 'ready') return readyResolve?.();
      if (msg.type === 'failed') return readyReject?.(new Error(msg.error ?? 'pose model failed'));
      const p = typeof msg.id === 'number' ? pending.get(msg.id) : undefined;
      if (!p) return;
      pending.delete(msg.id!);
      clearTimeout(p.timer);
      if (msg.ok && Array.isArray(msg.keypoints)) p.resolve(msg.keypoints);
      else p.reject(new Error(msg.error ?? 'pose failed'));
    },
    async run(inputB64: string): Promise<number[]> {
      // A page that never loads must not hang the app.
      let wait: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([ready, new Promise<never>((_, rej) => (wait = setTimeout(() => rej(new Error('pose page did not load')), readyMs)))]);
      } finally {
        clearTimeout(wait);
      }
      const id = ++seq;
      return new Promise<number[]>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error('pose timeout'));
        }, runMs);
        pending.set(id, { resolve, reject, timer });
        if (!target) {
          pending.delete(id);
          clearTimeout(timer);
          return reject(new Error('pose page not attached'));
        }
        send(target, JSON.stringify({ id, input: inputB64 }));
      });
    },
    /** The page went away (unmounted or reloaded): fail what's waiting and wait for a new "ready". */
    reset() {
      for (const p of pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error('pose page closed'));
      }
      pending.clear();
      ready = new Promise<void>((res, rej) => {
        readyResolve = res;
        readyReject = rej;
      });
      ready.catch(() => undefined);
    },
    get busy() {
      return pending.size > 0;
    },
  };
}
