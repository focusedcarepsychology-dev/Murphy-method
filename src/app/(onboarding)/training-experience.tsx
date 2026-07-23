import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';

export default function TrainingExperienceScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      stepIndex={5}
      title="Your training experience"
      description="Beginner, recreational, or intermediate — plus any training history you'd like to share."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/equipment')}
    >
      <AppText color="tertiary">Experience tier selector lands in Phase 3.</AppText>
    </OnboardingScaffold>
  );
}
