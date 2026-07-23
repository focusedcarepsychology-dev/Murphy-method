import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';

export default function IntroductionScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      stepIndex={0}
      title="Let's build your plan"
      description="A few quick questions about your goals, experience, and schedule — about 3–6 minutes — so we can build a programme around you."
      nextLabel="Get Started"
      onNext={() => router.push('/(onboarding)/basic-profile')}
    />
  );
}
