import { Activity, FileCode } from 'lucide-react';
import type { EndpointDefinition } from '../../types/app';

interface SidebarProps {
  files?: string[];
  endpoints?: EndpointDefinition[];
  selectedFile?: string;
  selectedEndpoint?: EndpointDefinition | null;
  onFileSelect: (file: string) => void;
  onEndpointSelect?: (endpoint: EndpointDefinition) => void;
}

export function Sidebar({
  files = [],
  endpoints = [],
  selectedFile,
  selectedEndpoint,
  onFileSelect,
  onEndpointSelect,
}: SidebarProps) {
  return (
    <div className="w-64 border-r border-background-border bg-background-secondary h-full flex flex-col">
      <div className="p-4 border-b border-background-border flex items-center gap-2">
        <FileCode className="w-4 h-4 text-accent-primary" />
        <h3 className="text-sm font-semibold text-text-primary uppercase">Project Files</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2 border-b border-background-border">
        {files.length === 0 ? (
          <p className="text-xs text-text-secondary px-2 italic mt-2">Waiting for pipeline...</p>
        ) : (
          <div className="flex flex-col gap-1">
            {files.map((file) => (
              <button
                key={file}
                type="button"
                onClick={() => onFileSelect(file)}
                className={`text-left text-sm px-3 py-1.5 rounded-md transition-colors ${
                  selectedFile === file
                    ? 'bg-accent-primary/20 text-accent-primary font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-border'
                }`}
              >
                {file}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-1/3 flex flex-col mt-auto bg-background-card">
        <div className="p-4 border-b border-background-border flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent-secondary" />
          <h3 className="text-sm font-semibold text-text-primary uppercase">Endpoints</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {endpoints.length === 0 ? (
            <p className="text-xs text-text-secondary italic">No endpoints defined</p>
          ) : (
            <div className="flex flex-col gap-2">
              {endpoints.map((endpoint, index) => (
                <button
                  key={`${endpoint.method}-${endpoint.path}-${index}`}
                  type="button"
                  onClick={() => onEndpointSelect?.(endpoint)}
                  className={`flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition ${
                    selectedEndpoint?.method === endpoint.method &&
                    selectedEndpoint?.path === endpoint.path
                      ? 'bg-accent-primary/12 text-text-primary'
                      : 'text-text-secondary hover:bg-background-border hover:text-text-primary'
                  }`}
                >
                  <span
                    className={`font-mono font-bold w-10 ${
                      endpoint.method === 'GET'
                        ? 'text-blue-400'
                        : endpoint.method === 'POST'
                          ? 'text-accent-success'
                          : endpoint.method === 'DELETE'
                            ? 'text-accent-danger'
                            : 'text-accent-primary'
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <span className="truncate" title={endpoint.path}>
                    {endpoint.path}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
