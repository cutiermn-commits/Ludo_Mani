import { Asset } from 'expo-asset';
import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode, type Ref } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import { bytesToBase64 } from '@/domain/image/base64';

import { createPoseChannel, PoseContext, type RunPose } from './types';

/** The library types WebView as a plain function component; its ref (injectJavaScript) is real. */
type WebViewHandle = { injectJavaScript: (script: string) => void };
const HiddenWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

/**
 * Only local files may load in the hidden view: never a web address. (An exact match on the URI
 * could fail if the platform normalises it; NOT VERIFIED on a device, architecture review.)
 */
export const isLocalFile = (url: string) => /^file:\/\//i.test(url);

/** How long the hidden page stays loaded after the last use (it holds ~25 MB of model in memory). ASSUMPTION. */
const IDLE_MS = 20000;

/**
 * Phones: the offline pose page in a hidden WebView, loaded only while a photo is being checked
 * (D-064). The WebView's JavaScript engine has a JIT, so MoveNet takes seconds instead of the
 * ~15–40 s it would take on the app's own engine (measured in a JIT-less run, 2026-11-18).
 * The page is a bundled file: it loads nothing else and its CSP blocks all network requests;
 * navigation to anything but a local file is refused here as well.
 * NOT VERIFIED on a device yet: that `Asset.loadAsync` gives a `file://` copy in a release APK, and
 * the time to load the 6.8 MB page on a mid-range Android (D-064).
 */
export function PoseProvider({ children }: { children: ReactNode }) {
  const [uri, setUri] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Created once; the WebView attaches itself through its callback ref after mounting.
  const [channel] = useState(() => createPoseChannel<WebViewHandle>((view, json) => view.injectJavaScript(`window.wbPose(${JSON.stringify(json)});true;`)));

  useEffect(
    () => () => {
      if (idle.current) clearTimeout(idle.current);
      channel.reset();
    },
    [channel],
  );

  const run: RunPose = useCallback(
    async (input) => {
      if (idle.current) clearTimeout(idle.current);
      let local = uri;
      if (!local) {
        // A bundled asset: copied out of the app package, never fetched from a server in release builds.
        const [asset] = await Asset.loadAsync(require('@/assets/pose/pose.html'));
        local = asset.localUri ?? asset.uri;
        setUri(local);
      }
      setActive(true);
      try {
        return await channel.run(bytesToBase64(input));
      } finally {
        // Unload the page (and its model memory) once nothing has used it for a while.
        const close = () => {
          if (channel.busy) {
            idle.current = setTimeout(close, IDLE_MS);
            return;
          }
          setActive(false);
          channel.reset();
        };
        if (idle.current) clearTimeout(idle.current);
        idle.current = setTimeout(close, IDLE_MS);
      }
    },
    [channel, uri],
  );

  return (
    <PoseContext.Provider value={run}>
      {children}
      {active && uri && (
        <View pointerEvents="none" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }} importantForAccessibility="no-hide-descendants">
          <HiddenWebView
            ref={(v: WebViewHandle | null) => channel.attach(v)}
            source={{ uri }}
            originWhitelist={['file://*']}
            onShouldStartLoadWithRequest={(r: { url: string }) => isLocalFile(r.url)}
            allowFileAccess
            allowingReadAccessToURL={uri}
            javaScriptEnabled
            cacheEnabled={false}
            incognito
            setSupportMultipleWindows={false}
            onMessage={(e: WebViewMessageEvent) => channel.receive(e.nativeEvent.data)}
            onContentProcessDidTerminate={() => {
              channel.reset();
              setActive(false);
            }}
            onRenderProcessGone={() => {
              channel.reset();
              setActive(false);
            }}
            style={{ width: 1, height: 1 }}
          />
        </View>
      )}
    </PoseContext.Provider>
  );
}
