import { fireEvent, screen } from '@testing-library/react-native';

import { ValueSlider } from '@/components/ui/value-slider';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('ValueSlider', () => {
  it('supports screen-reader increment actions', async () => {
    const onChange = jest.fn();

    await renderWithProviders(
      <ValueSlider
        accessibilityLabel="Later photo visibility"
        value={0.5}
        min={0.1}
        max={0.9}
        step={0.05}
        onChange={onChange}
      />,
    );

    fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });

    expect(onChange).toHaveBeenCalledWith(0.55);
  });
});
