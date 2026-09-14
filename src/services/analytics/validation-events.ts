import { trackEvent, type AnalyticsScalar } from './track-event';

export const VALIDATION_EVENT_NAMES = [
  'validation_cohort_joined',
  'onboarding_started',
  'onboarding_completed',
  'first_plan_ready',
  'workout_started',
  'workout_completed',
  'weekly_checkin_completed',
  'accountability_action_completed',
  'pay_intent_prompted',
  'pay_intent_positive',
  'pay_intent_negative',
  'checkout_started',
  'paid_conversion',
  'subscription_cancelled',
] as const;

export type ValidationEventName = (typeof VALIDATION_EVENT_NAMES)[number];

export type ValidationEventProperties = {
  cohort?: string;
  cohortDay?: number;
  acquisitionSource?: string;
  experimentId?: string;
  variant?: string;
  sessionIndex?: number;
  workoutMode?: 'full' | 'quick' | 'minimum' | 'other';
  completed?: boolean;
  payBand?: string;
  currency?: string;
  productTier?: string;
};

function toAnalyticsProperties(
  properties: ValidationEventProperties,
): Record<string, AnalyticsScalar | undefined> {
  return {
    cohort: properties.cohort,
    cohort_day: properties.cohortDay,
    acquisition_source: properties.acquisitionSource,
    experiment_id: properties.experimentId,
    variant: properties.variant,
    session_index: properties.sessionIndex,
    workout_mode: properties.workoutMode,
    completed: properties.completed,
    pay_band: properties.payBand,
    currency: properties.currency,
    product_tier: properties.productTier,
  };
}

/**
 * Commercial validation helper. Only categorical/non-health properties belong
 * here; physical measurements, diagnoses, injuries, images and free text are
 * intentionally outside this contract.
 */
export function trackValidationEvent(
  name: ValidationEventName,
  properties: ValidationEventProperties = {},
): void {
  trackEvent({ name, properties: toAnalyticsProperties(properties) });
}
