import { useState, useCallback, useEffect } from 'react';
import { getCases, submitDecision as apiSubmitDecision } from '../api/cases';
import type { DiscrepancyCase } from '../api/reconcile';
import { useAuth } from '../context/AuthContext';

export function useCases() {
  const { user } = useAuth();
  const [cases, setCases] = useState<DiscrepancyCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCases(user.token);
      setCases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => { load(); }, [load]);

  const submitDecision = useCallback(async (
    caseId: string,
    decision: 'APPROVED' | 'REJECTED' | 'ESCALATED',
    rationale: string
  ) => {
    if (!user?.token) return;
    await apiSubmitDecision(user.token, caseId, decision, rationale);
    await load(); // Refresh cases after decision
  }, [user?.token, load]);

  return { cases, loading, error, reload: load, submitDecision };
}
