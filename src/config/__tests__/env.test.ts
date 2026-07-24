import { readSupabaseEnvConfig } from '@/config/env';

describe('readSupabaseEnvConfig', () => {
  it('returns null when both variables are absent', () => {
    expect(readSupabaseEnvConfig({})).toBeNull();
  });

  it('returns null when the publishable key is missing', () => {
    expect(
      readSupabaseEnvConfig({ EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co' }),
    ).toBeNull();
  });

  it('returns null when the URL is missing', () => {
    expect(
      readSupabaseEnvConfig({ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc' }),
    ).toBeNull();
  });

  it('returns null when the URL is malformed', () => {
    expect(
      readSupabaseEnvConfig({
        EXPO_PUBLIC_SUPABASE_URL: 'not-a-url',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
      }),
    ).toBeNull();
  });

  it('returns null when the URL uses a non-http(s) scheme', () => {
    expect(
      readSupabaseEnvConfig({
        EXPO_PUBLIC_SUPABASE_URL: 'ftp://project.supabase.co',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
      }),
    ).toBeNull();
  });

  it('returns a trimmed config when both variables are valid', () => {
    expect(
      readSupabaseEnvConfig({
        EXPO_PUBLIC_SUPABASE_URL: '  https://project.supabase.co  ',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '  sb_publishable_abc  ',
      }),
    ).toEqual({ url: 'https://project.supabase.co', publishableKey: 'sb_publishable_abc' });
  });

  it('accepts a local Supabase URL over http', () => {
    expect(
      readSupabaseEnvConfig({
        EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local',
      }),
    ).toEqual({ url: 'http://127.0.0.1:54321', publishableKey: 'sb_publishable_local' });
  });
});
