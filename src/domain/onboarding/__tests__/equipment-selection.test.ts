import {
  isNoEquipmentSelection,
  NO_EQUIPMENT_KEY,
  normaliseEquipmentSelection,
  toggleEquipmentSelection,
} from '@/domain/onboarding/equipment-selection';

const OPTIONS = [
  { id: 'e-bodyweight', key: NO_EQUIPMENT_KEY },
  { id: 'e-dumbbell', key: 'dumbbell' },
  { id: 'e-barbell', key: 'barbell' },
  { id: 'e-bench', key: 'bench' },
];

describe('toggleEquipmentSelection', () => {
  it('selecting "no equipment" replaces every other selection', () => {
    const next = toggleEquipmentSelection(OPTIONS, ['e-dumbbell', 'e-bench'], 'e-bodyweight');

    expect(next).toEqual(['e-bodyweight']);
  });

  it('selecting real equipment clears the no-equipment sentinel', () => {
    const next = toggleEquipmentSelection(OPTIONS, ['e-bodyweight'], 'e-dumbbell');

    expect(next).toEqual(['e-dumbbell']);
  });

  it('keeps other real equipment when adding more', () => {
    const next = toggleEquipmentSelection(OPTIONS, ['e-dumbbell'], 'e-bench');

    expect(next).toEqual(['e-dumbbell', 'e-bench']);
  });

  it('deselecting removes only that item', () => {
    const next = toggleEquipmentSelection(OPTIONS, ['e-dumbbell', 'e-bench'], 'e-bench');

    expect(next).toEqual(['e-dumbbell']);
  });

  it('deselecting the last item leaves an empty selection, not a silent fallback', () => {
    expect(toggleEquipmentSelection(OPTIONS, ['e-bodyweight'], 'e-bodyweight')).toEqual([]);
  });
});

describe('normaliseEquipmentSelection', () => {
  it('resolves a legacy ambiguous row in favour of the real equipment', () => {
    expect(normaliseEquipmentSelection(OPTIONS, ['e-bodyweight', 'e-barbell'])).toEqual([
      'e-barbell',
    ]);
  });

  it('leaves a genuine bodyweight-only selection alone', () => {
    expect(normaliseEquipmentSelection(OPTIONS, ['e-bodyweight'])).toEqual(['e-bodyweight']);
  });
});

describe('isNoEquipmentSelection', () => {
  it('is true only for a selection that is exactly the sentinel', () => {
    expect(isNoEquipmentSelection(OPTIONS, ['e-bodyweight'])).toBe(true);
    expect(isNoEquipmentSelection(OPTIONS, ['e-bodyweight', 'e-dumbbell'])).toBe(false);
    expect(isNoEquipmentSelection(OPTIONS, ['e-dumbbell'])).toBe(false);
  });

  it('is false for an empty selection (no answer is not the same as no equipment)', () => {
    expect(isNoEquipmentSelection(OPTIONS, [])).toBe(false);
  });
});
