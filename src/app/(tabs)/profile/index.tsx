import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { SettingRow } from '@/components/ui/list-row';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { previewUser } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';
import type { Href } from 'expo-router';
import type { IconName } from '@/components/ui/icon';

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
      <Card style={{ gap: 0 }}>
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

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">Profile</Heading>
        <Caption>{previewUser.firstName}</Caption>
      </View>

      <RowGroup title="ACCOUNT" rows={account} />
      <RowGroup title="TRAINING" rows={training} />
      <RowGroup title="PREFERENCES" rows={preferences} />
      <RowGroup title="PRIVACY & DATA" rows={privacy} />
    </ScrollScreen>
  );
}
