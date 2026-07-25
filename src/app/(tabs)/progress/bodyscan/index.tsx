import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { BodyScanAlignmentGuide } from '@/components/bodyscan/body-scan-alignment-guide';
import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
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
} from '@/services/bodyscan/bodyscan-repository';

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

export default function BodyScanTimelineScreen() {
  const router = useRouter();
  const { spacing } = useTheme();

  const { status, data, reload } = useAuthenticatedData(async (client, userId) => {
    const scans = await listBodyScans(client, userId);
    const thumbnailImages = scans
      .map((scan) => imageForAngle(scan, 'front') ?? scan.images[0] ?? null)
      .filter((image): image is NonNullable<typeof image> => image !== null);
    const signedUrls = await createBodyScanSignedUrls(client, thumbnailImages);
    return { scans, signedUrls };
  });

  const scans = data?.scans ?? [];
  const newest = scans[0] ?? null;
  const oldest = scans[scans.length - 1] ?? null;

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">BodyScan</Heading>
        <Caption style={{ flexShrink: 1 }}>
          Optional private reference photos for consistent visual comparison over time.
        </Caption>
      </View>

      {status === 'loading' ? (
        <LoadingState accessibilityLabel="Loading BodyScan history" rows={4} />
      ) : status === 'error' || !data ? (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      ) : scans.length === 0 ? (
        <Card>
          <EmptyState
            icon="camera"
            title="BodyScan is optional"
            description="Create standardised front, side and back photos when you are ready. Nothing is captured automatically."
            actionLabel="Create baseline"
            onAction={() => router.push('/(tabs)/progress/bodyscan/new')}
          />
        </Card>
      ) : (
        <>
          <PrimaryButton
            label="Add progress check"
            onPress={() => router.push('/(tabs)/progress/bodyscan/new')}
          />
          {oldest && newest && oldest.id !== newest.id ? (
            <SecondaryButton
              label="Compare first and latest"
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/progress/bodyscan/compare',
                  params: { olderId: oldest.id, newerId: newest.id },
                })
              }
            />
          ) : null}

          <View style={{ gap: spacing.three }}>
            {scans.map((scan) => {
              const thumbnail = imageForAngle(scan, 'front') ?? scan.images[0] ?? null;
              const thumbnailUrl = thumbnail ? data.signedUrls.get(thumbnail.id) : undefined;
              return (
                <Card key={scan.id} style={{ gap: spacing.two }}>
                  <View
                    style={{ flexDirection: 'row', gap: spacing.three, alignItems: 'flex-start' }}
                  >
                    {thumbnailUrl ? (
                      <View style={{ width: 96, position: 'relative' }}>
                        <Image
                          source={{ uri: thumbnailUrl }}
                          style={{ width: 96, aspectRatio: 3 / 4, borderRadius: 12 }}
                          contentFit="cover"
                          accessibilityLabel={`BodyScan from ${displayDate(scan.capturedOn)}`}
                        />
                        <BodyScanAlignmentGuide
                          angle={
                            thumbnail?.angle === 'side'
                              ? 'side'
                              : thumbnail?.angle === 'back'
                                ? 'back'
                                : 'front'
                          }
                          transparent
                          style={{ position: 'absolute', inset: 0 }}
                        />
                      </View>
                    ) : null}
                    <View style={{ flex: 1, minWidth: 0, gap: spacing.one }}>
                      <Heading variant="bodyEmphasis" style={{ flexShrink: 1 }}>
                        {displayDate(scan.capturedOn)}
                      </Heading>
                      <Caption>
                        {scan.purpose === 'baseline' ? 'Baseline' : 'Progress check'}
                      </Caption>
                      <AppText color="secondary" style={{ flexShrink: 1 }}>
                        {scan.images.length} private {scan.images.length === 1 ? 'photo' : 'photos'}{' '}
                        · {scan.images.map((image) => image.angle.replace('_', ' ')).join(' · ')}
                      </AppText>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      )}

      <Card style={{ gap: spacing.one }}>
        <AppText variant="bodyEmphasis">Privacy and interpretation</AppText>
        <Caption style={{ flexShrink: 1 }}>
          Photos remain in a private bucket and are opened with short-lived signed links. Lighting,
          distance, clothing and posture can change appearance; the app does not calculate body fat
          or make medical claims from these images.
        </Caption>
      </Card>
    </ScrollScreen>
  );
}
