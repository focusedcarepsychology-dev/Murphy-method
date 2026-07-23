import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export type ScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
  padded?: boolean;
}>;

const defaultEdges: readonly Edge[] = ['top', 'left', 'right'];

/** Non-scrolling screen shell: safe area + semantic background. */
export function Screen({ children, style, edges = defaultEdges, padded = true }: ScreenProps) {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: colors.background.default }]}
    >
      <View style={[styles.flex, padded && { paddingHorizontal: spacing.four }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
