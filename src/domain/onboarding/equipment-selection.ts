/**
 * No-equipment semantics.
 *
 * "Bodyweight only" is a first-class, fully supported answer, not a
 * fallback for people who did not finish the question. Because of that it
 * has to be unambiguous: a selection cannot simultaneously mean "I have
 * no equipment" and "I have a barbell". The seeded `bodyweight` row is
 * the sentinel for that state, and it is mutually exclusive with every
 * other row.
 *
 * The same rule is enforced server-side by the `set_user_equipment` RPC
 * (supabase/migrations/20260725090000_equipment_no_equipment_semantics.sql),
 * which is the only writer of `user_equipment`. This module exists so the
 * UI behaves consistently as the user taps, not so the client can be
 * trusted to get it right.
 */
export const NO_EQUIPMENT_KEY = 'bodyweight';

export type EquipmentChoice = { id: string; key: string };

/**
 * Applies one tap to the current selection.
 *
 *  - selecting "no equipment" replaces the whole selection with itself;
 *  - selecting anything else drops "no equipment" from the selection;
 *  - deselecting simply removes that item.
 */
export function toggleEquipmentSelection(
  options: EquipmentChoice[],
  selectedIds: string[],
  toggledId: string,
): string[] {
  const optionsById = new Map(options.map((option) => [option.id, option]));
  const isNoEquipment = optionsById.get(toggledId)?.key === NO_EQUIPMENT_KEY;

  if (selectedIds.includes(toggledId)) {
    return selectedIds.filter((id) => id !== toggledId);
  }

  if (isNoEquipment) return [toggledId];

  return [...selectedIds.filter((id) => optionsById.get(id)?.key !== NO_EQUIPMENT_KEY), toggledId];
}

/**
 * Resolves an already-persisted selection that is ambiguous (both the
 * sentinel and real equipment marked available — possible for rows
 * written before this rule existed). Real equipment wins: the user
 * demonstrably has some, so "no equipment" is the false half.
 */
export function normaliseEquipmentSelection(
  options: EquipmentChoice[],
  selectedIds: string[],
): string[] {
  const optionsById = new Map(options.map((option) => [option.id, option]));
  const realEquipment = selectedIds.filter((id) => optionsById.get(id)?.key !== NO_EQUIPMENT_KEY);
  return realEquipment.length > 0 ? realEquipment : selectedIds;
}

/** True when the persisted selection genuinely means "no equipment at all". */
export function isNoEquipmentSelection(options: EquipmentChoice[], selectedIds: string[]): boolean {
  const optionsById = new Map(options.map((option) => [option.id, option]));
  return (
    selectedIds.length > 0 &&
    selectedIds.every((id) => optionsById.get(id)?.key === NO_EQUIPMENT_KEY)
  );
}
