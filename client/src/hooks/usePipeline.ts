import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import type { PipelineLogEntry, PipelineStatus } from '../types/app';

export function usePipeline(apiId?: string) {
  const [logs, setLogs] = useState<PipelineLogEntry[]>([]);
  const [status, setStatus] = useState<PipelineStatus>('connecting');
  const [pipelineState, setPipelineState] = useState<string>('pending');

  useEffect(() => {
    if (!apiId) {
      setStatus('closed');
      setLogs([]);
      setPipelineState('pending');
      return;
    }

    let isCancelled = false;

    const loadPipeline = async () => {
      try {
        const data = await apiService.getApiPipeline(apiId);

        if (isCancelled) {
          return;
        }

        setLogs(data.logs);
        setPipelineState(data.status || 'pending');
        setStatus('connected');
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error('Pipeline polling error:', error);
        setStatus('error');
      }
    };

    setStatus('connecting');
    void loadPipeline();

    const intervalId = window.setInterval(() => {
      void loadPipeline();
    }, 3000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [apiId]);

  const clearLogs = () => setLogs([]);

  return { logs, status, pipelineState, clearLogs };
}
