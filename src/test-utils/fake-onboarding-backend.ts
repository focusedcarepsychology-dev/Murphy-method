/**
 * In-memory fake Supabase backend for domain/service and screen tests.
 * Mirrors just enough of PostgREST's query-builder surface (`.from()`
 * chains) and the Phase 3 RPCs (`set_user_goal_priorities`,
 * `submit_safety_screening`, `complete_onboarding`) to unit-test
 * `src/services/onboarding/onboarding-repository.ts`, drive an
 * end-to-end onboarding data-flow test, and render authenticated screens
 * against genuinely empty tables — which is how the zero-state invariants
 * (a brand-new user has no history, no records and no previous
 * performance) are asserted without a real database.
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

const GAMIFICATION_ACHIEVEMENT_SEED: Row[] = [
  {
    key: 'first_session',
    label: 'First step',
    description: 'Complete your first fully logged session.',
    icon_key: 'flag',
    sort_order: 10,
  },
  {
    key: 'three_sessions',
    label: 'Building momentum',
    description: 'Complete a session on three different days.',
    icon_key: 'bolt',
    sort_order: 20,
  },
  {
    key: 'ten_sessions',
    label: 'Consistent ten',
    description: 'Complete a session on ten different days.',
    icon_key: 'checkCircle',
    sort_order: 30,
  },
  {
    key: 'fifty_sessions',
    label: 'Fifty strong',
    description: 'Complete a session on fifty different days.',
    icon_key: 'trophy',
    sort_order: 40,
  },
  {
    key: 'minimum_counts',
    label: 'Minimum counts',
    description: 'Complete a minimum-mode session when time or energy is limited.',
    icon_key: 'star',
    sort_order: 50,
  },
  {
    key: 'weekly_target',
    label: 'Week completed',
    description: 'Meet your planned session target within one week.',
    icon_key: 'verified',
    sort_order: 60,
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
    programme_decisions: [],
    workouts: [],
    workout_exercises: [],
    set_logs: [],
    exercises: [],
    movement_patterns: [{ id: 'movement-squat', key: 'squat', label: 'Squat' }],
    muscles: [],
    exercise_muscles: [],
    exercise_equipment: [],
    gamification_profiles: [],
    gamification_point_events: [],
    gamification_achievements: [...GAMIFICATION_ACHIEVEMENT_SEED],
    gamification_user_achievements: [],
    gamification_seasons: [],
    gamification_entries: [],
    notification_preferences: [],
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
    this.tables.notification_preferences.push({
      id: generateId(),
      profile_id: userId,
      workout_reminders_enabled: true,
      missed_start_nudges_enabled: true,
      progress_notifications_enabled: true,
      bodyscan_reminders_enabled: true,
      created_at: generateTimestamp(),
      updated_at: generateTimestamp(),
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

    if (name === 'set_user_equipment') {
      const requestedIds = (args.p_equipment_ids as string[]) ?? [];
      if (requestedIds.length === 0) {
        return { data: null, error: { message: 'at_least_one_equipment_required' } };
      }
      const requested = requestedIds.map((id) => this.tables.equipment.find((e) => e.id === id));
      if (requested.some((row) => !row)) {
        return { data: null, error: { message: 'unknown_equipment_id' } };
      }
      // Mutual exclusion, exactly as the real function resolves it: real
      // equipment wins over the "bodyweight" no-equipment sentinel.
      const realEquipment = requested.filter((row) => row!.key !== 'bodyweight');
      const resolved = (realEquipment.length > 0 ? realEquipment : requested).map(
        (row) => row!.id as string,
      );

      for (const equipmentId of resolved) {
        const existing = this.tables.user_equipment.find(
          (row) => row.profile_id === userId && row.equipment_id === equipmentId,
        );
        if (existing) {
          existing.available = true;
        } else {
          this.tables.user_equipment.push({
            id: generateId(),
            profile_id: userId,
            equipment_id: equipmentId,
            available: true,
            created_at: generateTimestamp(),
          });
        }
      }
      this.tables.user_equipment.forEach((row) => {
        if (row.profile_id === userId && !resolved.includes(row.equipment_id as string)) {
          row.available = false;
        }
      });

      return {
        data: this.tables.user_equipment.filter(
          (row) => row.profile_id === userId && row.available,
        ),
        error: null,
      };
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

    if (name === 'get_gamification_dashboard') {
      let gamificationProfile = this.tables.gamification_profiles.find(
        (row) => row.profile_id === userId,
      );
      if (!gamificationProfile) {
        gamificationProfile = {
          profile_id: userId,
          public_alias: null,
          leaderboard_opt_in: false,
          celebration_effects: true,
        };
        this.tables.gamification_profiles.push(gamificationProfile);
      }
      let season = this.tables.gamification_seasons[0];
      if (!season) {
        season = {
          id: 'season-current',
          key: '2026-07',
          name: 'July 2026 Momentum Cup',
          starts_on: '2026-07-01',
          ends_on: '2026-08-01',
        };
        this.tables.gamification_seasons.push(season);
      }
      const events = this.tables.gamification_point_events.filter(
        (row) => row.profile_id === userId,
      );
      const earned = new Map(
        this.tables.gamification_user_achievements
          .filter((row) => row.profile_id === userId)
          .map((row) => [row.achievement_key, row]),
      );
      return {
        data: {
          enabled: true,
          leaderboardOptIn: gamificationProfile.leaderboard_opt_in === true,
          publicAlias: gamificationProfile.public_alias ?? null,
          celebrationEffects: gamificationProfile.celebration_effects !== false,
          lifetimePoints: events.reduce((sum, row) => sum + Number(row.points ?? 0), 0),
          scoredDays: events.filter((row) => row.event_type === 'daily_completion').length,
          season: {
            id: season.id,
            name: season.name,
            startsOn: season.starts_on,
            endsOn: season.ends_on,
            points: events.reduce((sum, row) => sum + Number(row.points ?? 0), 0),
            rank: null,
            participants: gamificationProfile.leaderboard_opt_in ? 1 : null,
          },
          achievements: this.tables.gamification_achievements.map((achievement) => ({
            key: achievement.key,
            label: achievement.label,
            description: achievement.description,
            iconKey: achievement.icon_key,
            achievedAt: earned.get(achievement.key)?.achieved_at ?? null,
          })),
        },
        error: null,
      };
    }

    if (name === 'set_gamification_preferences') {
      const alias = String(args.p_public_alias ?? '').trim();
      const optedIn = args.p_leaderboard_opt_in === true;
      if (optedIn && !/^[\p{L}\p{N}][\p{L}\p{N} _-]{2,23}$/u.test(alias)) {
        return { data: null, error: { message: 'leaderboard_alias_required' } };
      }
      const taken = this.tables.gamification_profiles.some(
        (row) =>
          row.profile_id !== userId &&
          typeof row.public_alias === 'string' &&
          row.public_alias.trim().toLowerCase() === alias.toLowerCase(),
      );
      if (alias && taken) return { data: null, error: { message: 'leaderboard_alias_taken' } };

      const existing = this.tables.gamification_profiles.find((row) => row.profile_id === userId);
      const next = {
        profile_id: userId,
        public_alias: alias || null,
        leaderboard_opt_in: optedIn,
        celebration_effects: args.p_celebration_effects !== false,
      };
      if (existing) Object.assign(existing, next);
      else this.tables.gamification_profiles.push(next);
      return this.rpc('get_gamification_dashboard', {});
    }

    if (name === 'get_gamification_leaderboard') {
      const dashboard = this.rpc('get_gamification_dashboard', {});
      if (dashboard.error) return dashboard;
      const season = (dashboard.data as Record<string, unknown>).season as Record<string, unknown>;
      const entries = this.tables.gamification_profiles
        .filter((row) => row.leaderboard_opt_in && row.public_alias)
        .map((row, index) => ({
          rank: index + 1,
          alias: row.public_alias,
          points: 0,
          scoredDays: 0,
          isCurrentUser: row.profile_id === userId,
        }));
      return {
        data: {
          season: {
            id: season.id,
            name: season.name,
            startsOn: season.startsOn,
            endsOn: season.endsOn,
          },
          entries,
          currentUser: entries.find((entry) => entry.isCurrentUser) ?? null,
          rules: {
            fullSessionPoints: 100,
            quickSessionPoints: 75,
            minimumSessionPoints: 50,
            weeklyTargetBonus: 75,
            dailyCap: 'highest completed mode per UTC day',
          },
        },
        error: null,
      };
    }

    if (name === 'get_my_data_export') {
      return {
        data: {
          exportedAt: generateTimestamp(),
          profile: this.tables.profiles.find((row) => row.id === userId) ?? null,
          goals: this.tables.user_goals.filter((row) => row.profile_id === userId),
          workouts: this.tables.workouts.filter((row) => row.profile_id === userId),
          consentHistory: this.tables.consent_records.filter((row) => row.profile_id === userId),
          bodyScanMetadata: this.tables.body_scans.filter((row) => row.profile_id === userId),
        },
        error: null,
      };
    }

    if (name === 'delete_my_training_history') {
      if (args.p_confirmation !== 'DELETE WORKOUT HISTORY') {
        return { data: null, error: { message: 'confirmation_required' } };
      }
      const workoutIds = this.tables.workouts
        .filter((row) => row.profile_id === userId)
        .map((row) => row.id);
      const exerciseIds = this.tables.workout_exercises
        .filter((row) => workoutIds.includes(row.workout_id))
        .map((row) => row.id);
      const deleted = workoutIds.length;
      this.tables.set_logs = this.tables.set_logs.filter(
        (row) => !exerciseIds.includes(row.workout_exercise_id),
      );
      this.tables.workout_exercises = this.tables.workout_exercises.filter(
        (row) => !workoutIds.includes(row.workout_id),
      );
      this.tables.workouts = this.tables.workouts.filter((row) => row.profile_id !== userId);
      this.tables.gamification_point_events = this.tables.gamification_point_events.filter(
        (row) => row.profile_id !== userId,
      );
      this.tables.gamification_user_achievements =
        this.tables.gamification_user_achievements.filter((row) => row.profile_id !== userId);
      return { data: { workoutsDeleted: deleted }, error: null };
    }

    if (name === 'delete_my_account') {
      if (args.p_confirmation !== 'DELETE MY ACCOUNT') {
        return { data: null, error: { message: 'confirmation_required' } };
      }
      for (const table of Object.keys(this.tables)) {
        this.tables[table] = this.tables[table].filter(
          (row) => row.id !== userId && row.profile_id !== userId,
        );
      }
      return { data: { deleted: true }, error: null };
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

type FilterOp = { col: string; val: unknown; op?: 'eq' | 'in' | 'gte' | 'lte' | 'lt' };

type QueryResult = { data: unknown; error: unknown; count?: number };

class FakeQueryBuilder implements PromiseLike<QueryResult> {
  private filters: FilterOp[] = [];
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: Row | Row[] | undefined;
  private singleResult = false;
  private maybeSingleResult = false;
  private orderCol?: string;
  private orderAscending = true;
  private limitN?: number;
  private onConflict?: string;
  private countExact = false;
  private headOnly = false;

  constructor(
    private table: string,
    private backend: FakeOnboardingBackend,
  ) {}

  select(_cols?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    this.countExact = opts?.count === 'exact';
    this.headOnly = opts?.head === true;
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push({ col, val, op: 'eq' });
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push({ col, val: vals, op: 'in' });
    return this;
  }
  gte(col: string, val: unknown) {
    this.filters.push({ col, val, op: 'gte' });
    return this;
  }
  lte(col: string, val: unknown) {
    this.filters.push({ col, val, op: 'lte' });
    return this;
  }
  lt(col: string, val: unknown) {
    this.filters.push({ col, val, op: 'lt' });
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
  maybeSingle() {
    this.maybeSingleResult = true;
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
    return this.filters.every((f) => {
      const value = row[f.col];
      if (f.op === 'in') return (f.val as unknown[]).includes(value);
      if (f.op === 'gte') return value !== null && String(value) >= String(f.val);
      if (f.op === 'lte') return value !== null && String(value) <= String(f.val);
      if (f.op === 'lt') return value !== null && String(value) < String(f.val);
      return value === f.val;
    });
  }

  private run(): QueryResult {
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

    if (this.maybeSingleResult) {
      if (result.length > 1) {
        return { data: null, error: { message: 'multiple rows', code: 'PGRST116' } };
      }
      return { data: result[0] ?? null, error: null };
    }
    if (this.singleResult) {
      if (result.length !== 1) {
        return { data: null, error: { message: 'no rows', code: 'PGRST116' } };
      }
      return { data: result[0], error: null };
    }
    if (this.countExact) {
      // `head: true` asks PostgREST for the count without the rows.
      return { data: this.headOnly ? null : result, error: null, count: matched.length };
    }
    return { data: result, error: null };
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
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
          remove: async (_paths: string[]) => ({ data: _paths, error: null }),
          createSignedUrl: async (_path: string) => ({
            data: { signedUrl: `https://signed.example/${_path}` },
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
