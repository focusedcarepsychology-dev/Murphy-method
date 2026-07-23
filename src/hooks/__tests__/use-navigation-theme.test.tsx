import { act, renderHook } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as ReactNative from 'react-native';

import { Colors } from '@/constants/theme';
import { useNavigationTheme } from '@/hooks/use-navigation-theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemePreferenceProvider, useThemePreference } from '@/hooks/use-theme-preference';

function Providers({ children }: PropsWithChildren) {
  return <ThemePreferenceProvider>{children}</ThemePreferenceProvider>;
}

function useCombined() {
  return {
    app: useTheme(),
    navigation: useNavigationTheme(),
    preference: useThemePreference(),
  };
}

describe('useNavigationTheme', () => {
  it('derives navigation colours from the same resolved scheme as app components', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');

    const { result } = await renderHook(() => useCombined(), { wrapper: Providers });

    expect(result.current.navigation.dark).toBe(result.current.app.isDark);
    expect(result.current.navigation.colors.background).toBe(Colors.light.background.default);
    expect(result.current.navigation.colors.card).toBe(Colors.light.surface.raised);
    expect(result.current.navigation.colors.text).toBe(Colors.light.text.primary);
    expect(result.current.navigation.colors.border).toBe(Colors.light.border.default);
    expect(result.current.navigation.colors.primary).toBe(Colors.light.brand.primary);
  });

  it('stays synchronized with a manual theme override, without a separate resolution path', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');

    const { result } = await renderHook(() => useCombined(), { wrapper: Providers });

    await act(async () => {
      result.current.preference.setPreference('dark');
    });

    expect(result.current.app.scheme).toBe('dark');
    expect(result.current.navigation.dark).toBe(true);
    expect(result.current.navigation.colors.background).toBe(Colors.dark.background.default);
    expect(result.current.navigation.colors.card).toBe(Colors.dark.surface.raised);
  });
});
