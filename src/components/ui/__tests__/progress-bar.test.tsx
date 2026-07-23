import { screen } from '@testing-library/react-native';

import { ProgressBar } from '@/components/ui/progress-bar';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('ProgressBar', () => {
  it('clamps its accessibility value between 0 and 100', async () => {
    await renderWithProviders(<ProgressBar value={1.4} accessibilityLabel="Momentum" />);

    const bar = screen.getByLabelText('Momentum');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100 });
  });

  it('reports a mid-range value correctly', async () => {
    await renderWithProviders(<ProgressBar value={0.75} accessibilityLabel="Weekly progress" />);

    const bar = screen.getByLabelText('Weekly progress');
    expect(bar.props.accessibilityValue.now).toBe(75);
  });
});
