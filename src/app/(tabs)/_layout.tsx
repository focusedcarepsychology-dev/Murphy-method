import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { TabBarIcon } from '@/components/ui/tab-bar-icon';
import { useTheme } from '@/hooks/use-theme';

type TabBarLabelProps = { color: ColorValue; focused: boolean };

/**
 * Active tabs are also distinguished by a bolder label — not colour alone —
 * per docs/DESIGN_SYSTEM.md accessibility requirements.
 */
function TabBarLabel({ title, color, focused }: TabBarLabelProps & { title: string }) {
  return <Text style={{ fontSize: 12, fontWeight: focused ? '700' : '500', color }}>{title}</Text>;
}

// Guard (authenticated + onboarding complete, docs/ROUTES.md §3) is Phase 2 —
// there is no session/profile state yet for it to check.
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.surface.raised,
          borderTopColor: colors.border.subtle,
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
