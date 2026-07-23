import { screen } from '@testing-library/react-native';

import { StatusBadge } from '@/components/ui/status-badge';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('StatusBadge', () => {
  it('always pairs its tone with a visible text label, never colour alone', async () => {
    await renderWithProviders(<StatusBadge label="Completed" tone="positive" />);

    expect(screen.getByText('Completed')).toBeTruthy();
  });
});
