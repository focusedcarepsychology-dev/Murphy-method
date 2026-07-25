import type { MurphySupabaseClient } from '@/services/supabase/client';

export class BodyScanRepositoryError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'BodyScanRepositoryError';
    this.cause = cause;
  }
}

function fail(action: string, error: unknown): never {
  throw new BodyScanRepositoryError(
    `Couldn't ${action}. Check your connection and try again.`,
    error,
  );
}

export type BodyScanImageAngle = 'front' | 'side' | 'back' | 'angle_45';

export type BodyScanImageRecord = {
  id: string;
  angle: BodyScanImageAngle;
  storagePath: string;
};

export type BodyScanRecord = {
  id: string;
  capturedOn: string;
  purpose: 'baseline' | 'progress_check';
  createdAt: string;
  images: BodyScanImageRecord[];
};

/** Owner-scoped timeline read. RLS independently enforces profile ownership. */
export async function listBodyScans(
  client: MurphySupabaseClient,
  userId: string,
): Promise<BodyScanRecord[]> {
  const { data: scans, error: scanError } = await client
    .from('body_scans')
    .select('id, captured_on, purpose, created_at')
    .eq('profile_id', userId)
    .order('captured_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (scanError) fail('load your BodyScan history', scanError);
  if (!scans || scans.length === 0) return [];

  const scanIds = scans.map((scan) => scan.id);
  const { data: images, error: imageError } = await client
    .from('body_scan_images')
    .select('id, body_scan_id, angle, storage_path')
    .in('body_scan_id', scanIds)
    .order('created_at', { ascending: true });
  if (imageError) fail('load your BodyScan photos', imageError);

  const imagesByScan = new Map<string, BodyScanImageRecord[]>();
  for (const image of images ?? []) {
    const current = imagesByScan.get(image.body_scan_id) ?? [];
    current.push({ id: image.id, angle: image.angle, storagePath: image.storage_path });
    imagesByScan.set(image.body_scan_id, current);
  }

  return scans.map((scan) => ({
    id: scan.id,
    capturedOn: scan.captured_on,
    purpose: scan.purpose,
    createdAt: scan.created_at,
    images: imagesByScan.get(scan.id) ?? [],
  }));
}

/**
 * Generates short-lived private viewing URLs. Storage paths remain private
 * and are never converted into public URLs or persisted back to the app DB.
 */
export async function createBodyScanSignedUrls(
  client: MurphySupabaseClient,
  images: BodyScanImageRecord[],
  expiresInSeconds = 600,
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  for (const image of images) {
    const { data, error } = await client.storage
      .from('bodyscans')
      .createSignedUrl(image.storagePath, expiresInSeconds);
    if (error) fail('open your BodyScan photo', error);
    if (data?.signedUrl) urls.set(image.id, data.signedUrl);
  }
  return urls;
}

export function imageForAngle(
  scan: BodyScanRecord,
  angle: BodyScanImageAngle,
): BodyScanImageRecord | null {
  return scan.images.find((image) => image.angle === angle) ?? null;
}
