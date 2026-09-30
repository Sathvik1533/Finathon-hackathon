import { useState, useCallback } from 'react';
import { getReport } from '../api/report';
import type { ReportData } from '../api/report';
import { useAuth } from '../context/AuthContext';

export function useReport() {
  const { user } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getReport(user.token);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  return { report, loading, error, refresh };
}
