import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { describePlanRationale } from '@/domain/programme/rationale';
import { parseProgrammeStructure } from '@/domain/programme/structure';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadCurrentProgramme } from '@/services/training/training-repository';

export default function WhyChangedScreen() {
  const { spacing } = useTheme();

  const { status, data, reload } = useAuthenticatedData(async (client, userId) => {
    const programme = await loadCurrentProgramme(client, userId);
    if (!programme?.currentVersion) return null;
    return {
      structure: parseProgrammeStructure(programme.currentVersion.structure),
      versionNumber: programme.currentVersion.versionNumber,
    };
  });

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <Heading variant="title">Why this plan?</Heading>
        <LoadingState accessibilityLabel="Loading your plan reasoning" rows={3} />
      </ScrollScreen>
    );
  }

  if (status === 'error') {
    return (
      <ScrollScreen>
        <Heading variant="title">Why this plan?</Heading>
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      </ScrollScreen>
    );
  }

  const reasons = data ? describePlanRationale(data.structure) : [];

  return (
    <ScrollScreen>
      <Heading variant="title">Why this plan?</Heading>
      {reasons.length === 0 ? (
        <Card>
          <EmptyState
            icon="help"
            title="Nothing to explain yet"
            description="Once your programme is built, this screen lists the answers it was built from."
          />
        </Card>
      ) : (
        <Card style={{ gap: spacing.two }}>
          {reasons.map((reason) => (
            <AppText key={reason} color="secondary">
              {reason}
            </AppText>
          ))}
        </Card>
      )}
      {data && !data.structure.hasExercises ? (
        <View style={{ gap: spacing.one }}>
          <AppText color="tertiary">
            This version records your preferences and session structure. It does not contain
            selected exercises yet.
          </AppText>
        </View>
      ) : null}
    </ScrollScreen>
  );
}
