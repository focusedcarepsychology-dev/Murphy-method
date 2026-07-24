import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText, Caption } from '@/components/ui/app-text';
import { SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import type { BodyScanAngle } from '@/services/onboarding/bodyscan-upload';
import {
  captureBodyScanPhoto,
  uploadBodyScanBaseline,
} from '@/services/onboarding/bodyscan-upload';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import { hasGrantedBodyScanConsent } from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

const ANGLES: { key: BodyScanAngle; label: string; guidance: string }[] = [
  {
    key: 'front',
    label: 'Front',
    guidance: 'Face the camera directly, arms relaxed at your sides.',
  },
  { key: 'side', label: 'Side', guidance: 'Turn 90°, standing tall, arms relaxed.' },
  { key: 'back', label: 'Back', guidance: 'Face away from the camera, arms relaxed.' },
];

/**
 * Consent is checked before any capture UI is shown at all
 * (docs/IMPLEMENTATION_PLAN.md Phase 3 §18) — declining/skipping consent
 * on the previous screen means this screen never offers capture, only
 * Skip.
 */
export default function BodyScanBaselineScreen() {
  const router = useRouter();
  const { spacing, colors, radius } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [consented, setConsented] = useState(false);
  const [captures, setCaptures] = useState<Partial<Record<BodyScanAngle, string>>>({});
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function load() {
    if (!userId) return;
    hasGrantedBodyScanConsent(client, userId)
      .then((granted) => {
        setConsented(granted);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }

  function retry() {
    setStatus('loading');
    load();
  }

  useEffect(load, [client, userId]);

  async function handleCapture(angle: BodyScanAngle) {
    setCaptureError(null);
    const result = await captureBodyScanPhoto();
    if (result.outcome === 'permission_denied') {
      setCaptureError(
        'Camera access is needed to capture a BodyScan photo. You can skip this instead.',
      );
      return;
    }
    if (result.outcome === 'cancelled') return;
    setCaptures((current) => ({ ...current, [angle]: result.uri }));
  }

  async function handleNext() {
    const captured = Object.entries(captures) as [BodyScanAngle, string][];
    if (captured.length === 0 || !userId) {
      router.push('/(onboarding)/coaching-style');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await uploadBodyScanBaseline(
        client,
        userId,
        captured.map(([angle, uri]) => ({ angle, uri })),
      );
      router.push('/(onboarding)/coaching-style');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setUploading(false);
    }
  }

  if (status === 'loading') {
    return (
      <OnboardingScaffold
        stepIndex={12}
        title="Capture your baseline"
        onNext={() => {}}
        nextDisabled
      >
        <LoadingState accessibilityLabel="Loading" rows={2} />
      </OnboardingScaffold>
    );
  }

  if (status === 'error') {
    return (
      <OnboardingScaffold
        stepIndex={12}
        title="Capture your baseline"
        onNext={() => {}}
        nextDisabled
      >
        <ErrorState onRetry={retry} />
      </OnboardingScaffold>
    );
  }

  if (!consented) {
    return (
      <OnboardingScaffold
        stepIndex={12}
        title="Capture your baseline"
        nextLabel="Continue"
        onBack={() => router.back()}
        onNext={() => router.push('/(onboarding)/coaching-style')}
      >
        <AppText color="secondary">
          You skipped BodyScan consent, so there&apos;s nothing to capture here. You can turn it on
          any time later from Profile.
        </AppText>
      </OnboardingScaffold>
    );
  }

  const capturedCount = Object.keys(captures).length;

  return (
    <OnboardingScaffold
      stepIndex={12}
      title="Capture your baseline"
      description="Guided front, side, and back photos. Fully skippable — you can add these later from Progress."
      nextLabel={capturedCount > 0 ? 'Save & Continue' : 'Skip for now'}
      onBack={() => router.back()}
      onNext={handleNext}
      nextLoading={uploading}
    >
      <View style={{ gap: spacing.three }}>
        {captureError ? <AppText color="critical">{captureError}</AppText> : null}
        {uploadError ? <AppText color="critical">{uploadError}</AppText> : null}

        {ANGLES.map((angle) => {
          const captured = Boolean(captures[angle.key]);
          return (
            <Card
              key={angle.key}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: captured ? colors.status.positiveSubtle : colors.surface.sunken,
                }}
              >
                <Icon
                  name={captured ? 'checkCircle' : 'camera'}
                  color={captured ? colors.status.positive : colors.text.secondary}
                  size={20}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyEmphasis">{angle.label}</AppText>
                <Caption>{angle.guidance}</Caption>
              </View>
              <SecondaryButton
                label={captured ? 'Retake' : 'Capture'}
                fullWidth={false}
                onPress={() => handleCapture(angle.key)}
                disabled={uploading}
              />
            </Card>
          );
        })}
      </View>
    </OnboardingScaffold>
  );
}
