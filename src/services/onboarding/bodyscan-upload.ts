/**
 * Optional BodyScan capture + private upload. Captures standardised front,
 * side and back photos with `expo-image-picker`, uploads to the private
 * `bodyscans` bucket under the owning user's prefix, and records metadata.
 * No AI/CV analysis or public URL is created.
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

/** Opens the system camera for one photo. Never uploads anything itself. */
export async function captureBodyScanPhoto(): Promise<CaptureOutcome> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { outcome: 'permission_denied' };

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: 'images',
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) return { outcome: 'cancelled' };
  return { outcome: 'captured', uri: result.assets[0].uri };
}

export async function uploadBodyScan(
  client: MurphySupabaseClient,
  userId: string,
  purpose: 'baseline' | 'progress_check',
  captures: { angle: BodyScanAngle; uri: string }[],
): Promise<{ scanId: string }> {
  if (captures.length === 0) {
    throw new OnboardingRepositoryError('No BodyScan photos were selected.');
  }

  const scan = await createBodyScan(client, userId, purpose);

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

  return { scanId: scan.id };
}

/** Backwards-compatible onboarding wrapper. */
export async function uploadBodyScanBaseline(
  client: MurphySupabaseClient,
  userId: string,
  captures: { angle: BodyScanAngle; uri: string }[],
): Promise<void> {
  await uploadBodyScan(client, userId, 'baseline', captures);
}
