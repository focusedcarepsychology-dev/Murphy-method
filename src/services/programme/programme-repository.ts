/**
 * Programme domain service. Every Supabase call the Today, Plan and
 * programme-history screens make about a user's programme goes through
 * this module. The server remains the programme authority; this service
 * only loads and parses persisted versions.
 */
import { parseProgrammeStructure, type ProgrammeStructure } from '@/domain/programme/structure';
import type { MurphySupabaseClient } from '@/services/supabase/client';

export class ProgrammeRepositoryError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ProgrammeRepositoryError';
    this.cause = cause;
  }
}

function fail(action: string, error: unknown): never {
  throw new ProgrammeRepositoryError(
    `Couldn't ${action}. Check your connection and try again.`,
    error,
  );
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
  parsedStructure: ProgrammeStructure;
};

export type RegeneratedProgramme = {
  programmeId: string;
  versionId: string;
  previousVersionId: string;
  versionNumber: number;
};

/** The caller's most recently created programme and its current version. */
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
    .select(
      'id, version_number, structure, engine_version, change_reason, change_level, created_at',
    )
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
    parsedStructure: parseProgrammeStructure(version.structure),
  };
}

/**
 * Idempotently ensures the caller has a deterministic exercise programme,
 * upgrading a legacy structure-only version in place when necessary.
 */
export async function ensureRealProgramme(
  client: MurphySupabaseClient,
  userId: string,
): Promise<CurrentProgramme | null> {
  const current = await getCurrentProgramme(client, userId);
  if (!current || current.parsedStructure.hasExercises) return current;

  const { error } = await client.rpc('upgrade_programme_to_real_v1');
  if (error) fail('prepare your programme', error);

  return getCurrentProgramme(client, userId);
}

/**
 * Creates a new programme version from the caller's current settings while
 * preserving the previous version in history.
 */
export async function regenerateCurrentProgramme(
  client: MurphySupabaseClient,
): Promise<RegeneratedProgramme> {
  const { data, error } = await client.rpc('regenerate_current_programme');
  if (error) {
    if (error.message.includes('active_workout_in_progress')) {
      throw new ProgrammeRepositoryError(
        'Finish your active workout before restructuring the programme.',
        error,
      );
    }
    fail('restructure your programme', error);
  }

  const result = data as Record<string, unknown> | null;
  if (
    !result ||
    typeof result.programmeId !== 'string' ||
    typeof result.versionId !== 'string' ||
    typeof result.previousVersionId !== 'string' ||
    typeof result.versionNumber !== 'number'
  ) {
    throw new ProgrammeRepositoryError(
      "The programme was updated, but the app couldn't verify the new version.",
    );
  }

  return {
    programmeId: result.programmeId,
    versionId: result.versionId,
    previousVersionId: result.previousVersionId,
    versionNumber: result.versionNumber,
  };
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
    .select(
      'id, version_number, structure, engine_version, change_reason, change_level, created_at',
    )
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
