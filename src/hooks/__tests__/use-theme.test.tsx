import { act, renderHook } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as ReactNative from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { ThemePreferenceProvider, useThemePreference } from '@/hooks/use-theme-preference';

function Providers({ children }: PropsWithChildren) {
  return <ThemePreferenceProvider>{children}</ThemePreferenceProvider>;
}

function useThemeAndPreference() {
  return { theme: useTheme(), preference: useThemePreference() };
}

describe('useTheme', () => {
  it('follows the system colour scheme when preference is "system"', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    const { result } = await renderHook(() => useThemeAndPreference(), { wrapper: Providers });

    expect(result.current.theme.scheme).toBe('dark');
    expect(result.current.theme.isDark).toBe(true);
  });

  it('overrides the system colour scheme once a manual preference is set', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    const { result } = await renderHook(() => useThemeAndPreference(), { wrapper: Providers });

    await act(async () => {
      result.current.preference.setPreference('light');
    });

    expect(result.current.theme.scheme).toBe('light');
    expect(result.current.theme.isDark).toBe(false);
  });

  it('returns to the system value when preference is set back to "system"', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    const { result } = await renderHook(() => useThemeAndPreference(), { wrapper: Providers });

    await act(async () => {
      result.current.preference.setPreference('light');
    });
    await act(async () => {
      result.current.preference.setPreference('system');
    });

    expect(result.current.theme.scheme).toBe('dark');
  });
});
