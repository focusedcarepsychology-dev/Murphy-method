import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';

export default function WorkoutDurationScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      stepIndex={8}
      title="How long should sessions be?"
      description="Your target session length shapes how we size each workout."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/safety-screening')}
    >
      <AppText color="tertiary">Duration selector lands in Phase 3.</AppText>
    </OnboardingScaffold>
  );
}
