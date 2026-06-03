import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useParams } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { RequestTester } from '../components/workspace/RequestTester';
import { Terminal } from '../components/workspace/Terminal';
import { usePipeline } from '../hooks/usePipeline';
import { apiService } from '../services/api';
import { useApiStore } from '../store/apiStore';
import type { ApiRecord, EndpointDefinition } from '../types/app';

const getEditorLanguage = (filepath: string) => {
  const lower = filepath.toLowerCase();

  if (lower.endsWith('.json')) {
    return 'json';
  }

  if (lower.endsWith('.md')) {
    return 'markdown';
  }

  if (lower.endsWith('.ts')) {
    return 'typescript';
  }

  if (lower.endsWith('.tsx')) {
    return 'typescript';
  }

  if (lower.endsWith('.jsx') || lower.endsWith('.js')) {
    return 'javascript';
  }

  if (lower.endsWith('.sql')) {
    return 'sql';
  }

  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) {
    return 'yaml';
  }

  if (lower.endsWith('.html')) {
    return 'html';
  }

  if (lower.endsWith('.css')) {
    return 'css';
  }

  if (lower.endsWith('.env') || lower.endsWith('.env.example')) {
    return 'shell';
  }

  return 'plaintext';
};

export default function Workspace() {
  const { id = '' } = useParams();
  const { apis, fetchApis } = useApiStore();
  const { logs, status: pipelineFeedStatus, pipelineState, clearLogs } = usePipeline(id);
  const [apiDetails, setApiDetails] = useState<ApiRecord | null>(null);
  const [currentCode, setCurrentCode] = useState<Record<string, string>>({
    'README.pending.txt': `ForgeAPI has not loaded generated files for this API yet.

Possible reasons:
1. The backend server was not restarted after the latest pipeline changes.
2. This API was created before generation persistence was wired.
3. The pipeline is still running or failed before saving files.

What to do:
- restart the backend
- create a fresh API
- wait for pipeline logs to appear
- reopen this workspace after a few seconds
`,
  });
  const [selectedFile, setSelectedFile] = useState('README.pending.txt');
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDefinition | null>(null);

  const fileKeys = Object.keys(currentCode);
  const currentApi = apiDetails || apis.find((api) => api.id === id) || null;
  const endpoints: EndpointDefinition[] = currentApi?.requirements?.endpoints || [
    { method: 'GET', path: '/users' },
    { method: 'POST', path: '/users' },
    { method: 'GET', path: '/users/:id' },
    { method: 'PUT', path: '/users/:id' },
    { method: 'PATCH', path: '/users/:id' },
    { method: 'DELETE', path: '/users/:id' },
  ];

  useEffect(() => {
    if (!selectedEndpoint && endpoints.length > 0) {
      setSelectedEndpoint(endpoints[0]);
      return;
    }

    if (
      selectedEndpoint &&
      !endpoints.some(
        (endpoint) =>
          endpoint.method === selectedEndpoint.method && endpoint.path === selectedEndpoint.path,
      )
    ) {
      setSelectedEndpoint(endpoints[0] ?? null);
    }
  }, [endpoints, selectedEndpoint]);

  useEffect(() => {
    if (apis.length === 0) {
      void fetchApis();
    }
  }, [apis.length, fetchApis]);

  useEffect(() => {
    if (!id) {
      return;
    }

    let isCancelled = false;
    let intervalId = 0;

    const loadDetails = async () => {
      try {
        const data = await apiService.getApiById(id);

        if (isCancelled) {
          return;
        }

        setApiDetails(data);

        if (data.files && Object.keys(data.files).length > 0) {
          const nextFiles = data.files;
          setCurrentCode(data.files);
          setSelectedFile((current) =>
            current in nextFiles ? current : Object.keys(nextFiles)[0],
          );
        }
      } catch (error) {
        console.error('Failed to load workspace API details:', error);
      }
    };

    void loadDetails();
    intervalId = window.setInterval(() => {
      void loadDetails();
    }, 4000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [id, pipelineState]);

  return (
    <div className="flex flex-1 h-[calc(100vh-4rem)] overflow-hidden">
      <Sidebar
        files={fileKeys}
        endpoints={endpoints}
        selectedFile={selectedFile}
        selectedEndpoint={selectedEndpoint}
        onFileSelect={setSelectedFile}
        onEndpointSelect={setSelectedEndpoint}
      />

      <div className="flex flex-1 border-x border-background-border bg-background-primary">
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="h-10 bg-[#1e1e1e] border-b border-[#333] flex items-center px-4">
            <span className="text-sm font-mono text-text-secondary">{selectedFile}</span>
          </div>

          <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
            <Editor
              height="100%"
              language={getEditorLanguage(selectedFile)}
              theme="vs-dark"
              value={currentCode[selectedFile] || ''}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                scrollBeyondLastLine: false,
                readOnly: true,
                wordWrap: 'on',
              }}
            />
          </div>

          <div className="h-64 border-t-2 border-background-border bg-background-primary overflow-hidden relative shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
            <Terminal
              logs={logs}
              status={pipelineFeedStatus}
              pipelineState={pipelineState}
              onClear={clearLogs}
            />
          </div>
        </div>

        <div className="w-[420px] max-w-[38vw] min-w-[340px]">
          <RequestTester
            apiId={id}
            endpoints={endpoints}
            selectedEndpoint={selectedEndpoint}
            pipelineState={pipelineState}
            runtimeBaseUrl={currentApi?.runtime_base_url}
            latestTestReport={currentApi?.latest_test_report}
          />
        </div>
      </div>
    </div>
  );
}
