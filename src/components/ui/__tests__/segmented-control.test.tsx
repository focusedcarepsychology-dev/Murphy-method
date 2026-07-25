import { fireEvent, screen } from '@testing-library/react-native';

import { SegmentedControl } from '@/components/ui/segmented-control';
import { selectionFeedback } from '@/services/feedback/haptics';
import { renderWithProviders } from '@/test-utils/render-with-providers';

jest.mock('@/services/feedback/haptics', () => ({
  selectionFeedback: jest.fn().mockResolvedValue(undefined),
}));

describe('SegmentedControl', () => {
  it('announces the selected option and changes selection with restrained feedback', async () => {
    const onChange = jest.fn();

    await renderWithProviders(
      <SegmentedControl
        accessibilityLabel="Choose mode"
        options={[
          { value: 'full', label: 'Full' },
          { value: 'quick', label: 'Quick' },
        ]}
        value="full"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Full' }).props.accessibilityState).toEqual({
      selected: true,
    });

    await fireEvent.press(screen.getByRole('tab', { name: 'Quick' }));

    expect(selectionFeedback).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('quick');
  });
});
