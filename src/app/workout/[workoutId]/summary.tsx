import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { StatChip } from '@/components/ui/stat-chip';
import { previewWorkoutSummary } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flex: 1, gap: spacing.four, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: spacing.two }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.pill,
              backgroundColor: colors.status.positiveSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="checkCircle" color={colors.status.positive} size={36} />
          </View>
          <Heading variant="title" align="center">
            Workout complete
          </Heading>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.two, justifyContent: 'center' }}>
          <StatChip
            icon="checkCircle"
            label={`${previewWorkoutSummary.completedExercises} exercises`}
          />
          <StatChip icon="checkCircle" label={`${previewWorkoutSummary.completedSets} sets`} />
          <StatChip icon="timer" label={`${previewWorkoutSummary.totalDurationMinutes} min`} />
        </View>

        {previewWorkoutSummary.newPersonalRecords.length > 0 ? (
          <Card style={{ gap: spacing.one, backgroundColor: colors.status.positiveSubtle }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.one }}>
              <Icon name="trophy" color={colors.status.positive} size={18} />
              <Caption style={{ color: colors.status.positive }}>NEW PERSONAL RECORD</Caption>
            </View>
            {previewWorkoutSummary.newPersonalRecords.map((record) => (
              <AppText key={record} style={{ color: colors.status.positive }}>
                {record}
              </AppText>
            ))}
          </Card>
        ) : null}

        <PrimaryButton
          label="Done"
          fullWidth={false}
          onPress={() => router.replace('/(tabs)/today')}
        />
      </View>
    </Screen>
  );
}
