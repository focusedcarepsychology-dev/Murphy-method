/**
 * Exercise ontology reads (remediation Part 7). Read-only, the ontology
 * is content-governed reference data (docs/DATABASE_SCHEMA.md §5), never
 * client-writable.
 */
import type { MurphySupabaseClient } from '@/services/supabase/client';

export class ExerciseRepositoryError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ExerciseRepositoryError';
    this.cause = cause;
  }
}

function fail(action: string, error: unknown): never {
  throw new ExerciseRepositoryError(
    `Couldn't ${action}. Check your connection and try again.`,
    error,
  );
}

export type ExerciseMuscle = { label: string; role: 'primary' | 'secondary' };
export type ExerciseEquipmentRequirement = { key: string; label: string; required: boolean };

export type ExerciseDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visualKey: string | null;
  startingPosition: string | null;
  instructions: string[];
  coachingCues: string[];
  commonMistakes: string[];
  movementPattern: string;
  movementPatternLabel: string;
  muscles: ExerciseMuscle[];
  equipment: ExerciseEquipmentRequirement[];
};

/** Batch fetch, one query per related table, keyed by exercise id, for however many ids a screen needs at once. */
export async function getExercisesByIds(
  client: MurphySupabaseClient,
  exerciseIds: string[],
): Promise<Map<string, ExerciseDetail>> {
  const uniqueIds = [...new Set(exerciseIds)];
  if (uniqueIds.length === 0) return new Map();

  const { data: exercises, error: exercisesError } = await client
    .from('exercises')
    .select(
      'id, name, slug, description, visual_key, starting_position, instructions, coaching_cues, common_mistakes, movement_pattern_id',
    )
    .in('id', uniqueIds);
  if (exercisesError) fail('load exercise details', exercisesError);

  const { data: patterns, error: patternsError } = await client
    .from('movement_patterns')
    .select('id, key, label');
  if (patternsError) fail('load exercise details', patternsError);
  const patternById = new Map((patterns ?? []).map((row) => [row.id, row]));

  const { data: muscleLinks, error: muscleLinksError } = await client
    .from('exercise_muscles')
    .select('exercise_id, role, muscle_id')
    .in('exercise_id', uniqueIds);
  if (muscleLinksError) fail('load exercise details', muscleLinksError);

  const { data: equipmentLinks, error: equipmentLinksError } = await client
    .from('exercise_equipment')
    .select('exercise_id, required, equipment_id')
    .in('exercise_id', uniqueIds);
  if (equipmentLinksError) fail('load exercise details', equipmentLinksError);

  const { data: muscles, error: musclesError } = await client.from('muscles').select('id, label');
  if (musclesError) fail('load exercise details', musclesError);
  const muscleLabelById = new Map((muscles ?? []).map((row) => [row.id, row.label]));

  const { data: equipmentRows, error: equipmentRowsError } = await client
    .from('equipment')
    .select('id, key, label');
  if (equipmentRowsError) fail('load exercise details', equipmentRowsError);
  const equipmentById = new Map((equipmentRows ?? []).map((row) => [row.id, row]));

  const musclesByExercise = new Map<string, ExerciseMuscle[]>();
  for (const link of muscleLinks ?? []) {
    const label = muscleLabelById.get(link.muscle_id);
    if (!label) continue;
    const list = musclesByExercise.get(link.exercise_id) ?? [];
    list.push({ label, role: link.role });
    musclesByExercise.set(link.exercise_id, list);
  }

  const equipmentByExercise = new Map<string, ExerciseEquipmentRequirement[]>();
  for (const link of equipmentLinks ?? []) {
    const equipment = equipmentById.get(link.equipment_id);
    if (!equipment) continue;
    const list = equipmentByExercise.get(link.exercise_id) ?? [];
    list.push({ key: equipment.key, label: equipment.label, required: link.required });
    equipmentByExercise.set(link.exercise_id, list);
  }

  const result = new Map<string, ExerciseDetail>();
  for (const exercise of exercises ?? []) {
    const pattern = patternById.get(exercise.movement_pattern_id);
    result.set(exercise.id, {
      id: exercise.id,
      name: exercise.name,
      slug: exercise.slug,
      description: exercise.description,
      visualKey: exercise.visual_key,
      startingPosition: exercise.starting_position,
      instructions: exercise.instructions,
      coachingCues: exercise.coaching_cues,
      commonMistakes: exercise.common_mistakes,
      movementPattern: pattern?.key ?? '',
      movementPatternLabel: pattern?.label ?? '',
      muscles: musclesByExercise.get(exercise.id) ?? [],
      equipment: equipmentByExercise.get(exercise.id) ?? [],
    });
  }
  return result;
}

export async function getExerciseById(
  client: MurphySupabaseClient,
  exerciseId: string,
): Promise<ExerciseDetail | null> {
  const result = await getExercisesByIds(client, [exerciseId]);
  return result.get(exerciseId) ?? null;
}

export type ExerciseSubstitution = {
  exerciseId: string;
  name: string;
  relationType: 'regression' | 'progression' | 'alternative';
};

export async function getExerciseSubstitutions(
  client: MurphySupabaseClient,
  exerciseId: string,
): Promise<ExerciseSubstitution[]> {
  const { data: links, error: linksError } = await client
    .from('exercise_substitutions')
    .select('substitute_exercise_id, relation_type')
    .eq('exercise_id', exerciseId)
    .order('similarity_score', { ascending: false });
  if (linksError) fail('load exercise alternatives', linksError);
  if (!links || links.length === 0) return [];

  const { data: substitutes, error: substitutesError } = await client
    .from('exercises')
    .select('id, name')
    .in(
      'id',
      links.map((link) => link.substitute_exercise_id),
    );
  if (substitutesError) fail('load exercise alternatives', substitutesError);
  const nameById = new Map((substitutes ?? []).map((row) => [row.id, row.name]));

  return links
    .map((link) => {
      const name = nameById.get(link.substitute_exercise_id);
      if (!name) return null;
      return { exerciseId: link.substitute_exercise_id, name, relationType: link.relation_type };
    })
    .filter((row): row is ExerciseSubstitution => row !== null);
}
