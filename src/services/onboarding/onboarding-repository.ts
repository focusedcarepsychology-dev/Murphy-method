/**
 * Onboarding domain service (docs/IMPLEMENTATION_PLAN.md Phase 3 §2).
 * Every Supabase call onboarding screens make goes through this module —
 * screens never call `supabase.from(...)`/`supabase.rpc(...)` directly, so
 * there is one place that knows the actual table/RPC shapes.
 *
 * Simple owner-scoped CRUD (profile fields, goals, equipment, measurements,
 * consent) goes straight to RLS-protected tables. Anything that needs
 * cross-row atomicity or must not trust client-derived values (goal
 * priority replacement, safety-screening rule derivation, onboarding
 * completion) calls a `security definer` Postgres RPC instead
 * (`ARCHITECTURE.md` §6's "privilege escalation or cross-cutting domain
 * logic" rule — see `docs/DECISIONS.md` for why this phase uses RPCs
 * rather than Edge Functions for those three operations).
 */
import type { MurphySupabaseClient } from '@/services/supabase/client';
import type { TablesUpdate } from '@/types/database';
import type {
  CoachingStyle,
  OnboardingSnapshot,
  TrainingExperience,
  UnitPreference,
} from '@/domain/onboarding/types';
import type { BodyAreaKey } from '@/domain/onboarding/body-areas';
import type { SafetyScreeningAnswers } from '@/domain/onboarding/safety-screening';
import { SAFETY_SCREENING_VERSION } from '@/domain/onboarding/safety-screening';

export class OnboardingRepositoryError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'OnboardingRepositoryError';
    this.cause = cause;
  }
}

function fail(action: string, error: unknown): never {
  throw new OnboardingRepositoryError(
    `Couldn't ${action}. Check your connection and try again.`,
    error,
  );
}

// --- Profile -----------------------------------------------------------

export type ProfileFields = {
  displayName: string | null;
  dateOfBirth: string | null;
  heightCm: number | null;
  unitPreference: UnitPreference;
  trainingExperience: TrainingExperience | null;
  availableTrainingDays: string[] | null;
  preferredSessionDurationMinutes: number | null;
  coachingStyle: CoachingStyle | null;
  timezone: string;
  onboardingCompletedAt: string | null;
};

export async function loadProfile(
  client: MurphySupabaseClient,
  userId: string,
): Promise<ProfileFields> {
  const { data, error } = await client
    .from('profiles')
    .select(
      'display_name, date_of_birth, height_cm, unit_preference, training_experience, available_training_days, preferred_session_duration_minutes, coaching_style, timezone, onboarding_completed_at',
    )
    .eq('id', userId)
    .single();
  if (error) fail('load your profile', error);
  return {
    displayName: data.display_name,
    dateOfBirth: data.date_of_birth,
    heightCm: data.height_cm,
    unitPreference: data.unit_preference,
    trainingExperience: data.training_experience,
    availableTrainingDays: data.available_training_days,
    preferredSessionDurationMinutes: data.preferred_session_duration_minutes,
    coachingStyle: data.coaching_style,
    timezone: data.timezone,
    onboardingCompletedAt: data.onboarding_completed_at,
  };
}

export type ProfilePatch = Partial<{
  displayName: string | null;
  dateOfBirth: string;
  heightCm: number;
  unitPreference: UnitPreference;
  trainingExperience: TrainingExperience;
  availableTrainingDays: string[];
  preferredSessionDurationMinutes: number;
  coachingStyle: CoachingStyle;
  timezone: string;
}>;

export async function updateProfile(
  client: MurphySupabaseClient,
  userId: string,
  patch: ProfilePatch,
): Promise<void> {
  const row: TablesUpdate<'profiles'> = {};
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.dateOfBirth !== undefined) row.date_of_birth = patch.dateOfBirth;
  if (patch.heightCm !== undefined) row.height_cm = patch.heightCm;
  if (patch.unitPreference !== undefined) row.unit_preference = patch.unitPreference;
  if (patch.trainingExperience !== undefined) row.training_experience = patch.trainingExperience;
  if (patch.availableTrainingDays !== undefined)
    row.available_training_days = patch.availableTrainingDays;
  if (patch.preferredSessionDurationMinutes !== undefined)
    row.preferred_session_duration_minutes = patch.preferredSessionDurationMinutes;
  if (patch.coachingStyle !== undefined) row.coaching_style = patch.coachingStyle;
  if (patch.timezone !== undefined) row.timezone = patch.timezone;

  const { error } = await client.from('profiles').update(row).eq('id', userId);
  if (error) fail('save that', error);
}

// --- Basic Profile weight (body_measurements) ---------------------------

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function hasWeightMeasurement(
  client: MurphySupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('body_measurements')
    .select('id')
    .eq('profile_id', userId)
    .eq('metric', 'weight')
    .limit(1);
  if (error) fail('load your measurements', error);
  return (data?.length ?? 0) > 0;
}

export async function loadLatestWeightKg(
  client: MurphySupabaseClient,
  userId: string,
): Promise<number | null> {
  const { data, error } = await client
    .from('body_measurements')
    .select('value')
    .eq('profile_id', userId)
    .eq('metric', 'weight')
    .order('measured_on', { ascending: false })
    .limit(1);
  if (error) fail('load your measurements', error);
  return data?.[0]?.value ?? null;
}

/**
 * Updates today's weight entry in place if one already exists, otherwise
 * inserts a new one — avoids noisy duplicate rows from repeated edits
 * within the same onboarding session while staying inside the documented
 * "multiple same-day entries are retained" schema design for any entry
 * from an *earlier* day (docs/DATABASE_SCHEMA.md §9).
 */
export async function upsertTodayWeightMeasurement(
  client: MurphySupabaseClient,
  userId: string,
  weightKg: number,
): Promise<void> {
  const measuredOn = todayIsoDate();
  const { data: existing, error: selectError } = await client
    .from('body_measurements')
    .select('id')
    .eq('profile_id', userId)
    .eq('metric', 'weight')
    .eq('measured_on', measuredOn)
    .limit(1);
  if (selectError) fail('save your weight', selectError);

  if (existing && existing.length > 0) {
    const { error } = await client
      .from('body_measurements')
      .update({ value: weightKg })
      .eq('id', existing[0].id);
    if (error) fail('save your weight', error);
    return;
  }

  const { error } = await client.from('body_measurements').insert({
    profile_id: userId,
    measured_on: measuredOn,
    metric: 'weight',
    value: weightKg,
    source: 'manual',
  });
  if (error) fail('save your weight', error);
}

// --- Goals ---------------------------------------------------------------

export type GoalOption = { id: string; key: string; label: string; description: string | null };

export async function listGoals(client: MurphySupabaseClient): Promise<GoalOption[]> {
  const { data, error } = await client.from('goals').select('id, key, label, description');
  if (error) fail('load goals', error);
  return data ?? [];
}

export type SelectedGoal = { goalKey: string; label: string; priority: number };

/**
 * Two plain selects joined client-side, rather than a PostgREST embedded
 * `user_goals(...goals(...))` select string — this repository's
 * `Database` type (src/types/database.ts) has no `Relationships` metadata
 * (hand-maintained without the Docker-dependent `supabase gen types`
 * pipeline, see that file's header), so an embed can't be typed reliably.
 */
export async function loadSelectedGoals(
  client: MurphySupabaseClient,
  userId: string,
): Promise<SelectedGoal[]> {
  const { data: userGoals, error: userGoalsError } = await client
    .from('user_goals')
    .select('goal_id, priority')
    .eq('profile_id', userId)
    .eq('active', true)
    .order('priority', { ascending: true });
  if (userGoalsError) fail('load your goals', userGoalsError);
  if (!userGoals || userGoals.length === 0) return [];

  const goals = await listGoals(client);
  const goalsById = new Map(goals.map((goal) => [goal.id, goal]));

  return userGoals.map((row) => {
    const goal = goalsById.get(row.goal_id);
    return { goalKey: goal?.key ?? '', label: goal?.label ?? '', priority: row.priority };
  });
}

/**
 * Atomically replaces the caller's active goal set with `goalKeys`, in the
 * given order (index 0 = priority 1) — calls the `set_user_goal_priorities`
 * RPC (`security definer`) rather than writing `user_goals` rows directly,
 * so a reorder/removal can never transiently violate the
 * `unique (profile_id, priority) where active` constraint and a retried
 * request never creates duplicate active priorities
 * (docs/IMPLEMENTATION_PLAN.md Phase 3 §9).
 */
export async function replaceUserGoalPriorities(
  client: MurphySupabaseClient,
  goalKeys: string[],
): Promise<void> {
  const { error } = await client.rpc('set_user_goal_priorities', { p_goal_keys: goalKeys });
  if (error) fail('save your goals', error);
}

export async function hasActiveGoals(
  client: MurphySupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('user_goals')
    .select('id')
    .eq('profile_id', userId)
    .eq('active', true)
    .limit(1);
  if (error) fail('load your goals', error);
  return (data?.length ?? 0) > 0;
}

// --- Body area goals -------------------------------------------------------

export async function loadSelectedBodyAreaKeys(
  client: MurphySupabaseClient,
  userId: string,
): Promise<BodyAreaKey[]> {
  const { data, error } = await client
    .from('body_area_goals')
    .select('body_area_key')
    .eq('profile_id', userId)
    .eq('active', true);
  if (error) fail('load your body-area goals', error);
  return (data ?? []).map((row) => row.body_area_key as BodyAreaKey);
}

/**
 * Replaces the caller's active body-area selections with `keys`. Zero
 * selections is a fully valid outcome (this step is optional) — deletes
 * everything and inserts nothing in that case.
 */
export async function replaceBodyAreaGoals(
  client: MurphySupabaseClient,
  userId: string,
  keys: BodyAreaKey[],
): Promise<void> {
  const { error: deleteError } = await client
    .from('body_area_goals')
    .delete()
    .eq('profile_id', userId);
  if (deleteError) fail('save your body-area goals', deleteError);

  if (keys.length === 0) return;

  const { error: insertError } = await client
    .from('body_area_goals')
    .insert(keys.map((key) => ({ profile_id: userId, body_area_key: key, active: true })));
  if (insertError) fail('save your body-area goals', insertError);
}

// --- Equipment -------------------------------------------------------------

export type EquipmentOption = {
  id: string;
  key: string;
  label: string;
  category: 'free_weight' | 'machine' | 'bodyweight' | 'accessory';
};

export async function listEquipment(client: MurphySupabaseClient): Promise<EquipmentOption[]> {
  const { data, error } = await client.from('equipment').select('id, key, label, category');
  if (error) fail('load equipment options', error);
  return data ?? [];
}

export async function loadSelectedEquipmentIds(
  client: MurphySupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from('user_equipment')
    .select('equipment_id')
    .eq('profile_id', userId)
    .eq('available', true);
  if (error) fail('load your equipment', error);
  return (data ?? []).map((row) => row.equipment_id);
}

export async function hasEquipmentSelection(
  client: MurphySupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('user_equipment')
    .select('id')
    .eq('profile_id', userId)
    .eq('available', true)
    .limit(1);
  if (error) fail('load your equipment', error);
  return (data?.length ?? 0) > 0;
}

/**
 * Idempotently sets the caller's full equipment availability set: an
 * upsert on the unique `(profile_id, equipment_id)` constraint marks
 * selected items `available = true`, and any previously-selected item not
 * in `equipmentIds` is marked `available = false` (kept, not deleted, so
 * re-enabling later doesn't need a fresh row — docs/DATABASE_SCHEMA.md §3).
 */
export async function setUserEquipment(
  client: MurphySupabaseClient,
  userId: string,
  equipmentIds: string[],
): Promise<void> {
  const { data: existing, error: selectError } = await client
    .from('user_equipment')
    .select('id, equipment_id')
    .eq('profile_id', userId);
  if (selectError) fail('save your equipment', selectError);

  const selected = new Set(equipmentIds);
  const toDisable = (existing ?? []).filter((row) => !selected.has(row.equipment_id));

  if (equipmentIds.length > 0) {
    const { error } = await client.from('user_equipment').upsert(
      equipmentIds.map((equipmentId) => ({
        profile_id: userId,
        equipment_id: equipmentId,
        available: true,
      })),
      { onConflict: 'profile_id,equipment_id' },
    );
    if (error) fail('save your equipment', error);
  }

  if (toDisable.length > 0) {
    const { error } = await client
      .from('user_equipment')
      .update({ available: false })
      .in(
        'id',
        toDisable.map((row) => row.id),
      );
    if (error) fail('save your equipment', error);
  }
}

// --- Safety screening --------------------------------------------------

export type SafetyScreeningResult = {
  id: string;
  requiresClearance: boolean;
  restrictionFlags: string[];
  createdAt: string;
};

/**
 * Submits raw yes/no answers for deterministic server-side derivation —
 * calls the `submit_safety_screening` RPC (`security definer`), which is
 * the only writer of `health_screenings.requires_clearance`/
 * `restriction_flags`; the authenticated client role has no direct INSERT
 * grant on that table (docs/IMPLEMENTATION_PLAN.md Phase 3 §15).
 */
export async function submitSafetyScreening(
  client: MurphySupabaseClient,
  answers: SafetyScreeningAnswers,
): Promise<SafetyScreeningResult> {
  const { data, error } = await client.rpc('submit_safety_screening', {
    p_screening_version: SAFETY_SCREENING_VERSION,
    p_responses: answers,
  });
  if (error) fail('save your safety screening', error);
  if (!data) fail('save your safety screening', new Error('empty response'));
  return {
    id: data.id,
    requiresClearance: data.requires_clearance,
    restrictionFlags: data.restriction_flags,
    createdAt: data.created_at,
  };
}

export async function hasHealthScreening(
  client: MurphySupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('health_screenings')
    .select('id')
    .eq('profile_id', userId)
    .limit(1);
  if (error) fail('load your safety screening', error);
  return (data?.length ?? 0) > 0;
}

// --- Baseline measurements -----------------------------------------------

export type BaselineMetric = 'waist' | 'chest' | 'hips' | 'arm' | 'thigh' | 'calf';

export async function insertBaselineMeasurements(
  client: MurphySupabaseClient,
  userId: string,
  values: Partial<Record<BaselineMetric, number>>,
): Promise<void> {
  const entries = Object.entries(values).filter(
    (entry): entry is [BaselineMetric, number] => entry[1] !== undefined && entry[1] !== null,
  );
  if (entries.length === 0) return;

  const measuredOn = todayIsoDate();
  const { error } = await client.from('body_measurements').insert(
    entries.map(([metric, value]) => ({
      profile_id: userId,
      measured_on: measuredOn,
      metric,
      value,
      source: 'manual' as const,
    })),
  );
  if (error) fail('save your measurements', error);
}

// --- BodyScan consent + baseline ------------------------------------------

export async function recordBodyScanConsent(
  client: MurphySupabaseClient,
  userId: string,
  granted: boolean,
  version: string,
): Promise<void> {
  const { error } = await client.from('consent_records').insert({
    profile_id: userId,
    consent_type: 'bodyscan_capture',
    granted,
    version,
  });
  if (error) fail('save your consent', error);
}

export async function hasGrantedBodyScanConsent(
  client: MurphySupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('consent_records')
    .select('granted')
    .eq('profile_id', userId)
    .eq('consent_type', 'bodyscan_capture')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) fail('load your consent status', error);
  return data?.[0]?.granted === true;
}

/**
 * Creates the `body_scans` row for a new baseline capture, so its id is
 * known up front and can be used to build each image's user-scoped storage
 * path (`{user_id}/{scan_id}/...`) before uploading — see
 * `src/services/onboarding/bodyscan-upload.ts`, which orchestrates the
 * upload + this insert + `insertBodyScanImageRecord` below as one flow.
 */
export async function createBodyScan(
  client: MurphySupabaseClient,
  userId: string,
  purpose: 'baseline' | 'progress_check',
): Promise<{ id: string }> {
  const { data, error } = await client
    .from('body_scans')
    .insert({ profile_id: userId, captured_on: todayIsoDate(), purpose })
    .select('id')
    .single();
  if (error) fail('save your BodyScan', error);
  return { id: data.id };
}

export async function insertBodyScanImageRecord(
  client: MurphySupabaseClient,
  bodyScanId: string,
  angle: 'front' | 'side' | 'back' | 'angle_45',
  storagePath: string,
): Promise<void> {
  const { error } = await client
    .from('body_scan_images')
    .insert({ body_scan_id: bodyScanId, angle, storage_path: storagePath });
  if (error) fail('save your BodyScan', error);
}

// --- Completion ------------------------------------------------------------

export type CompleteOnboardingResult = {
  onboardingCompletedAt: string;
  programme: {
    id: string;
    versionId: string;
    versionNumber: number;
    structure: Record<string, unknown>;
  };
};

export type CompleteOnboardingError = {
  kind: 'incomplete_onboarding';
  missingFields: string[];
};

/**
 * Calls the `complete_onboarding` RPC (`security definer`) — the sole
 * writer of `profiles.onboarding_completed_at`; the authenticated client
 * role has no column-level UPDATE grant on it
 * (docs/IMPLEMENTATION_PLAN.md Phase 3 §20). Derives identity from the
 * caller's JWT server-side; never accepts a client-supplied profile id.
 * Safe to call more than once — a profile that is already complete gets
 * its existing programme back rather than a duplicate.
 */
export async function completeOnboarding(
  client: MurphySupabaseClient,
): Promise<CompleteOnboardingResult> {
  const { data, error } = await client.rpc('complete_onboarding', {});
  if (error) {
    if (error.message === 'incomplete_onboarding') {
      let missingFields: string[] = [];
      try {
        missingFields = JSON.parse(error.details ?? '[]');
      } catch {
        missingFields = [];
      }
      const structured: CompleteOnboardingError = { kind: 'incomplete_onboarding', missingFields };
      throw new OnboardingRepositoryError(
        'A few required steps still need to be finished before your programme can be built.',
        structured,
      );
    }
    fail('finish onboarding', error);
  }
  const result = data as {
    onboarding_completed_at: string;
    programme: {
      id: string;
      version_id: string;
      version_number: number;
      structure: Record<string, unknown>;
    };
  };
  return {
    onboardingCompletedAt: result.onboarding_completed_at,
    programme: {
      id: result.programme.id,
      versionId: result.programme.version_id,
      versionNumber: result.programme.version_number,
      structure: result.programme.structure,
    },
  };
}

// --- Snapshot (guard / resume) ---------------------------------------------

export async function loadOnboardingSnapshot(
  client: MurphySupabaseClient,
  userId: string,
): Promise<OnboardingSnapshot> {
  const [profile, weight, goals, equipment, screening] = await Promise.all([
    loadProfile(client, userId),
    hasWeightMeasurement(client, userId),
    hasActiveGoals(client, userId),
    hasEquipmentSelection(client, userId),
    hasHealthScreening(client, userId),
  ]);

  return {
    dateOfBirth: profile.dateOfBirth,
    heightCm: profile.heightCm,
    hasWeightMeasurement: weight,
    trainingExperience: profile.trainingExperience,
    availableTrainingDays: profile.availableTrainingDays,
    preferredSessionDurationMinutes: profile.preferredSessionDurationMinutes,
    coachingStyle: profile.coachingStyle,
    onboardingCompletedAt: profile.onboardingCompletedAt,
    hasActiveGoals: goals,
    hasEquipmentSelection: equipment,
    hasHealthScreening: screening,
  };
}
