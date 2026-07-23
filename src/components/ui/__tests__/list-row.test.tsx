import { fireEvent, screen } from '@testing-library/react-native';

import { SettingRow, ToggleRow } from '@/components/ui/list-row';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('SettingRow', () => {
  it('fires onPress when tapped', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<SettingRow title="Notifications" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Notifications' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ToggleRow', () => {
  it('reports its current value and calls onValueChange', async () => {
    const onValueChange = jest.fn();
    await renderWithProviders(
      <ToggleRow title="Workout reminders" value={false} onValueChange={onValueChange} />,
    );

    const toggle = screen.getByLabelText('Workout reminders');
    await fireEvent(toggle, 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
