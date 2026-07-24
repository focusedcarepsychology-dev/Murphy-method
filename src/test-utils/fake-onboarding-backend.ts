/**
 * In-memory fake Supabase backend for onboarding domain/service tests.
 * Mirrors just enough of PostgREST's query-builder surface (`.from()`
 * chains) and the three Phase 3 RPCs (`set_user_goal_priorities`,
 * `submit_safety_screening`, `complete_onboarding`) to unit-test
 * `src/services/onboarding/onboarding-repository.ts` and drive an
 * end-to-end onboarding data-flow test without a real database.
 *
 * This is a test double for this repository's own query patterns, not a
 * general PostgREST simulator — it only implements the operations the
 * onboarding repository actually performs. The authoritative behaviour of
 * the real RPCs is verified against real PostgreSQL by
 * `supabase/tests/database/13_onboarding_rpc_functions.sql` and the local
 * pg-harness smoke check described in docs/DECISIONS.md; this fake exists
 * so the same call-shapes can be exercised fast, in Jest, without a
 * database at all.
 */
import { SAFETY_SCREENING_VERSION } from '@/domain/onboarding/safety-screening';

type Row = Record<string, unknown>;

let nextId = 1;
function generateId(): string {
  return `fake-id-${nextId++}`;
}

// A monotonically increasing fake clock, not `new Date().toISOString()` —
// two rows created within the same real millisecond (routine in a fast
// test run) would otherwise get identical timestamps, making
// `order('created_at', ...)` ties non-deterministic here even though real
// Postgres timestamps (and this fake's own insertion order) are strictly
// ordered.
let fakeClockMs = Date.parse('2026-01-01T00:00:00.000Z');
function generateTimestamp(): string {
  fakeClockMs += 1000;
  return new Date(fakeClockMs).toISOString();
}

const SAFETY_SCREENING_RULES: { key: string; flag: string }[] = [
  { key: 'heart_condition_supervised_only', flag: 'cardiac_supervision_required' },
  { key: 'chest_pain_during_activity', flag: 'exertional_chest_pain' },
  { key: 'chest_pain_at_rest', flag: 'rest_chest_pain' },
  { key: 'dizziness_or_balance_loss', flag: 'dizziness_balance_risk' },
  { key: 'bone_or_joint_problem', flag: 'joint_or_bone_limitation' },
  { key: 'blood_pressure_or_heart_medication', flag: 'cardiac_bp_medication' },
  { key: 'pregnant_or_recent_postpartum', flag: 'pregnancy_or_recent_postpartum' },
];

const GOAL_SEED: Row[] = [
  { id: 'goal-build_muscle', key: 'build_muscle', label: 'Build muscle', description: null },
  {
    id: 'goal-improve_strength',
    key: 'improve_strength',
    label: 'Improve strength',
    description: null,
  },
  { id: 'goal-lose_fat', key: 'lose_fat', label: 'Lose body fat', description: null },
  {
    id: 'goal-recomposition',
    key: 'recomposition',
    label: 'Body recomposition',
    description: null,
  },
  {
    id: 'goal-improve_fitness',
    key: 'improve_fitness',
    label: 'Improve general fitness',
    description: null,
  },
  {
    id: 'goal-improve_mobility',
    key: 'improve_mobility',
    label: 'Improve mobility',
    description: null,
  },
  {
    id: 'goal-consistency',
    key: 'consistency',
    label: 'Become more consistent',
    description: null,
  },
  {
    id: 'goal-body_area',
    key: 'body_area',
    label: 'Improve specific body areas',
    description: null,
  },
];

const EQUIPMENT_SEED: Row[] = [
  { id: 'equip-bodyweight', key: 'bodyweight', label: 'Bodyweight only', category: 'bodyweight' },
  { id: 'equip-dumbbell', key: 'dumbbell', label: 'Dumbbells', category: 'free_weight' },
  { id: 'equip-barbell', key: 'barbell', label: 'Barbell', category: 'free_weight' },
];

export class FakeOnboardingBackend {
  tables: Record<string, Row[]> = {
    profiles: [],
    goals: [...GOAL_SEED],
    user_goals: [],
    equipment: [...EQUIPMENT_SEED],
    user_equipment: [],
    body_area_goals: [],
    health_screenings: [],
    body_measurements: [],
    consent_records: [],
    body_scans: [],
    body_scan_images: [],
    programmes: [],
    programme_versions: [],
  };

  currentUserId: string | null = null;

  seedProfile(userId: string, overrides: Partial<Row> = {}) {
    this.tables.profiles.push({
      id: userId,
      display_name: null,
      date_of_birth: null,
      biological_sex: null,
      height_cm: null,
      unit_preference: 'metric',
      training_experience: null,
      available_training_days: null,
      preferred_session_duration_minutes: null,
      coaching_style: null,
      onboarding_completed_at: null,
      timezone: 'UTC',
      ...overrides,
    });
  }

  rpc(
    name: string,
    args: Record<string, unknown>,
  ): { data: unknown; error: { message: string; details?: string } | null } {
    const userId = this.currentUserId;
    if (!userId) return { data: null, error: { message: 'not_authenticated' } };

    if (name === 'set_user_goal_priorities') {
      const keys = args.p_goal_keys as string[];
      if (!keys || keys.length === 0) {
        return { data: null, error: { message: 'at_least_one_goal_required' } };
      }
      if (new Set(keys).size !== keys.length) {
        return { data: null, error: { message: 'duplicate_goal_keys' } };
      }
      const matched = keys.map((key) => this.tables.goals.find((g) => g.key === key));
      if (matched.some((m) => !m)) {
        return { data: null, error: { message: 'unknown_goal_key' } };
      }
      this.tables.user_goals.forEach((row) => {
        if (row.profile_id === userId) row.active = false;
      });
      const created = keys.map((key, index) => {
        const goal = matched[index]!;
        const row: Row = {
          id: generateId(),
          profile_id: userId,
          goal_id: goal.id,
          priority: index + 1,
          active: true,
          created_at: generateTimestamp(),
          updated_at: generateTimestamp(),
        };
        this.tables.user_goals.push(row);
        return row;
      });
      return { data: created, error: null };
    }

    if (name === 'submit_safety_screening') {
      const version = args.p_screening_version as string;
      const responses = args.p_responses as Record<string, unknown>;
      if (version !== SAFETY_SCREENING_VERSION) {
        return { data: null, error: { message: 'unsupported_screening_version' } };
      }
      const requiredKeys = SAFETY_SCREENING_RULES.map((r) => r.key);
      if (!responses || requiredKeys.some((key) => typeof responses[key] !== 'boolean')) {
        return { data: null, error: { message: 'incomplete_screening_responses' } };
      }
      const restrictionFlags = SAFETY_SCREENING_RULES.filter(
        (rule) => responses[rule.key] === true,
      ).map((rule) => rule.flag);
      const row: Row = {
        id: generateId(),
        profile_id: userId,
        responses,
        screening_version: version,
        requires_clearance: restrictionFlags.length > 0,
        restriction_flags: restrictionFlags,
        created_at: generateTimestamp(),
      };
      this.tables.health_screenings.push(row);
      return { data: row, error: null };
    }

    if (name === 'complete_onboarding') {
      const profile = this.tables.profiles.find((p) => p.id === userId);
      if (!profile) return { data: null, error: { message: 'profile_not_found' } };

      if (profile.onboarding_completed_at) {
        const programme = this.tables.programmes.find((p) => p.profile_id === userId);
        const version = this.tables.programme_versions.find(
          (v) => v.id === programme?.current_version_id,
        );
        return {
          data: {
            onboarding_completed_at: profile.onboarding_completed_at,
            programme: {
              id: programme?.id,
              version_id: version?.id,
              version_number: version?.version_number,
              structure: version?.structure,
            },
          },
          error: null,
        };
      }

      const missing: string[] = [];
      if (!profile.date_of_birth) missing.push('date_of_birth');
      if (!profile.height_cm) missing.push('height_cm');
      const hasWeight = this.tables.body_measurements.some(
        (m) => m.profile_id === userId && m.metric === 'weight',
      );
      if (!hasWeight) missing.push('weight');
      if (!profile.training_experience) missing.push('training_experience');
      const days = profile.available_training_days as string[] | null;
      if (!days || days.length === 0) missing.push('available_training_days');
      if (!profile.preferred_session_duration_minutes)
        missing.push('preferred_session_duration_minutes');
      if (!profile.coaching_style) missing.push('coaching_style');
      const hasGoals = this.tables.user_goals.some((g) => g.profile_id === userId && g.active);
      if (!hasGoals) missing.push('goals');
      const hasEquipment = this.tables.user_equipment.some(
        (e) => e.profile_id === userId && e.available,
      );
      if (!hasEquipment) missing.push('equipment');
      const screenings = this.tables.health_screenings
        .filter((s) => s.profile_id === userId)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      if (screenings.length === 0) missing.push('safety_screening');

      if (missing.length > 0) {
        return {
          data: null,
          error: { message: 'incomplete_onboarding', details: JSON.stringify(missing) },
        };
      }

      const screening = screenings[0];
      const goalRows = this.tables.user_goals
        .filter((g) => g.profile_id === userId && g.active)
        .sort((a, b) => Number(a.priority) - Number(b.priority));
      const goalPriorities = goalRows.map((g) => {
        const goal = this.tables.goals.find((gg) => gg.id === g.goal_id);
        return { goalKey: goal?.key, label: goal?.label, priority: g.priority };
      });

      const structure = {
        standInVersion: 'phase3-stub-1',
        weeklyFrequencyDays: days,
        sessionDurationMinutes: profile.preferred_session_duration_minutes,
        requiresClearance: screening.requires_clearance,
        restrictionFlags: screening.restriction_flags,
        goalPriorities,
        summary: screening.requires_clearance
          ? 'Your starting structure is ready. Based on your safety screening, we recommend confirming with a qualified professional.'
          : 'Your starting structure is ready. Exercise selection will be built from your goals, equipment, and safety information.',
      };

      const programmeId = generateId();
      const versionId = generateId();
      this.tables.programmes.push({
        id: programmeId,
        profile_id: userId,
        status: 'active',
        current_version_id: versionId,
      });
      this.tables.programme_versions.push({
        id: versionId,
        programme_id: programmeId,
        version_number: 1,
        structure,
        change_level: 0,
        change_reason: 'Initial programme created from your onboarding responses.',
        engine_version: 'phase3-stub-1',
        exercise_dataset_version: '0',
      });
      profile.onboarding_completed_at = generateTimestamp();

      return {
        data: {
          onboarding_completed_at: profile.onboarding_completed_at,
          programme: { id: programmeId, version_id: versionId, version_number: 1, structure },
        },
        error: null,
      };
    }

    return { data: null, error: { message: `unknown rpc: ${name}` } };
  }
}

type FilterOp = { col: string; val: unknown; isIn?: boolean };

class FakeQueryBuilder implements PromiseLike<{ data: unknown; error: unknown }> {
  private filters: FilterOp[] = [];
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: Row | Row[] | undefined;
  private singleResult = false;
  private orderCol?: string;
  private orderAscending = true;
  private limitN?: number;
  private onConflict?: string;

  constructor(
    private table: string,
    private backend: FakeOnboardingBackend,
  ) {}

  select(_cols?: string) {
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push({ col, val });
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push({ col, val: vals, isIn: true });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAscending = opts?.ascending !== false;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.singleResult = true;
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = 'insert';
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.op = 'update';
    this.payload = payload;
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    this.op = 'upsert';
    this.payload = payload;
    this.onConflict = opts?.onConflict;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) =>
      f.isIn ? (f.val as unknown[]).includes(row[f.col]) : row[f.col] === f.val,
    );
  }

  private run(): { data: unknown; error: unknown } {
    const rows = this.backend.tables[this.table];
    if (!rows) return { data: null, error: { message: `unknown table: ${this.table}` } };

    if (this.op === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const created = items.map((item) => {
        const row: Row = { id: generateId(), created_at: generateTimestamp(), ...item };
        rows.push(row);
        return row;
      });
      return { data: this.singleResult ? created[0] : created, error: null };
    }

    if (this.op === 'upsert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const conflictCols = (this.onConflict ?? 'id').split(',');
      const created = items.map((item) => {
        const existing = rows.find((row) => conflictCols.every((col) => row[col] === item[col]));
        if (existing) {
          Object.assign(existing, item);
          return existing;
        }
        const row: Row = { id: generateId(), created_at: generateTimestamp(), ...item };
        rows.push(row);
        return row;
      });
      return { data: created, error: null };
    }

    const matched = rows.filter((row) => this.matches(row));

    if (this.op === 'update') {
      matched.forEach((row) => Object.assign(row, this.payload));
      return { data: matched, error: null };
    }

    if (this.op === 'delete') {
      matched.forEach((row) => {
        const index = rows.indexOf(row);
        if (index >= 0) rows.splice(index, 1);
      });
      return { data: matched, error: null };
    }

    // select
    let result = [...matched];
    if (this.orderCol) {
      result.sort((a, b) => {
        const av = String(a[this.orderCol!]);
        const bv = String(b[this.orderCol!]);
        return this.orderAscending ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    if (this.limitN !== undefined) result = result.slice(0, this.limitN);

    if (this.singleResult) {
      if (result.length !== 1) {
        return { data: null, error: { message: 'no rows', code: 'PGRST116' } };
      }
      return { data: result[0], error: null };
    }
    return { data: result, error: null };
  }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?:
      ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

/**
 * Minimal `MurphySupabaseClient`-shaped fake, scoped to onboarding
 * repository calls. Also implements just enough of the `auth` namespace
 * (`getSession`/`onAuthStateChange`/`start|stopAutoRefresh`) to drive the
 * real `AuthProvider` (`src/state/auth/auth-context.tsx`) for full-app
 * `renderRouter` screen tests — `AuthProvider`'s own
 * `fetchOnboardingStatus` read goes through the same `.from('profiles')`
 * query builder as every other table call here, so seeding a profile row
 * via `backend.seedProfile()` is enough for it to resolve correctly.
 */
export function createFakeOnboardingClient(backend: FakeOnboardingBackend, userId: string) {
  backend.currentUserId = userId;
  const session = {
    access_token: 'fake-access-token',
    refresh_token: 'fake-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: userId, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' },
  };
  return {
    from(table: string) {
      return new FakeQueryBuilder(table, backend);
    },
    rpc(name: string, args: Record<string, unknown> = {}) {
      return Promise.resolve(backend.rpc(name, args));
    },
    storage: {
      from(_bucket: string) {
        return {
          upload: async (_path: string, _body: unknown, _opts: unknown) => ({
            data: { path: _path },
            error: null,
          }),
        };
      },
    },
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: (_cb: unknown) => ({ data: { subscription: { unsubscribe: () => {} } } }),
      startAutoRefresh: () => {},
      stopAutoRefresh: () => {},
    },
  } as any;
}
