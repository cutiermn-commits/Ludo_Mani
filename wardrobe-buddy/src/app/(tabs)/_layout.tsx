import { Link, Redirect, Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useApp } from '@/features/app/AppState';
import { useShapeUpgrade } from '@/features/fit/useShapeUpgrade';
import { useTheme } from '@/ui/useTheme';

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  const c = useTheme();
  return (
    <View style={{ minWidth: 52, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? c.primarySoft : 'transparent' }}>
      <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.75 }} importantForAccessibility="no" accessibilityElementsHidden>
        {glyph}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { profile, t } = useApp();
  const c = useTheme();
  useShapeUpgrade();
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
        tabBarStyle: { backgroundColor: c.surface, borderTopWidth: 0, minHeight: 66, paddingTop: 6, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: `0 -4px 16px ${c.dark ? 'rgba(0,0,0,0.4)' : 'rgba(60, 30, 90, 0.10)'}` },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '800' },
        sceneStyle: { backgroundColor: c.background },
      }}>
      {/* Her three simple steps (D-061): 1 me, 2 my wardrobe, 3 my day. */}
      <Tabs.Screen name="me" options={{ title: t('tab.me'), tabBarIcon: ({ focused }) => <TabIcon glyph="🌟" focused={focused} /> }} />
      <Tabs.Screen name="wardrobe" options={{ title: t('tab.wardrobe'), tabBarIcon: ({ focused }) => <TabIcon glyph="👚" focused={focused} /> }} />
      <Tabs.Screen name="index" options={{ title: t('tab.today'), tabBarIcon: ({ focused }) => <TabIcon glyph="☀️" focused={focused} /> }} />
    </Tabs>
  );
}
