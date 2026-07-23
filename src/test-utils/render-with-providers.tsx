import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemePreferenceProvider } from '@/hooks/use-theme-preference';

/** @testing-library/react-native v14 renders asynchronously — always `await`. */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(<ThemePreferenceProvider>{ui}</ThemePreferenceProvider>, options);
}
