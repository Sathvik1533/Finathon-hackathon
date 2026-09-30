import { useCallback, useState } from 'react';
import { triggerRun as apiTriggerRun, getLatestRun } from '../api/reconcile';
import type { ReconRunResult } from '../api/reconcile';
import { useAuth } from '../context/AuthContext';

export function useReconcile() {
  const { user } = useAuth();
  const [run, setRun] = useState<ReconRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    try {
      setRun(await apiTriggerRun(user.token));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Reconciliation failed.');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  const loadLatest = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    try {
      setRun(await getLatestRun(user.token));
    } catch (caught) {
      setRun(null);
      setError(caught instanceof Error ? caught.message : 'Could not load the latest run.');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  return { run, loading, error, trigger, loadLatest };
}
