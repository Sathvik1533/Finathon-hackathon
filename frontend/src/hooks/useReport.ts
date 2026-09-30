import { useState } from 'react';
import { getReport } from '../api/report';
export const useReport = () => {
  const [report, setReport] = useState<any>(null);
  const fetch = async () => {
    const res = await getReport();
    setReport(res.data);
  };
  return { report, fetch };
};
