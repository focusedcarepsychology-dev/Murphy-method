/**
 * Safety Screening question catalog (`MASTER_SPEC.md` §8.1,
 * `DATABASE_SCHEMA.md` §4 `health_screenings`). The client only renders
 * these questions and collects yes/no answers — it never derives
 * `requires_clearance`/`restriction_flags` itself; that happens exclusively
 * in the trusted, versioned, deterministic server-side rule set
 * (`public.submit_safety_screening`,
 * supabase/migrations/20260724080100_onboarding_safety_rpc.sql), which this
 * catalog's question keys and version string must stay in sync with.
 *
 * DEVELOPMENT WORDING NOTICE: this question set and its supportive/
 * non-alarmist framing is a complete, functional, deterministic screening
 * sufficient for Phase 3 to work end-to-end and for its rule-derivation
 * logic to be tested — it is explicitly **not** final legal/clinical
 * copy. `docs/OPEN_QUESTIONS.md` #5 tracks that a qualified clinical/legal
 * reviewer must sign off on the exact wording and disclaimer before public
 * beta (`RISKS.md` #1).
 *
 * These questions are original wording inspired by the general,
 * well-established category of physical-activity-readiness screening
 * (self-reported yes/no questions about cardiac symptoms, medication,
 * joint/bone limitations, and pregnancy) — not a reproduction of any
 * specific copyrighted instrument.
 */

export const SAFETY_SCREENING_VERSION = 'murphy-safety-v1';

export const SAFETY_SCREENING_QUESTION_KEYS = [
  'heart_condition_supervised_only',
  'chest_pain_during_activity',
  'chest_pain_at_rest',
  'dizziness_or_balance_loss',
  'bone_or_joint_problem',
  'blood_pressure_or_heart_medication',
  'pregnant_or_recent_postpartum',
] as const;

export type SafetyScreeningQuestionKey = (typeof SAFETY_SCREENING_QUESTION_KEYS)[number];

export type SafetyScreeningAnswers = Record<SafetyScreeningQuestionKey, boolean>;

export type SafetyScreeningQuestion = {
  key: SafetyScreeningQuestionKey;
  prompt: string;
  helpText?: string;
};

export const SAFETY_SCREENING_QUESTIONS: SafetyScreeningQuestion[] = [
  {
    key: 'heart_condition_supervised_only',
    prompt:
      'Has a doctor ever told you that you have a heart condition and that you should only do physical activity recommended by a doctor?',
  },
  {
    key: 'chest_pain_during_activity',
    prompt: 'Do you feel pain in your chest when you do physical activity?',
  },
  {
    key: 'chest_pain_at_rest',
    prompt: 'In the past month, have you had chest pain when you were not doing physical activity?',
  },
  {
    key: 'dizziness_or_balance_loss',
    prompt: 'Do you ever lose your balance because of dizziness, or lose consciousness?',
  },
  {
    key: 'bone_or_joint_problem',
    prompt:
      'Do you have a bone or joint problem that could be made worse by a change in your physical activity?',
    helpText: 'For example, a recent injury or a condition that flares up with certain movements.',
  },
  {
    key: 'blood_pressure_or_heart_medication',
    prompt:
      'Is a doctor currently prescribing you medication for your blood pressure or a heart condition?',
  },
  {
    key: 'pregnant_or_recent_postpartum',
    prompt: 'Are you currently pregnant, or have you given birth in the last 6 months?',
    helpText: 'Answer no if this doesn’t apply to you.',
  },
];

export function isCompleteSafetyScreeningAnswers(
  value: Partial<Record<string, unknown>>,
): value is SafetyScreeningAnswers {
  return SAFETY_SCREENING_QUESTION_KEYS.every((key) => typeof value[key] === 'boolean');
}
