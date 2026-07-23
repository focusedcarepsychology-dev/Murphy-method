import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';

export default function SafetyScreeningScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      stepIndex={9}
      title="A few safety questions"
      description="This gates whether your programme needs medical clearance before we build it — it can't be skipped."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/baseline-measurements')}
    >
      <AppText color="tertiary">Screening questions land in Phase 3.</AppText>
    </OnboardingScaffold>
  );
}
