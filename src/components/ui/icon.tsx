import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/**
 * Curated icon vocabulary (docs/DESIGN_SYSTEM.md §5 "icon conventions").
 * Each entry maps to an SF Symbol (iOS) and a matching Material Symbol
 * (Android/web), so a single semantic name renders consistently everywhere
 * via `expo-symbols`.
 */
const iconRegistry = {
  today: { ios: 'sun.max.fill', android: 'wb_sunny' },
  plan: { ios: 'calendar', android: 'calendar_month' },
  progress: { ios: 'chart.bar.fill', android: 'bar_chart' },
  coach: { ios: 'message.fill', android: 'forum' },
  profile: { ios: 'person.fill', android: 'person' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  pause: { ios: 'pause.fill', android: 'pause' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more' },
  chevronUp: { ios: 'chevron.up', android: 'expand_less' },
  close: { ios: 'xmark', android: 'close' },
  info: { ios: 'info.circle', android: 'info' },
  swap: { ios: 'arrow.left.arrow.right', android: 'swap_horiz' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  shield: { ios: 'shield.fill', android: 'shield' },
  tune: { ios: 'slider.horizontal.3', android: 'tune' },
  notifications: { ios: 'bell.fill', android: 'notifications' },
  measurements: { ios: 'ruler', android: 'straighten' },
  camera: { ios: 'camera.fill', android: 'photo_camera' },
  history: { ios: 'clock.arrow.circlepath', android: 'history' },
  flag: { ios: 'flag.fill', android: 'flag' },
  star: { ios: 'star.fill', android: 'star' },
  bolt: { ios: 'bolt.fill', android: 'bolt' },
  timer: { ios: 'timer', android: 'timer' },
  lock: { ios: 'lock.fill', android: 'lock' },
  trash: { ios: 'trash.fill', android: 'delete' },
  gear: { ios: 'gearshape.fill', android: 'settings' },
  plus: { ios: 'plus', android: 'add' },
  minus: { ios: 'minus', android: 'remove' },
  trophy: { ios: 'trophy.fill', android: 'emoji_events' },
  moon: { ios: 'moon.fill', android: 'dark_mode' },
  sun: { ios: 'sun.max.fill', android: 'light_mode' },
  accountCircle: { ios: 'person.crop.circle', android: 'account_circle' },
  envelope: { ios: 'envelope.fill', android: 'mail' },
  key: { ios: 'key.fill', android: 'key' },
  offline: { ios: 'wifi.slash', android: 'wifi_off' },
  alertCircle: { ios: 'exclamationmark.circle', android: 'error_outline' },
  trending: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up' },
  people: { ios: 'person.2.fill', android: 'groups' },
  walk: { ios: 'figure.walk', android: 'directions_run' },
  weight: { ios: 'scalemass.fill', android: 'monitor_weight' },
  sync: { ios: 'arrow.triangle.2.circlepath', android: 'sync' },
  privacy: { ios: 'hand.raised.fill', android: 'privacy_tip' },
  help: { ios: 'questionmark.circle', android: 'help_outline' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  verified: { ios: 'checkmark.seal.fill', android: 'verified' },
  reorder: { ios: 'arrow.up.arrow.down', android: 'swap_vert' },
} as const;

export type IconName = keyof typeof iconRegistry;

export type IconProps = {
  name: IconName;
  size?: number;
  color: ColorValue;
  /** Set false when the icon is the sole accessible content of its control. */
  decorative?: boolean;
};

export function Icon({ name, size = 22, color, decorative = true }: IconProps) {
  const symbol = iconRegistry[name];

  return (
    <SymbolView
      name={{ ios: symbol.ios, android: symbol.android, web: symbol.android }}
      size={size}
      tintColor={color}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
      importantForAccessibility={decorative ? 'no' : 'yes'}
      accessibilityElementsHidden={decorative}
    />
  );
}
