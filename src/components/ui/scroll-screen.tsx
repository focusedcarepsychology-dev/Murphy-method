import type { PropsWithChildren } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export type ScrollScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
}>;

const defaultEdges: readonly Edge[] = ['top', 'left', 'right'];

/** Scrolling screen shell: safe area + semantic background + gap rhythm. */
export function ScrollScreen({
  children,
  style,
  contentContainerStyle,
  edges = defaultEdges,
  refreshing,
  onRefresh,
}: ScrollScreenProps) {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: colors.background.default }, style]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          {
            padding: spacing.four,
            gap: spacing.four,
            paddingBottom: spacing.six,
          },
          contentContainerStyle,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing ?? false}
              onRefresh={onRefresh}
              tintColor={colors.brand.primary}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
