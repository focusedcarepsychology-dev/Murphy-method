import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Caption, Heading } from '@/components/ui/app-text';
import { SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { IconName } from '@/components/ui/icon';
import { SettingRow } from '@/components/ui/list-row';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadViewerProfile } from '@/services/training/training-repository';
import { useAuth } from '@/state/auth/auth-context';

type Row = { label: string; icon: IconName; href: Href };

const account: Row[] = [
  { label: 'Personal details', icon: 'accountCircle', href: '/(tabs)/profile/personal-details' },
  { label: 'Subscription', icon: 'star', href: '/(tabs)/profile/subscription' },
];

const training: Row[] = [
  { label: 'Goals', icon: 'flag', href: '/(tabs)/profile/goals' },
  { label: 'Equipment', icon: 'gear', href: '/(tabs)/profile/equipment' },
  { label: 'Training availability', icon: 'plan', href: '/(tabs)/profile/availability' },
  { label: 'Coach style', icon: 'coach', href: '/(tabs)/profile/coaching-style' },
];

const preferences: Row[] = [
  { label: 'Notifications', icon: 'notifications', href: '/(tabs)/profile/notifications' },
  { label: 'Units & appearance', icon: 'tune', href: '/(tabs)/profile/units' },
];

const privacy: Row[] = [
  { label: 'Privacy', icon: 'privacy', href: '/(tabs)/profile/privacy' },
  { label: 'BodyScan privacy', icon: 'camera', href: '/(tabs)/profile/bodyscan-privacy' },
  { label: 'Data & account', icon: 'shield', href: '/(tabs)/profile/data-export' },
];

function RowGroup({ title, rows }: { title: string; rows: Row[] }) {
  const router = useRouter();
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.two }}>
      <Caption>{title}</Caption>
      <Card variant="quiet" elevated={false} style={{ gap: 0, paddingVertical: spacing.one }}>
        {rows.map((row) => (
          <SettingRow
            key={row.label}
            title={row.label}
            icon={row.icon}
            onPress={() => router.push(row.href)}
          />
        ))}
      </Card>
    </View>
  );
}

export default function ProfileScreen() {
  const { spacing } = useTheme();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const { data: profile } = useAuthenticatedData((client, userId) =>
    loadViewerProfile(client, userId),
  );

  function handleSignOutPress() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            const result = await signOut();
            if (result.error) {
              Alert.alert('Couldn’t sign out', result.error);
            }
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">Profile</Heading>
        {profile?.displayName ? <Caption>{profile.displayName}</Caption> : null}
      </View>

      <RowGroup title="ACCOUNT" rows={account} />
      <RowGroup title="TRAINING" rows={training} />
      <RowGroup title="PREFERENCES" rows={preferences} />
      <RowGroup title="PRIVACY & DATA" rows={privacy} />

      <SecondaryButton
        label="Sign out"
        tone="critical"
        icon="signOut"
        loading={signingOut}
        onPress={handleSignOutPress}
      />
    </ScrollScreen>
  );
}
