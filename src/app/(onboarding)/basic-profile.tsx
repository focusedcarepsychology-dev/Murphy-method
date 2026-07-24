import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText, Caption } from '@/components/ui/app-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import {
  HEIGHT_RANGE_CM,
  WEIGHT_RANGE_KG,
  validateDateOfBirth,
} from '@/domain/onboarding/validation';
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
  roundTo1Decimal,
} from '@/domain/onboarding/units';
import type { UnitPreference } from '@/domain/onboarding/types';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import {
  loadLatestWeightKg,
  loadProfile,
  updateProfile,
  upsertTodayWeightMeasurement,
} from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export default function BasicProfileScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [unit, setUnit] = useState<UnitPreference>('metric');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [heightCmInput, setHeightCmInput] = useState('');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function fetchProfile() {
    if (!userId) return;
    let cancelled = false;
    Promise.all([loadProfile(client, userId), loadLatestWeightKg(client, userId)])
      .then(([profile, weightKg]) => {
        if (cancelled) return;
        setUnit(profile.unitPreference);
        if (profile.dateOfBirth) {
          const [y, m, d] = profile.dateOfBirth.split('-');
          setYear(y);
          setMonth(m);
          setDay(d);
        }
        if (profile.heightCm) {
          if (profile.unitPreference === 'imperial') {
            const { feet: f, inches: i } = cmToFeetInches(profile.heightCm);
            setFeet(String(f));
            setInches(String(i));
          } else {
            setHeightCmInput(String(profile.heightCm));
          }
        }
        if (weightKg) {
          setWeightInput(
            String(
              profile.unitPreference === 'imperial' ? kgToLb(weightKg) : roundTo1Decimal(weightKg),
            ),
          );
        }
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }

  function retry() {
    setStatus('loading');
    fetchProfile();
  }

  useEffect(fetchProfile, [client, userId]);

  const isoDob =
    day && month && year
      ? `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      : '';
  const dobResult = isoDob
    ? validateDateOfBirth(isoDob)
    : { valid: false as const, reason: 'invalid_date' as const };

  const heightCm =
    unit === 'metric'
      ? Number(heightCmInput)
      : feet || inches
        ? feetInchesToCm(Number(feet) || 0, Number(inches) || 0)
        : NaN;
  const heightValid =
    Number.isFinite(heightCm) && heightCm >= HEIGHT_RANGE_CM.min && heightCm <= HEIGHT_RANGE_CM.max;

  const weightValue = Number(weightInput);
  const weightKgCanonical = unit === 'imperial' ? lbToKg(weightValue) : weightValue;
  const weightValid =
    Number.isFinite(weightKgCanonical) &&
    weightKgCanonical >= WEIGHT_RANGE_KG.min &&
    weightKgCanonical <= WEIGHT_RANGE_KG.max;

  const canSubmit = dobResult.valid && heightValid && weightValid;

  const dobHasAnyInput = day !== '' || month !== '' || year !== '';
  const heightHasInput = unit === 'metric' ? heightCmInput !== '' : feet !== '' || inches !== '';
  const weightHasInput = weightInput !== '';

  function handleUnitChange(next: UnitPreference) {
    if (next === unit) return;
    if (next === 'imperial' && heightValid) {
      const { feet: f, inches: i } = cmToFeetInches(heightCm);
      setFeet(String(f));
      setInches(String(i));
    } else if (next === 'metric' && heightValid) {
      setHeightCmInput(String(heightCm));
    }
    if (weightValid) {
      setWeightInput(
        String(
          next === 'imperial' ? kgToLb(weightKgCanonical) : roundTo1Decimal(weightKgCanonical),
        ),
      );
    }
    setUnit(next);
  }

  async function handleNext() {
    setSubmitError(null);
    if (!canSubmit || !userId || submitting) return;

    setSubmitting(true);
    try {
      await updateProfile(client, userId, {
        dateOfBirth: isoDob,
        heightCm: roundTo1Decimal(heightCm),
        unitPreference: unit,
        timezone: deviceTimezone(),
      });
      await upsertTodayWeightMeasurement(client, userId, roundTo1Decimal(weightKgCanonical));
      router.push('/(onboarding)/main-goal');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <OnboardingScaffold stepIndex={1} title="A little about you" onNext={() => {}} nextDisabled>
        <LoadingState accessibilityLabel="Loading your profile" rows={4} />
      </OnboardingScaffold>
    );
  }

  if (status === 'error') {
    return (
      <OnboardingScaffold stepIndex={1} title="A little about you" onNext={() => {}} nextDisabled>
        <ErrorState onRetry={retry} />
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={1}
      title="A little about you"
      description="Used to size your programme correctly — not shared, and editable later in Profile."
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={!canSubmit}
      nextLoading={submitting}
    >
      <View style={{ gap: spacing.four }}>
        {submitError ? <AppText color="critical">{submitError}</AppText> : null}

        <SegmentedControl
          accessibilityLabel="Unit preference"
          value={unit}
          onChange={(value) => handleUnitChange(value as UnitPreference)}
          options={[
            { value: 'metric', label: 'Metric (kg, cm)' },
            { value: 'imperial', label: 'Imperial (lb, ft/in)' },
          ]}
        />

        <View style={{ gap: spacing.one }}>
          <Caption>DATE OF BIRTH</Caption>
          <View style={{ flexDirection: 'row', gap: spacing.two }}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Day"
                value={day}
                onChangeText={setDay}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Month"
                value={month}
                onChangeText={setMonth}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={{ flex: 1.3 }}>
              <TextField
                label="Year"
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
          {isoDob && !dobResult.valid && dobResult.reason === 'under_18' ? (
            <AppText color="critical" variant="supporting">
              Murphy Method is built for adults 18 and over. You&apos;re welcome back once you turn
              18.
            </AppText>
          ) : null}
          {isoDob && !dobResult.valid && dobResult.reason === 'implausible_age' ? (
            <AppText color="critical" variant="supporting">
              That date of birth doesn&apos;t look right — please double-check it.
            </AppText>
          ) : null}
          {dobHasAnyInput && !isoDob ? (
            <AppText color="critical" variant="supporting">
              Enter your full date of birth.
            </AppText>
          ) : null}
        </View>

        {unit === 'metric' ? (
          <TextField
            label="Height (cm)"
            value={heightCmInput}
            onChangeText={setHeightCmInput}
            keyboardType="decimal-pad"
            error={
              heightHasInput && !heightValid ? 'Enter a height between 100–250 cm.' : undefined
            }
          />
        ) : (
          <View style={{ gap: spacing.one }}>
            <Caption>HEIGHT</Caption>
            <View style={{ flexDirection: 'row', gap: spacing.two }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Feet"
                  value={feet}
                  onChangeText={setFeet}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Inches"
                  value={inches}
                  onChangeText={setInches}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            {heightHasInput && !heightValid ? (
              <AppText color="critical" variant="supporting">
                Enter a plausible height.
              </AppText>
            ) : null}
          </View>
        )}

        <TextField
          label={unit === 'imperial' ? 'Weight (lb)' : 'Weight (kg)'}
          value={weightInput}
          onChangeText={setWeightInput}
          keyboardType="decimal-pad"
          error={
            weightHasInput && !weightValid
              ? unit === 'imperial'
                ? 'Enter a weight between 66–660 lb.'
                : 'Enter a weight between 30–300 kg.'
              : undefined
          }
        />
      </View>
    </OnboardingScaffold>
  );
}
