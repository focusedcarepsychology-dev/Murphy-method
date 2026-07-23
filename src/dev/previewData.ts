/**
 * Isolated development preview data.
 *
 * This module exists purely so Phase 1 screens have something representative
 * to render while visually developing the app shell. Nothing here is real,
 * persisted, or fetched — it must never be presented to a screen as if it
 * were live user/server data (CLAUDE.md — "never fake functionality").
 * Real data wiring starts in Phase 2+ (Supabase).
 */
import type { GoalTrajectory } from '@/components/ui/goal-progress-card';
import type { IconName } from '@/components/ui/icon';
import type { WorkoutCardStatus } from '@/components/ui/workout-card';

export const previewUser = {
  firstName: 'Alex',
};

export const previewTodayWorkout = {
  title: 'Upper Body A',
  durationMinutes: 38,
  exerciseCount: 6,
  quickDurationMinutes: 20,
  minimumDurationMinutes: 8,
};

export const previewMomentum = {
  completedSessions: 3,
  plannedSessions: 4,
};

export const previewCoachInsight =
  'You were one rep away from a new incline-press best last session.';

export const previewCoachMessage =
  "You've completed three sessions this week.\n\nYour next session is Upper Body A.\n\nYou only need 38 minutes — or I can make it shorter.";

export const previewCoachQuickActions = [
  'Make it shorter',
  'Why this workout?',
  "I'm low on energy",
  'Change my schedule',
] as const;

export type PreviewGoal = {
  label: string;
  trajectory: GoalTrajectory;
  icon: IconName;
};

export const previewGoals: PreviewGoal[] = [
  { label: 'Shoulders', trajectory: 'progressing', icon: 'trending' },
  { label: 'Chest', trajectory: 'building', icon: 'trending' },
];

export const previewConsistencyPercent = 82;

export type PreviewPlannedWorkout = {
  day: string;
  title: string;
  durationMinutes: number;
  focus: string;
  exerciseCount: number;
  status: WorkoutCardStatus;
};

export const previewWeeklyPlan: PreviewPlannedWorkout[] = [
  {
    day: 'Monday',
    title: 'Upper Body A',
    durationMinutes: 38,
    focus: 'Chest, shoulders, triceps',
    exerciseCount: 6,
    status: 'completed',
  },
  {
    day: 'Wednesday',
    title: 'Lower Body A',
    durationMinutes: 42,
    focus: 'Quads, glutes, hamstrings',
    exerciseCount: 6,
    status: 'scheduled',
  },
  {
    day: 'Friday',
    title: 'Full Body',
    durationMinutes: 45,
    focus: 'Compound strength',
    exerciseCount: 7,
    status: 'scheduled',
  },
];

export const previewPlanSummary = {
  daysPerWeek: 3,
  whyThisPlan:
    'Built around your goals (shoulders, chest), 3 available days, and full-gym equipment access. Volume is set conservatively for your first few weeks and will adapt from there.',
};

export type PreviewExercise = {
  name: string;
  targetSets: number;
  targetReps: string;
  previous?: string;
};

export const previewWorkoutExercises: PreviewExercise[] = [
  { name: 'Incline Dumbbell Press', targetSets: 3, targetReps: '8–12', previous: '22 kg × 10' },
  { name: 'Flat Barbell Bench Press', targetSets: 3, targetReps: '6–10', previous: '55 kg × 8' },
  { name: 'Seated Cable Row', targetSets: 3, targetReps: '10–12', previous: '48 kg × 11' },
  { name: 'Dumbbell Shoulder Press', targetSets: 3, targetReps: '8–12', previous: '16 kg × 10' },
  { name: 'Lateral Raise', targetSets: 3, targetReps: '12–15', previous: '8 kg × 14' },
  { name: 'Triceps Rope Pushdown', targetSets: 3, targetReps: '10–15', previous: '25 kg × 12' },
];

export const previewActiveSet = {
  exerciseName: 'Incline Dumbbell Press',
  setNumber: 2,
  totalSets: 3,
  targetRepRange: '8–12',
  previousPerformance: '22 kg × 10',
  todayWeightKg: 22,
  todayReps: 11,
  restSeconds: 90,
};

export const previewWorkoutSummary = {
  completedExercises: 6,
  completedSets: 18,
  totalDurationMinutes: 41,
  newPersonalRecords: ['Incline Dumbbell Press: 22 kg × 11 (previous best: 22 kg × 10)'],
};

export type PreviewGoalOption = {
  id: string;
  label: string;
  icon: IconName;
};

export const previewGoalOptions: PreviewGoalOption[] = [
  { id: 'build_muscle', label: 'Build muscle', icon: 'trending' },
  { id: 'lose_fat', label: 'Lose body fat', icon: 'flag' },
  { id: 'get_stronger', label: 'Get stronger', icon: 'bolt' },
  { id: 'improve_fitness', label: 'Improve fitness', icon: 'walk' },
  { id: 'recomposition', label: 'Body recomposition', icon: 'sync' },
  { id: 'consistency', label: 'Become more consistent', icon: 'checkCircle' },
  { id: 'specific_areas', label: 'Focus on specific body areas', icon: 'measurements' },
];

export type PreviewBodyArea = {
  id: string;
  label: string;
  view: 'front' | 'back';
};

export const previewBodyAreas: PreviewBodyArea[] = [
  { id: 'shoulders', label: 'Shoulders', view: 'front' },
  { id: 'chest', label: 'Chest', view: 'front' },
  { id: 'arms', label: 'Arms', view: 'front' },
  { id: 'core', label: 'Core / waist', view: 'front' },
  { id: 'thighs', label: 'Thighs', view: 'front' },
  { id: 'upper_back', label: 'Upper back / lats', view: 'back' },
  { id: 'glutes', label: 'Glutes', view: 'back' },
  { id: 'calves', label: 'Calves', view: 'back' },
];

export const previewPersonalRecords = [
  { exercise: 'Incline Dumbbell Press', value: '22 kg × 11', date: '3 days ago' },
  { exercise: 'Flat Barbell Bench Press', value: '60 kg × 5', date: '1 week ago' },
  { exercise: 'Seated Cable Row', value: '52 kg × 10', date: '2 weeks ago' },
];

export const previewConsistencyWeeks = [3, 4, 2, 4, 3, 4];
