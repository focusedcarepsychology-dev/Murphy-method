import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { describeProgrammeVersion, formatVersionDate } from '@/domain/programme/version-history';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import {
  loadCurrentProgramme,
  loadProgrammeVersionHistory,
} from '@/services/training/training-repository';

export default function ProgrammeHistoryScreen() {
  const { spacing } = useTheme();

  const { status, data, reload } = useAuthenticatedData(async (client, userId) => {
    const programme = await loadCurrentProgramme(client, userId);
    if (!programme) return { versions: [] };
    return { versions: await loadProgrammeVersionHistory(client, programme.id) };
  });

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <Heading variant="title">Programme history</Heading>
        <LoadingState accessibilityLabel="Loading your programme history" rows={3} />
      </ScrollScreen>
    );
  }

  if (status === 'error' || !data) {
    return (
      <ScrollScreen>
        <Heading variant="title">Programme history</Heading>
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      </ScrollScreen>
    );
  }

  if (data.versions.length === 0) {
    return (
      <ScrollScreen>
        <Heading variant="title">Programme history</Heading>
        <Card>
          <EmptyState
            icon="history"
            title="No programme versions yet"
            description="Every version of your plan is recorded here with the reason it changed."
          />
        </Card>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <Heading variant="title">Programme history</Heading>
      <View style={{ gap: spacing.three }}>
        {data.versions.map((version) => {
          const description = describeProgrammeVersion(version.engineVersion);
          return (
            <Card key={version.id} style={{ gap: spacing.one }}>
              <Caption>
                V{version.versionNumber} · {formatVersionDate(version.createdAt)}
              </Caption>
              <AppText variant="bodyEmphasis">{description.title}</AppText>
              <AppText color="secondary">{description.detail}</AppText>
              <Caption color="tertiary">Engine: {version.engineVersion}</Caption>
            </Card>
          );
        })}
      </View>
    </ScrollScreen>
  );
}
