/**
 * Programme domain service (remediation Part 8/9/12). Every Supabase call
 * Today/Plan/Programme-History screens make about a user's programme goes
 * through this module, mirroring the convention already established by
 * src/services/onboarding/onboarding-repository.ts.
 */
import type { MurphySupabaseClient } from '@/services/supabase/client';
import type { RealProgrammeStructure } from '@/domain/programme/structure';
import { isRealProgrammeStructure } from '@/domain/programme/structure';

export class ProgrammeRepositoryError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ProgrammeRepositoryError';
    this.cause = cause;
  }
}

function fail(action: string, error: unknown): never {
  throw new ProgrammeRepositoryError(`Couldn't ${action}. Check your connection and try again.`, error);
}

export type ProgrammeVersionSummary = {
  programmeId: string;
  versionId: string;
  versionNumber: number;
  engineVersion: string;
  changeReason: string;
  changeLevel: number;
  createdAt: string;
  structure: unknown;
};

export type CurrentProgramme = ProgrammeVersionSummary & {
  /** Non-null only once the current version was produced by the real engine (Part 9). */
  realStructure: RealProgrammeStructure | null;
};

/** The caller's most recently created programme and its current version, or null if none exists yet. */
export async function getCurrentProgramme(
  client: MurphySupabaseClient,
  userId: string,
): Promise<CurrentProgramme | null> {
  const { data: programme, error: programmeError } = await client
    .from('programmes')
    .select('id, current_version_id')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (programmeError) fail('load your programme', programmeError);
  if (!programme || !programme.current_version_id) return null;

  const { data: version, error: versionError } = await client
    .from('programme_versions')
    .select('id, version_number, structure, engine_version, change_reason, change_level, created_at')
    .eq('id', programme.current_version_id)
    .single();
  if (versionError) fail('load your programme', versionError);

  return {
    programmeId: programme.id,
    versionId: version.id,
    versionNumber: version.version_number,
    engineVersion: version.engine_version,
    changeReason: version.change_reason,
    changeLevel: version.change_level,
    createdAt: version.created_at,
    structure: version.structure,
    realStructure: isRealProgrammeStructure(version.structure) ? version.structure : null,
  };
}

/**
 * Idempotently ensures the caller has a real (deterministic-v1) programme,
 * upgrading a legacy phase3-stub-1 programme in place if needed (Part 9).
 * Safe to call on every Today screen load: a no-op once already upgraded.
 */
export async function ensureRealProgramme(
  client: MurphySupabaseClient,
  userId: string,
): Promise<CurrentProgramme | null> {
  const current = await getCurrentProgramme(client, userId);
  if (!current || current.realStructure) return current;

  const { error } = await client.rpc('upgrade_programme_to_real_v1');
  if (error) fail('prepare your programme', error);

  return getCurrentProgramme(client, userId);
}

export async function listProgrammeVersionHistory(
  client: MurphySupabaseClient,
  userId: string,
): Promise<ProgrammeVersionSummary[]> {
  const { data: programme, error: programmeError } = await client
    .from('programmes')
    .select('id')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (programmeError) fail('load your programme history', programmeError);
  if (!programme) return [];

  const { data: versions, error: versionsError } = await client
    .from('programme_versions')
    .select('id, version_number, structure, engine_version, change_reason, change_level, created_at')
    .eq('programme_id', programme.id)
    .order('version_number', { ascending: false });
  if (versionsError) fail('load your programme history', versionsError);

  return (versions ?? []).map((version) => ({
    programmeId: programme.id,
    versionId: version.id,
    versionNumber: version.version_number,
    engineVersion: version.engine_version,
    changeReason: version.change_reason,
    changeLevel: version.change_level,
    createdAt: version.created_at,
    structure: version.structure,
  }));
}
