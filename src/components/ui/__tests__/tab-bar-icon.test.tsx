import { screen } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';
import { TabBarIcon } from '@/components/ui/tab-bar-icon';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('TabBarIcon', () => {
  it('shows a filled pill behind the icon when focused', async () => {
    await renderWithProviders(
      <TabBarIcon name="today" color={Colors.light.brand.primary} size={22} focused />,
    );

    const pill = screen.getByTestId('tab-bar-icon-pill');
    expect(pill.props.style.backgroundColor).toBe(Colors.light.brand.primarySubtle);
  });

  it('has no pill fill when not focused, so selection is not colour-only', async () => {
    await renderWithProviders(
      <TabBarIcon name="today" color={Colors.light.text.tertiary} size={22} focused={false} />,
    );

    const pill = screen.getByTestId('tab-bar-icon-pill');
    expect(pill.props.style.backgroundColor).toBe('transparent');
  });
});
