import { fireEvent, screen } from '@testing-library/react-native';

import { BodyMap } from '@/components/onboarding/body-map';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('BodyMap', () => {
  it('reports the checked state for a selected region', async () => {
    await renderWithProviders(
      <BodyMap view="front" selectedKeys={['chest']} onToggle={jest.fn()} />,
    );

    expect(screen.getByLabelText('Chest').props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByLabelText('Shoulders').props.accessibilityState).toEqual({ checked: false });
  });

  it('toggles the same key whether the left or right hit-area for a bilateral region is pressed', async () => {
    const onToggle = jest.fn();
    await renderWithProviders(<BodyMap view="front" selectedKeys={[]} onToggle={onToggle} />);

    const bicepsHitAreas = screen.getAllByLabelText('Biceps');
    expect(bicepsHitAreas).toHaveLength(2);

    await fireEvent.press(bicepsHitAreas[0]);
    await fireEvent.press(bicepsHitAreas[1]);

    expect(onToggle).toHaveBeenNthCalledWith(1, 'biceps');
    expect(onToggle).toHaveBeenNthCalledWith(2, 'biceps');
  });

  it('exposes the back view regions when switched to back', async () => {
    await renderWithProviders(
      <BodyMap view="back" selectedKeys={['glutes']} onToggle={jest.fn()} />,
    );

    expect(screen.getByLabelText('Glutes').props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByLabelText('Upper back')).toBeTruthy();
    expect(screen.queryByLabelText('Chest')).toBeNull();
  });
});
