import { Link, Redirect, Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { useApp } from '@/features/app/AppState';
import { useTheme } from '@/ui/useTheme';

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 24 : 21, opacity: focused ? 1 : 0.7 }} importantForAccessibility="no" accessibilityElementsHidden>
      {glyph}
    </Text>
  );
}

export default function TabLayout() {
  const { profile, t } = useApp();
  const c = useTheme();
  if (!profile) return <Redirect href="/onboarding" />;

  const gear = () => (
    <Link href="/parent" asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={t('parent.open')} hitSlop={8} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
        <Text style={{ fontSize: 22 }} importantForAccessibility="no">
          ⚙️
        </Text>
      </Pressable>
    </Link>
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
        headerShadowVisible: false,
        headerRight: gear,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, minHeight: 60 },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        sceneStyle: { backgroundColor: c.background },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tab.today'), tabBarIcon: ({ focused }) => <TabIcon glyph="☀️" focused={focused} /> }} />
      <Tabs.Screen name="week" options={{ title: t('tab.week'), tabBarIcon: ({ focused }) => <TabIcon glyph="🗓️" focused={focused} /> }} />
      <Tabs.Screen name="wardrobe" options={{ title: t('tab.wardrobe'), tabBarIcon: ({ focused }) => <TabIcon glyph="👚" focused={focused} /> }} />
      <Tabs.Screen name="me" options={{ title: t('tab.me'), tabBarIcon: ({ focused }) => <TabIcon glyph="🌟" focused={focused} /> }} />
    </Tabs>
  );
}
