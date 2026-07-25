import type { CoachingStyle } from '@/domain/onboarding/types';

export type WeeklyObservation = { title: string; body: string };

export function buildWeeklyObservation(
  style: CoachingStyle | null,
  completed: number,
  planned: number,
): WeeklyObservation {
  const safePlanned = Math.max(1, planned);
  const remaining = Math.max(0, safePlanned - completed);
  const metPlan = completed >= safePlanned;

  switch (style) {
    case 'direct':
      return {
        title: metPlan
          ? 'Weekly target complete'
          : `${remaining} planned session${remaining === 1 ? '' : 's'} remaining`,
        body: `${completed} of ${safePlanned} planned sessions are complete. Choose Full, Quick or Minimum based on the time and energy you genuinely have.`,
      };
    case 'analytical':
      return {
        title: metPlan
          ? 'Weekly completion is on target'
          : 'Weekly completion is still in progress',
        body: `Completed sessions: ${completed}. Planned sessions: ${safePlanned}. Quick and Minimum sessions count because the adherence signal is completion, not workout length.`,
      };
    case 'competitive':
      return {
        title: metPlan ? 'Target beaten' : 'Your next personal target is clear',
        body: metPlan
          ? `You completed ${completed} sessions against a plan of ${safePlanned}. Keep the win sustainable rather than adding volume only for points.`
          : `Complete ${remaining} more planned session${remaining === 1 ? '' : 's'} to beat this week's target. Any completed mode counts.`,
      };
    case 'calm_minimal':
      return {
        title: metPlan ? 'Plan complete' : 'Keep going',
        body: `${completed} of ${safePlanned} sessions complete.`,
      };
    case 'supportive':
    default:
      return {
        title: metPlan
          ? 'You met your weekly plan'
          : completed > 0
            ? 'You are building momentum'
            : 'This week is still open',
        body: `${completed} of ${safePlanned} planned sessions completed. Minimum and Quick sessions count because adapting the plan is better than abandoning it.`,
      };
  }
}
