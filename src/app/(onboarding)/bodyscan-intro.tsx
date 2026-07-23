import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';

export default function BodyScanIntroScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      stepIndex={11}
      title="BodyScan (optional)"
      description="Standardised photos to track visual progress over time. Fully optional, privacy-first, and never required to use the app — declining is fully supported."
      nextLabel="Continue to BodyScan"
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/bodyscan-baseline')}
    >
      <AppText color="tertiary">Consent capture wires to real storage in Phase 10.</AppText>
    </OnboardingScaffold>
  );
}
