import { fireEvent, screen } from '@testing-library/react-native';

import { SelectionCard } from '@/components/ui/selection-card';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('SelectionCard', () => {
  it('reflects selected state via accessibilityState and calls onPress on tap', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <SelectionCard label="Build muscle" selected={false} onPress={onPress} />,
    );

    const card = screen.getByRole('checkbox', { name: 'Build muscle' });
    expect(card.props.accessibilityState.checked).toBe(false);

    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks itself checked when selected', async () => {
    await renderWithProviders(<SelectionCard label="Get stronger" selected onPress={() => {}} />);

    const card = screen.getByRole('checkbox', { name: 'Get stronger' });
    expect(card.props.accessibilityState.checked).toBe(true);
  });
});
