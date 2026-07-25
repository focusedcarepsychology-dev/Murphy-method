import { setCelebrationEffectsEnabled } from '@/services/feedback/haptics';
import type { MurphySupabaseClient } from '@/services/supabase/client';

export type GamificationAchievement = {
  key: string;
  label: string;
  description: string;
  iconKey: string;
  achievedAt: string | null;
};

export type GamificationSeason = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  points: number;
  rank: number | null;
  participants: number | null;
};

export type GamificationDashboard = {
  enabled: true;
  leaderboardOptIn: boolean;
  publicAlias: string | null;
  celebrationEffects: boolean;
  lifetimePoints: number;
  scoredDays: number;
  season: GamificationSeason;
  achievements: GamificationAchievement[];
};

export type LeaderboardEntry = {
  rank: number;
  alias: string;
  points: number;
  scoredDays: number;
  isCurrentUser: boolean;
};

export type GamificationLeaderboard = {
  season: Pick<GamificationSeason, 'id' | 'name' | 'startsOn' | 'endsOn'>;
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  rules: {
    fullSessionPoints: number;
    quickSessionPoints: number;
    minimumSessionPoints: number;
    weeklyTargetBonus: number;
    dailyCap: string;
  };
};

export class GamificationRepositoryError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'GamificationRepositoryError';
    this.cause = cause;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseAchievement(value: unknown): GamificationAchievement | null {
  if (!isRecord(value)) return null;
  const key = stringValue(value.key);
  const label = stringValue(value.label);
  if (!key || !label) return null;
  return {
    key,
    label,
    description: stringValue(value.description),
    iconKey: stringValue(value.iconKey, 'trophy'),
    achievedAt: typeof value.achievedAt === 'string' ? value.achievedAt : null,
  };
}

export function parseGamificationDashboard(value: unknown): GamificationDashboard {
  if (!isRecord(value) || !isRecord(value.season)) {
    throw new GamificationRepositoryError("The app couldn't verify your Momentum data.");
  }

  const season = value.season;
  const id = stringValue(season.id);
  const name = stringValue(season.name);
  if (!id || !name) {
    throw new GamificationRepositoryError("The app couldn't verify the current tournament.");
  }

  const achievements = Array.isArray(value.achievements)
    ? value.achievements
        .map(parseAchievement)
        .filter((item): item is GamificationAchievement => item !== null)
    : [];

  return {
    enabled: true,
    leaderboardOptIn: value.leaderboardOptIn === true,
    publicAlias: typeof value.publicAlias === 'string' ? value.publicAlias : null,
    celebrationEffects: value.celebrationEffects !== false,
    lifetimePoints: numberValue(value.lifetimePoints),
    scoredDays: numberValue(value.scoredDays),
    season: {
      id,
      name,
      startsOn: stringValue(season.startsOn),
      endsOn: stringValue(season.endsOn),
      points: numberValue(season.points),
      rank: nullableNumber(season.rank),
      participants: nullableNumber(season.participants),
    },
    achievements,
  };
}

function parseLeaderboardEntry(value: unknown): LeaderboardEntry | null {
  if (!isRecord(value)) return null;
  const alias = stringValue(value.alias);
  const rank = numberValue(value.rank);
  if (!alias || rank < 1) return null;
  return {
    rank,
    alias,
    points: numberValue(value.points),
    scoredDays: numberValue(value.scoredDays),
    isCurrentUser: value.isCurrentUser === true,
  };
}

export function parseGamificationLeaderboard(value: unknown): GamificationLeaderboard {
  if (!isRecord(value) || !isRecord(value.season) || !isRecord(value.rules)) {
    throw new GamificationRepositoryError("The app couldn't verify the leaderboard.");
  }
  const season = value.season;
  const rules = value.rules;
  const id = stringValue(season.id);
  const name = stringValue(season.name);
  if (!id || !name) {
    throw new GamificationRepositoryError("The app couldn't verify the current tournament.");
  }

  return {
    season: {
      id,
      name,
      startsOn: stringValue(season.startsOn),
      endsOn: stringValue(season.endsOn),
    },
    entries: Array.isArray(value.entries)
      ? value.entries
          .map(parseLeaderboardEntry)
          .filter((item): item is LeaderboardEntry => item !== null)
      : [],
    currentUser: parseLeaderboardEntry(value.currentUser),
    rules: {
      fullSessionPoints: numberValue(rules.fullSessionPoints, 100),
      quickSessionPoints: numberValue(rules.quickSessionPoints, 75),
      minimumSessionPoints: numberValue(rules.minimumSessionPoints, 50),
      weeklyTargetBonus: numberValue(rules.weeklyTargetBonus, 75),
      dailyCap: stringValue(rules.dailyCap, 'highest completed mode per day'),
    },
  };
}

export function validateTournamentAlias(value: string): string | null {
  const alias = value.trim();
  if (alias.length < 3 || alias.length > 24) return 'Use 3–24 characters for your public alias.';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]{2,23}$/u.test(alias)) {
    return 'Use letters, numbers, spaces, hyphens or underscores only.';
  }
  return null;
}

function fail(action: string, error: unknown): never {
  const message = isRecord(error) && typeof error.message === 'string' ? error.message : '';
  if (message.includes('leaderboard_alias_taken')) {
    throw new GamificationRepositoryError(
      'That public alias is already in use. Choose another.',
      error,
    );
  }
  if (message.includes('leaderboard_alias_required')) {
    throw new GamificationRepositoryError(
      'Choose a public alias between 3 and 24 characters before joining the tournament.',
      error,
    );
  }
  throw new GamificationRepositoryError(
    `Couldn't ${action}. Check your connection and try again.`,
    error,
  );
}

export async function loadGamificationDashboard(
  client: MurphySupabaseClient,
): Promise<GamificationDashboard> {
  const { data, error } = await client.rpc('get_gamification_dashboard');
  if (error) fail('load your Momentum Points', error);
  const dashboard = parseGamificationDashboard(data);
  await setCelebrationEffectsEnabled(dashboard.celebrationEffects);
  return dashboard;
}

export async function saveGamificationPreferences(
  client: MurphySupabaseClient,
  input: {
    publicAlias: string;
    leaderboardOptIn: boolean;
    celebrationEffects: boolean;
  },
): Promise<GamificationDashboard> {
  const { data, error } = await client.rpc('set_gamification_preferences', {
    p_public_alias: input.publicAlias,
    p_leaderboard_opt_in: input.leaderboardOptIn,
    p_celebration_effects: input.celebrationEffects,
  });
  if (error) fail('save your Momentum settings', error);
  const dashboard = parseGamificationDashboard(data);
  await setCelebrationEffectsEnabled(dashboard.celebrationEffects);
  return dashboard;
}

export async function loadGamificationLeaderboard(
  client: MurphySupabaseClient,
  limit = 50,
): Promise<GamificationLeaderboard> {
  const { data, error } = await client.rpc('get_gamification_leaderboard', {
    p_limit: Math.max(1, Math.min(limit, 100)),
  });
  if (error) fail('load the tournament', error);
  return parseGamificationLeaderboard(data);
}
