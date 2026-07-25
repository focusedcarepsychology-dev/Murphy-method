import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { BodyScanAlignmentGuide } from '@/components/bodyscan/body-scan-alignment-guide';
import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import {
  createBodyScanSignedUrls,
  imageForAngle,
  listBodyScans,
  type BodyScanImageAngle,
} from '@/services/bodyscan/bodyscan-repository';

const ANGLES: Extract<BodyScanImageAngle, 'front' | 'side' | 'back'>[] = ['front', 'side', 'back'];

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

export default function BodyScanCompareScreen() {
  const { olderId, newerId } = useLocalSearchParams<{ olderId?: string; newerId?: string }>();
  const { spacing } = useTheme();
  const [angle, setAngle] =
    useState<Extract<BodyScanImageAngle, 'front' | 'side' | 'back'>>('front');
  const [opacity, setOpacity] = useState(0.5);

  const { status, data, reload } = useAuthenticatedData(
    async (client, userId) => {
      const scans = await listBodyScans(client, userId);
      const defaultNewer = scans[0] ?? null;
      const defaultOlder = scans[scans.length - 1] ?? null;
      const older = scans.find((scan) => scan.id === olderId) ?? defaultOlder;
      const newer = scans.find((scan) => scan.id === newerId) ?? defaultNewer;
      const images = [...(older?.images ?? []), ...(newer?.images ?? [])];
      const signedUrls = await createBodyScanSignedUrls(client, images);
      return { scans, older, newer, signedUrls };
    },
    [olderId, newerId],
  );

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading BodyScan comparison" rows={5} />
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

  if (!data.older || !data.newer || data.older.id === data.newer.id) {
    return (
      <ScrollScreen>
        <Card>
          <EmptyState
            icon="camera"
            title="Two BodyScans are needed"
            description="Add another progress check before using the comparison view."
          />
        </Card>
      </ScrollScreen>
    );
  }

  const olderImage = imageForAngle(data.older, angle);
  const newerImage = imageForAngle(data.newer, angle);
  const olderUrl = olderImage ? data.signedUrls.get(olderImage.id) : undefined;
  const newerUrl = newerImage ? data.signedUrls.get(newerImage.id) : undefined;

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Compare BodyScans</Heading>
        <Caption style={{ flexShrink: 1 }}>
          Earlier: {displayDate(data.older.capturedOn)} · Later:{' '}
          {displayDate(data.newer.capturedOn)}
        </Caption>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.two }}>
        {ANGLES.map((option) => (
          <SecondaryButton
            key={option}
            label={option[0].toUpperCase() + option.slice(1)}
            onPress={() => setAngle(option)}
            disabled={angle === option}
            fullWidth={false}
          />
        ))}
      </View>

      {!olderUrl || !newerUrl ? (
        <Card>
          <EmptyState
            icon="camera"
            title={`${angle[0].toUpperCase() + angle.slice(1)} photos unavailable`}
            description="Both selected BodyScans need the same angle for comparison."
          />
        </Card>
      ) : (
        <>
          <View style={{ gap: spacing.two }}>
            <Heading variant="bodyEmphasis">Side by side</Heading>
            <View style={{ flexDirection: 'row', gap: spacing.two }}>
              {[
                { label: 'Earlier', uri: olderUrl },
                { label: 'Later', uri: newerUrl },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, minWidth: 0, gap: spacing.one }}>
                  <Caption>{item.label}</Caption>
                  <View style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: item.uri }}
                      style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 14 }}
                      contentFit="cover"
                      accessibilityLabel={`${item.label} ${angle} BodyScan photo`}
                    />
                    <BodyScanAlignmentGuide
                      angle={angle}
                      transparent
                      style={{ position: 'absolute', inset: 0 }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={{ gap: spacing.two }}>
            <Heading variant="bodyEmphasis">Overlay</Heading>
            <Card style={{ gap: spacing.two }}>
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: olderUrl }}
                  style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 14 }}
                  contentFit="cover"
                  accessibilityLabel={`Earlier ${angle} BodyScan photo`}
                />
                <Image
                  source={{ uri: newerUrl }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: 14,
                    opacity,
                  }}
                  contentFit="cover"
                  accessibilityLabel={`Later ${angle} BodyScan overlay`}
                />
                <BodyScanAlignmentGuide
                  angle={angle}
                  transparent
                  style={{ position: 'absolute', inset: 0 }}
                />
              </View>
              <Caption>Later photo opacity: {Math.round(opacity * 100)}%</Caption>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.two }}>
                {[0.25, 0.5, 0.75].map((value) => (
                  <SecondaryButton
                    key={value}
                    label={`${Math.round(value * 100)}%`}
                    onPress={() => setOpacity(value)}
                    disabled={opacity === value}
                    fullWidth={false}
                  />
                ))}
              </View>
            </Card>
          </View>
        </>
      )}

      <Card style={{ gap: spacing.one }}>
        <AppText variant="bodyEmphasis">Use comparisons cautiously</AppText>
        <Caption style={{ flexShrink: 1 }}>
          Differences can reflect camera height, distance, lighting, clothing, hydration or posture.
          The alignment overlay helps standardise positioning but does not turn photographs into
          clinical measurements.
        </Caption>
      </Card>
    </ScrollScreen>
  );
}
