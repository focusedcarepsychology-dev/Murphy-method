import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';

export default function AvailabilityScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      stepIndex={7}
      title="When can you train?"
      description="Pick the days you're realistically able to train — at least one is required."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/workout-duration')}
    >
      <AppText color="tertiary">Day-of-week selector lands in Phase 3.</AppText>
    </OnboardingScaffold>
  );
}
