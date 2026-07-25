import { useEffect, useRef, useState } from 'react';

import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import type { MurphySupabaseClient } from '@/services/supabase/client';

export type AuthenticatedDataState<T> = {
  status: 'loading' | 'ready' | 'error';
  data: T | null;
  reload: () => void;
};

/**
 * Loads owner-scoped data for the signed-in user, with the explicit
 * loading/ready/error states every authenticated screen in this app is
 * required to render (docs/SCREEN_SPECIFICATIONS.md). `data` stays `null`
 * until a real response arrives, so a screen has nothing to render but a
 * truthful loading or empty state in the meantime, never a placeholder
 * value that looks like the user's own data.
 *
 * `dependencies` are the values that should cause a refetch (a route
 * param, typically). They are joined into a scalar key so the effect's
 * dependency list stays a literal, matching the loader pattern the
 * onboarding screens already use.
 */
export function useAuthenticatedData<T>(
  load: (client: MurphySupabaseClient, userId: string) => Promise<T>,
  dependencies: (string | number | boolean | null | undefined)[] = [],
): AuthenticatedDataState<T> {
  const { client, userId } = useAuthenticatedClient();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<T | null>(null);

  // The caller passes a fresh closure every render; only `dependencies`
  // decides when a refetch is warranted, so the newest closure is kept in
  // a ref rather than in the effect's dependency list.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const dependencyKey = dependencies.map((value) => String(value)).join('|');

  function run() {
    if (!userId) return;
    let cancelled = false;
    loadRef
      .current(client, userId)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(run, [client, userId, dependencyKey]);

  function reload() {
    setStatus('loading');
    run();
  }

  return { status, data, reload };
}
