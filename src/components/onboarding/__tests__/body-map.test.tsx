import { fireEvent, screen } from '@testing-library/react-native';

import { BodyMap } from '@/components/onboarding/body-map';
import { previewBodyAreas } from '@/dev/previewData';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('BodyMap', () => {
  it('reports the checked state for a selected region', async () => {
    await renderWithProviders(
      <BodyMap
        view="front"
        areas={previewBodyAreas}
        selectedIds={['chest']}
        onToggle={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Chest').props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByLabelText('Shoulders').props.accessibilityState).toEqual({ checked: false });
  });

  it('toggles the same id whether the left or right hit-area for a bilateral region is pressed', async () => {
    const onToggle = jest.fn();
    await renderWithProviders(
      <BodyMap view="front" areas={previewBodyAreas} selectedIds={[]} onToggle={onToggle} />,
    );

    const armHitAreas = screen.getAllByLabelText('Arms');
    expect(armHitAreas).toHaveLength(2);

    await fireEvent.press(armHitAreas[0]);
    await fireEvent.press(armHitAreas[1]);

    expect(onToggle).toHaveBeenNthCalledWith(1, 'arms');
    expect(onToggle).toHaveBeenNthCalledWith(2, 'arms');
  });

  it('exposes the back view regions when switched to back', async () => {
    await renderWithProviders(
      <BodyMap
        view="back"
        areas={previewBodyAreas}
        selectedIds={['glutes']}
        onToggle={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Glutes').props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByLabelText('Upper back / lats')).toBeTruthy();
    expect(screen.queryByLabelText('Chest')).toBeNull();
  });
});
