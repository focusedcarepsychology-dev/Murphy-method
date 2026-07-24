/**
 * Optional Baseline BodyScan capture + upload
 * (docs/IMPLEMENTATION_PLAN.md Phase 3 §18). Genuine minimal capture, not
 * the Phase 10 timeline/comparison/CV pipeline: takes one photo per angle
 * with `expo-image-picker`, uploads it to the private `bodyscans` storage
 * bucket at a user-scoped path, and records the metadata row — no AI/CV
 * analysis, no derived measurements, no public URL.
 */
import * as ImagePicker from 'expo-image-picker';

import type { MurphySupabaseClient } from '@/services/supabase/client';
import {
  createBodyScan,
  insertBodyScanImageRecord,
  OnboardingRepositoryError,
} from '@/services/onboarding/onboarding-repository';

export type BodyScanAngle = 'front' | 'side' | 'back';

export type CaptureOutcome =
  | { outcome: 'captured'; uri: string }
  | { outcome: 'cancelled' }
  | { outcome: 'permission_denied' };

/** Opens the camera for one photo. Never uploads anything itself. */
export async function captureBodyScanPhoto(): Promise<CaptureOutcome> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { outcome: 'permission_denied' };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: 'images',
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return { outcome: 'cancelled' };
  }
  return { outcome: 'captured', uri: result.assets[0].uri };
}

/**
 * Uploads every captured angle for one baseline scan. Creates the
 * `body_scans` row first so each image's storage path can be scoped under
 * its real id (`{user_id}/{scan_id}/{angle}.jpg`) — RLS on
 * `storage.objects` (supabase/migrations/20260723091300_bodyscan.sql)
 * independently enforces that only the owning user's prefix is writable,
 * so a wrong path fails the upload itself, not just this check.
 */
export async function uploadBodyScanBaseline(
  client: MurphySupabaseClient,
  userId: string,
  captures: { angle: BodyScanAngle; uri: string }[],
): Promise<void> {
  if (captures.length === 0) return;

  const scan = await createBodyScan(client, userId, 'baseline');

  for (const capture of captures) {
    const storagePath = `${userId}/${scan.id}/${capture.angle}.jpg`;
    let arrayBuffer: ArrayBuffer;
    try {
      const response = await fetch(capture.uri);
      arrayBuffer = await response.arrayBuffer();
    } catch (error) {
      throw new OnboardingRepositoryError(
        "Couldn't read that photo. Check your connection and try again.",
        error,
      );
    }

    const { error: uploadError } = await client.storage
      .from('bodyscans')
      .upload(storagePath, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) {
      throw new OnboardingRepositoryError(
        "Couldn't upload your BodyScan photo. Check your connection and try again.",
        uploadError,
      );
    }

    await insertBodyScanImageRecord(client, scan.id, capture.angle, storagePath);
  }
}
