import {
  SAFETY_SCREENING_QUESTIONS,
  SAFETY_SCREENING_QUESTION_KEYS,
  isCompleteSafetyScreeningAnswers,
} from '@/domain/onboarding/safety-screening';

describe('safety screening client catalog (docs/MASTER_SPEC.md §8.1)', () => {
  it('has one question per required key, in a stable order', () => {
    expect(SAFETY_SCREENING_QUESTIONS.map((q) => q.key)).toEqual(SAFETY_SCREENING_QUESTION_KEYS);
  });

  it('rejects an empty or partial answer set', () => {
    expect(isCompleteSafetyScreeningAnswers({})).toBe(false);
    expect(isCompleteSafetyScreeningAnswers({ heart_condition_supervised_only: false })).toBe(
      false,
    );
  });

  it('rejects a non-boolean value for a required key', () => {
    const almostComplete: Record<string, unknown> = {};
    for (const key of SAFETY_SCREENING_QUESTION_KEYS) almostComplete[key] = false;
    almostComplete.chest_pain_at_rest = 'no';
    expect(isCompleteSafetyScreeningAnswers(almostComplete)).toBe(false);
  });

  it('accepts a full boolean answer set for every question', () => {
    const answers: Record<string, unknown> = {};
    for (const key of SAFETY_SCREENING_QUESTION_KEYS) answers[key] = false;
    expect(isCompleteSafetyScreeningAnswers(answers)).toBe(true);
  });
});
