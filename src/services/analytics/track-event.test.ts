import {
  sanitiseAnalyticsProperties,
  setAnalyticsSink,
  trackEvent,
  type AnalyticsEvent,
} from './track-event';

describe('analytics wrapper', () => {
  afterEach(() => setAnalyticsSink(null));

  it('drops sensitive/health-like property keys', () => {
    expect(
      sanitiseAnalyticsProperties({
        cohort: 'beta-01',
        session_index: 2,
        weight_kg: 70,
        email: 'person@example.com',
        injury_notes: 'sensitive',
      }),
    ).toEqual({ cohort: 'beta-01', session_index: 2 });
  });

  it('emits safe events to the configured sink', () => {
    const seen: AnalyticsEvent[] = [];
    setAnalyticsSink((event) => seen.push(event));

    trackEvent({ name: 'workout_completed', properties: { cohort: 'beta-01' } });

    expect(seen).toHaveLength(1);
    expect(seen[0].name).toBe('workout_completed');
    expect(seen[0].properties).toEqual({ cohort: 'beta-01' });
  });

  it('never throws when the analytics provider fails', () => {
    setAnalyticsSink(() => {
      throw new Error('provider unavailable');
    });

    expect(() => trackEvent({ name: 'workout_completed' })).not.toThrow();
  });
});
