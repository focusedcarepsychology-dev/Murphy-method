import { fireEvent, screen } from '@testing-library/react-native';

import { IconButton, PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('PrimaryButton', () => {
  it('renders its label and fires onPress', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<PrimaryButton label="Start Workout" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Start Workout' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<PrimaryButton label="Start Workout" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByRole('button', { name: 'Start Workout' }));

    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('SecondaryButton', () => {
  it('renders its label', async () => {
    await renderWithProviders(<SecondaryButton label="Quick · 20 min" onPress={() => {}} />);

    expect(screen.getByText('Quick · 20 min')).toBeTruthy();
  });
});

describe('IconButton', () => {
  it('exposes its accessibility label', async () => {
    await renderWithProviders(
      <IconButton icon="close" accessibilityLabel="Stop workout" onPress={() => {}} />,
    );

    expect(screen.getByLabelText('Stop workout')).toBeTruthy();
  });
});
