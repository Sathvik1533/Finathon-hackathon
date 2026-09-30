import { useState, useCallback } from 'react';
import { triggerRun, getHealth } from '../api/reconcile';
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
      const result = await triggerRun(user.token);
      setRun(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconciliation failed');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  const loadLatest = useCallback(async () => {
    if (!user?.token) return;
    try {
      const health = await getHealth(user.token);
      if (health.latestRun) setRun(health.latestRun);
    } catch {
      // No previous run
    }
  }, [user?.token]);

  return { run, loading, error, trigger, loadLatest };
}
