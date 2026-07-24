/**
 * Canonical Interactive Body Goal Map regions (`MASTER_SPEC.md` §7.1,
 * `DATABASE_SCHEMA.md` §2 `body_area_goals.body_area_key` check constraint —
 * supabase/migrations/20260723090700_body_area_goals.sql). This is the one
 * place the 13-key list is defined on the client; the body map, the
 * accessible list-selector, and the screen all read it from here rather
 * than each hard-coding a second copy that could drift from the database
 * constraint.
 */
export type BodyAreaKey =
  | 'shoulders'
  | 'chest'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'upper_back'
  | 'lats'
  | 'core'
  | 'waist_appearance'
  | 'glutes'
  | 'quadriceps'
  | 'hamstrings'
  | 'calves';

export type BodyAreaOption = {
  key: BodyAreaKey;
  label: string;
  view: 'front' | 'back';
};

/** Order matches the database check constraint's listed order. */
export const BODY_AREA_OPTIONS: BodyAreaOption[] = [
  { key: 'shoulders', label: 'Shoulders', view: 'front' },
  { key: 'chest', label: 'Chest', view: 'front' },
  { key: 'biceps', label: 'Biceps', view: 'front' },
  { key: 'triceps', label: 'Triceps', view: 'front' },
  { key: 'forearms', label: 'Forearms', view: 'front' },
  { key: 'upper_back', label: 'Upper back', view: 'back' },
  { key: 'lats', label: 'Lats', view: 'back' },
  { key: 'core', label: 'Core', view: 'front' },
  { key: 'waist_appearance', label: 'Waist', view: 'front' },
  { key: 'glutes', label: 'Glutes', view: 'back' },
  { key: 'quadriceps', label: 'Quadriceps', view: 'front' },
  { key: 'hamstrings', label: 'Hamstrings', view: 'back' },
  { key: 'calves', label: 'Calves', view: 'back' },
];

export const BODY_AREA_KEYS: BodyAreaKey[] = BODY_AREA_OPTIONS.map((option) => option.key);

export function isBodyAreaKey(value: string): value is BodyAreaKey {
  return (BODY_AREA_KEYS as string[]).includes(value);
}
