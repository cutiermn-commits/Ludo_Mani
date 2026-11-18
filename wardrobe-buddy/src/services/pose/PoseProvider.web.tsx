import { Asset } from 'expo-asset';
import { createElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { bytesToBase64 } from '@/domain/image/base64';

import { createPoseChannel, PoseContext, type RunPose } from './types';

const IDLE_MS = 20000;

/**
 * Browser: the same offline pose page in a hidden, sandboxed iframe (scripts only, no same-origin
 * access to the app's storage), loaded only while a photo is being checked (D-064). The page's
 * CSP blocks all network requests. Messages are accepted only from that frame.
 */
export function PoseProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Created once; the iframe attaches itself through its callback ref after mounting.
  const [src] = useState(() => Asset.fromModule(require('@/assets/pose/pose.html')).uri);
  const [channel] = useState(() => createPoseChannel<HTMLIFrameElement>((frame, json) => frame.contentWindow?.postMessage(json, '*')));

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const frame = channel.target;
      if (frame && e.source === frame.contentWindow) channel.receive(e.data);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (idle.current) clearTimeout(idle.current);
      channel.reset();
    };
  }, [channel]);

  const run: RunPose = useCallback(
    async (input) => {
      if (idle.current) clearTimeout(idle.current);
      setActive(true);
      try {
        return await channel.run(bytesToBase64(input));
      } finally {
        idle.current = setTimeout(() => {
          if (channel.busy) return;
          setActive(false);
          channel.reset();
        }, IDLE_MS);
      }
    },
    [channel],
  );

  return (
    <PoseContext.Provider value={run}>
      {children}
      {active &&
        createElement('iframe', {
          ref: (el: HTMLIFrameElement | null) => channel.attach(el),
          src,
          title: 'pose',
          sandbox: 'allow-scripts',
          referrerPolicy: 'no-referrer',
          'aria-hidden': true,
          tabIndex: -1,
          style: { position: 'absolute', width: 1, height: 1, opacity: 0, border: 0, pointerEvents: 'none' },
        })}
    </PoseContext.Provider>
  );
}
