import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';

export default function CoachingStyleScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      stepIndex={13}
      title="Choose your coaching style"
      description="Pick the tone that motivates you — changeable any time later in Profile."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/programme-preview')}
    >
      <AppText color="tertiary">Style selector lands in Phase 9 (Coach architecture).</AppText>
    </OnboardingScaffold>
  );
}
