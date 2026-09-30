import { useState } from 'react';
import { getCases, submitDecision } from '../api/cases';
export const useCases = () => {
  const [cases, setCases] = useState([]);
  const fetch = async () => {
    const res = await getCases();
    setCases(res.data);
  };
  return { cases, fetch, submitDecision };
};
