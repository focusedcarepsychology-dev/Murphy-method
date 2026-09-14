export type AnalyticsScalar = string | number | boolean;

export type AnalyticsEventInput = {
  name: string;
  properties?: Record<string, AnalyticsScalar | null | undefined>;
};

export type AnalyticsEvent = {
  name: string;
  properties: Record<string, AnalyticsScalar>;
  occurredAt: string;
};

export type AnalyticsSink = (event: AnalyticsEvent) => void | Promise<void>;

const SENSITIVE_PROPERTY_KEY =
  /(email|name|phone|address|postcode|weight|height|measurement|body[_-]?scan|image|injury|condition|diagnos|medication|notes?|free[_-]?text|message|health)/i;

let sink: AnalyticsSink | null = null;

/**
 * Installs the analytics transport. The commercial/validation event contract is
 * intentionally independent of any vendor (PostHog, Amplitude, Supabase, etc.).
 */
export function setAnalyticsSink(nextSink: AnalyticsSink | null): void {
  sink = nextSink;
}

export function sanitiseAnalyticsProperties(
  properties: AnalyticsEventInput['properties'] = {},
): Record<string, AnalyticsScalar> {
  const safe: Record<string, AnalyticsScalar> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (value == null || SENSITIVE_PROPERTY_KEY.test(key)) continue;
    safe[key] = value;
  }

  return safe;
}

/**
 * Fire-and-forget by contract. Analytics must never block a workout, onboarding,
 * navigation, or any other user-facing action.
 */
export function trackEvent(input: AnalyticsEventInput): void {
  if (!sink || !input.name.trim()) return;

  const event: AnalyticsEvent = {
    name: input.name.trim(),
    properties: sanitiseAnalyticsProperties(input.properties),
    occurredAt: new Date().toISOString(),
  };

  try {
    const result = sink(event);
    if (result && typeof (result as Promise<void>).catch === 'function') {
      void (result as Promise<void>).catch(() => undefined);
    }
  } catch {
    // Product telemetry is deliberately non-blocking.
  }
}
