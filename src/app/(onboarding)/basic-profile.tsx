import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';

export default function BasicProfileScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      stepIndex={1}
      title="A little about you"
      description="Date of birth, height, weight, and your preferred units. Real fields and validation are wired once onboarding writes to a profile (Phase 3)."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/main-goal')}
    >
      <AppText color="tertiary">Form fields land in Phase 3.</AppText>
    </OnboardingScaffold>
  );
}
