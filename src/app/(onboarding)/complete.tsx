import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.four }}>
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
        <View style={{ gap: spacing.one, alignItems: 'center' }}>
          <Heading variant="title" align="center">
            You&apos;re all set
          </Heading>
          <AppText color="secondary" align="center" style={{ maxWidth: 300 }}>
            Your plan is ready. Let&apos;s get to your first session.
          </AppText>
        </View>
        <PrimaryButton
          label="Continue to Today"
          fullWidth={false}
          onPress={() => router.replace('/(tabs)/today')}
        />
      </View>
    </Screen>
  );
}
