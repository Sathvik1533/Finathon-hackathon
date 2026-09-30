import { useState } from 'react';
import { triggerRun } from '../api/reconcile';
export const useReconcile = () => {
  const [loading, setLoading] = useState(false);
  const trigger = async () => {
    setLoading(true);
    await triggerRun();
    setLoading(false);
  };
  return { loading, trigger };
};
