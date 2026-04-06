import { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  RefreshCw,
  TerminalSquare,
  XCircle,
} from 'lucide-react';
import type { PipelineLogEntry, PipelineStatus } from '../../types/app';

interface TerminalProps {
  logs: PipelineLogEntry[];
  status: PipelineStatus;
  pipelineState?: string;
  onClear: () => void;
}

export function Terminal({ logs, status, pipelineState, onClear }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-accent-success bg-accent-success/20';
      case 'connecting':
        return 'text-accent-warning bg-accent-warning/20';
      case 'error':
      case 'closed':
        return 'text-accent-danger bg-accent-danger/20';
      default:
        return 'text-text-secondary bg-background-border';
    }
  };

  const getLogIcon = (level?: PipelineLogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-accent-success flex-shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-accent-warning flex-shrink-0 mt-0.5" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-accent-danger flex-shrink-0 mt-0.5" />;
      default:
        return (
          <span className="w-4 h-4 text-text-secondary flex-shrink-0 mt-0.5 flex justify-center items-center font-bold">
            {'>'}
          </span>
        );
    }
  };

  const getPipelineStateColor = () => {
    switch (pipelineState) {
      case 'live':
      case 'passed':
        return 'text-accent-success bg-accent-success/20';
      case 'testing':
      case 'healing':
        return 'text-accent-warning bg-accent-warning/20';
      case 'failed':
      case 'error':
        return 'text-accent-danger bg-accent-danger/20';
      default:
        return 'text-blue-300 bg-blue-400/15';
    }
  };

  const formatAgent = (agent?: string) => {
    const colorMap: Record<string, string> = {
      system: 'text-text-secondary',
      requirement: 'text-blue-400',
      generation: 'text-purple-400',
      sandbox: 'text-orange-400',
      testing: 'text-accent-success',
      scoring: 'text-accent-danger',
      healing: 'text-accent-warning',
    };

    return colorMap[agent || ''] || 'text-text-secondary';
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] border border-background-border rounded-xl shadow-lg shadow-black/50 overflow-hidden font-mono text-sm leading-relaxed">
      <div className="flex items-center justify-between px-4 py-2 bg-background-secondary border-b border-background-border">
        <div className="flex items-center gap-2 text-text-secondary">
          <TerminalSquare className="w-4 h-4" />
          <span className="font-semibold tracking-wider text-xs uppercase">Pipeline Execution Stream</span>
        </div>

        <div className="flex items-center gap-4">
          {pipelineState && (
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${getPipelineStateColor()}`}
            >
              <span>phase</span>
              <span>{pipelineState}</span>
            </div>
          )}
          {status && (
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${getStatusColor()}`}
            >
              <Circle className="w-2 h-2 fill-current" />
              {status}
            </div>
          )}
          <button
            type="button"
            onClick={onClear}
            className="text-text-secondary hover:text-text-primary transition"
            title="Clear Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {logs.length === 0 ? (
          <div className="text-text-secondary italic opacity-50">
            Waiting for pipeline activity...
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={`${log.created_at || index}-${log.message}`}
              className="flex items-start gap-3 hover:bg-white/[0.02] p-1 rounded transition-colors group"
            >
              {getLogIcon(log.level)}

              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-secondary text-[10px]">
                    {new Date(log.created_at || Date.now()).toLocaleTimeString()}
                  </span>
                  {log.iteration && (
                    <span className="text-[10px] px-1.5 bg-background-border rounded text-text-secondary">
                      #ITER_{log.iteration}
                    </span>
                  )}
                  <span className={`font-semibold uppercase text-xs ${formatAgent(log.agent)}`}>
                    [{log.agent || 'system'}]
                  </span>
                  <span
                    className={`text-text-primary ${
                      log.level === 'error'
                        ? 'text-accent-danger'
                        : log.level === 'warning'
                          ? 'text-accent-warning'
                          : ''
                    }`}
                  >
                    {log.message}
                  </span>
                </div>

                {log.metadata != null ? (
                  <pre className="mt-1 text-[11px] text-text-secondary bg-[#1a1a23] p-2 rounded overflow-x-auto break-all whitespace-pre-wrap max-h-40 border border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">
                    {typeof log.metadata === 'object'
                      ? JSON.stringify(log.metadata, null, 2)
                      : String(log.metadata)}
                  </pre>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
