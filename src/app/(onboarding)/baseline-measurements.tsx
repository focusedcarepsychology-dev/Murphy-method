import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';

export default function BaselineMeasurementsScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      stepIndex={10}
      title="Baseline measurements"
      description="Every field is optional — there's no scale requirement, and skipping never blocks onboarding."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/bodyscan-intro')}
    >
      <AppText color="tertiary">Measurement fields land in Phase 3.</AppText>
    </OnboardingScaffold>
  );
}
