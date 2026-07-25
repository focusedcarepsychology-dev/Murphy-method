import { useEffect, useState } from 'react';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  View,
  type ColorValue,
} from 'react-native';

import { TabBarIcon } from '@/components/ui/tab-bar-icon';
import { useTheme } from '@/hooks/use-theme';

type TabBarLabelProps = { color: ColorValue; focused: boolean };

function TabBarLabel({ title, color, focused }: TabBarLabelProps & { title: string }) {
  return <Text style={{ fontSize: 12, fontWeight: focused ? '700' : '500', color }}>{title}</Text>;
}

function TabBarMaterial() {
  const { colors, scheme } = useTheme();
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );
    return () => subscription.remove();
  }, []);

  const glassAvailable =
    Platform.OS === 'ios' &&
    !reduceTransparency &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable();

  if (glassAvailable) {
    return (
      <GlassView
        style={StyleSheet.absoluteFill}
        glassEffectStyle="regular"
        colorScheme={scheme}
        tintColor={colors.surface.raised}
      />
    );
  }

  return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface.raised }]} />;
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => <TabBarMaterial />,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarLabel: ({ color, focused }: TabBarLabelProps) => (
            <TabBarLabel title="Today" color={color} focused={focused} />
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="today" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarLabel: ({ color, focused }: TabBarLabelProps) => (
            <TabBarLabel title="Plan" color={color} focused={focused} />
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="plan" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarLabel: ({ color, focused }: TabBarLabelProps) => (
            <TabBarLabel title="Progress" color={color} focused={focused} />
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="progress" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarLabel: ({ color, focused }: TabBarLabelProps) => (
            <TabBarLabel title="Coach" color={color} focused={focused} />
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="coach" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: ({ color, focused }: TabBarLabelProps) => (
            <TabBarLabel title="Profile" color={color} focused={focused} />
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="profile" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
