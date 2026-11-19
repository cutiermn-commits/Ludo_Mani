import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { AppProvider, useApp } from '@/features/app/AppState';
import { PoseProvider } from '@/services/pose/PoseProvider';
import { useTheme } from '@/ui/useTheme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack() {
  const { ready, t } = useApp();
  const c = useTheme();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.background).catch(() => undefined);
  }, [c.background]);

  if (!ready) return null;
  return (
    <>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.background },
          headerTintColor: c.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="item/[id]" options={{ presentation: 'modal', title: t('item.title') }} />
        <Stack.Screen name="parent" options={{ title: t('parent.title') }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <PoseProvider>
        <RootStack />
      </PoseProvider>
    </AppProvider>
  );
}
