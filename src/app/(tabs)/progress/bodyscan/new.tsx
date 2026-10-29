import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { BodyScanAlignmentGuide } from '@/components/bodyscan/body-scan-alignment-guide';
import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { listBodyScans } from '@/services/bodyscan/bodyscan-repository';
import {
  hasGrantedBodyScanConsent,
  recordBodyScanConsent,
} from '@/services/onboarding/onboarding-repository';
import {
  captureBodyScanPhoto,
  uploadBodyScan,
  type BodyScanAngle,
} from '@/services/onboarding/bodyscan-upload';

const ANGLES: BodyScanAngle[] = ['front', 'side', 'back'];
const ANGLE_LABEL: Record<BodyScanAngle, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
};

export default function NewBodyScanScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();
  const [captures, setCaptures] = useState<Partial<Record<BodyScanAngle, string>>>({});
  const [busyAngle, setBusyAngle] = useState<BodyScanAngle | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { status, data, reload } = useAuthenticatedData(async (authClient, id) => {
    const [consented, scans] = await Promise.all([
      hasGrantedBodyScanConsent(authClient, id),
      listBodyScans(authClient, id),
    ]);
    return { consented, scans };
  });

  const nextMissingAngle = useMemo(
    () => ANGLES.find((angle) => !captures[angle]) ?? null,
    [captures],
  );

  async function acceptConsent() {
    if (!userId) return;
    setSaving(true);
    setActionError(null);
    try {
      await recordBodyScanConsent(client, userId, true, 'bodyscan-capture-v1');
      reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save your consent.');
    } finally {
      setSaving(false);
    }
  }

  async function capture(angle: BodyScanAngle) {
    setBusyAngle(angle);
    setActionError(null);
    try {
      const outcome = await captureBodyScanPhoto();
      if (outcome.outcome === 'permission_denied') {
        setActionError('Camera permission is required to take a BodyScan photo.');
      } else if (outcome.outcome === 'captured') {
        setCaptures((current) => ({ ...current, [angle]: outcome.uri }));
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not open the camera.');
    } finally {
      setBusyAngle(null);
    }
  }

  async function saveScan() {
    if (!userId || !data || nextMissingAngle || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      const purpose = data.scans.length === 0 ? 'baseline' : 'progress_check';
      await uploadBodyScan(
        client,
        userId,
        purpose,
        ANGLES.map((angle) => ({ angle, uri: captures[angle]! })),
      );
      router.replace('/(tabs)/progress/bodyscan');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save your BodyScan.');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Preparing BodyScan" rows={4} />
      </ScrollScreen>
    );
  }

  if (status === 'error' || !data) {
    return (
      <ScrollScreen>
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      </ScrollScreen>
    );
  }

  if (!data.consented) {
    return (
      <ScrollScreen>
        <Heading variant="title">Private BodyScan consent</Heading>
        <Card style={{ gap: spacing.two }}>
          <AppText style={{ flexShrink: 1 }}>
            BodyScan stores optional progress photos in a private Supabase bucket. Photos are used
            only for your own timeline and comparisons. This version performs no automated analysis
            and makes no body-fat or medical assessment.
          </AppText>
          <Caption style={{ flexShrink: 1 }}>
            You can decline by going back. Nothing is captured or uploaded until you actively take
            and save the photos.
          </Caption>
          {actionError ? <AppText color="critical">{actionError}</AppText> : null}
          <PrimaryButton
            label="I understand and continue"
            onPress={acceptConsent}
            loading={saving}
          />
          <SecondaryButton label="Not now" onPress={() => router.back()} />
        </Card>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">
          {data.scans.length === 0 ? 'Create your baseline' : 'New progress check'}
        </Heading>
        <Caption style={{ flexShrink: 1 }}>
          Use the same room, lighting, distance, clothing and time of day where practical.
        </Caption>
      </View>

      <Card style={{ gap: spacing.one }}>
        <AppText variant="bodyEmphasis">Positioning guide</AppText>
        <Caption style={{ flexShrink: 1 }}>
          Place the phone upright at roughly waist height. Keep the full body inside the frame,
          align your head and torso with the centre line, and place both feet on the markers. Stand
          naturally rather than flexing or forcing posture.
        </Caption>
      </Card>

      {actionError ? (
        <Card>
          <AppText color="critical" style={{ flexShrink: 1 }}>
            {actionError}
          </AppText>
        </Card>
      ) : null}

      {ANGLES.map((angle) => {
        const uri = captures[angle];
        return (
          <View key={angle} style={{ gap: spacing.two }}>
            <View style={{ gap: spacing.one }}>
              <Heading variant="bodyEmphasis">{ANGLE_LABEL[angle]} photo</Heading>
              <Caption>
                {angle === 'side'
                  ? 'Turn exactly sideways and keep your feet together on the markers.'
                  : 'Face directly ' +
                    (angle === 'front' ? 'towards' : 'away from') +
                    ' the camera.'}
              </Caption>
            </View>

            <View style={{ position: 'relative' }}>
              {uri ? (
                <Image
                  source={{ uri }}
                  style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 18 }}
                  contentFit="cover"
                  accessibilityLabel={`${ANGLE_LABEL[angle]} BodyScan preview`}
                />
              ) : (
                <BodyScanAlignmentGuide angle={angle} />
              )}
              {uri ? (
                <BodyScanAlignmentGuide
                  angle={angle}
                  transparent
                  style={{ position: 'absolute', inset: 0 }}
                />
              ) : null}
            </View>

            <SecondaryButton
              label={
                uri
                  ? `Retake ${ANGLE_LABEL[angle].toLowerCase()} photo`
                  : `Capture ${ANGLE_LABEL[angle].toLowerCase()} photo`
              }
              onPress={() => capture(angle)}
              loading={busyAngle === angle}
              disabled={busyAngle !== null && busyAngle !== angle}
            />
          </View>
        );
      })}

      <PrimaryButton
        label={
          nextMissingAngle
            ? `Capture ${ANGLE_LABEL[nextMissingAngle].toLowerCase()} photo first`
            : 'Save private BodyScan'
        }
        onPress={saveScan}
        loading={saving}
        disabled={nextMissingAngle !== null}
      />

      <Caption color="tertiary" style={{ flexShrink: 1 }}>
        Visual comparisons are affected by lighting, camera position, clothing, hydration and
        posture. They should be treated as personal reference photos, not clinical measurements.
      </Caption>
    </ScrollScreen>
  );
}
