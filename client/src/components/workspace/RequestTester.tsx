import { useEffect, useState } from 'react';
import axios from 'axios';
import { FlaskConical, Play, RefreshCw, WandSparkles } from 'lucide-react';
import { apiService } from '../../services/api';
import type {
  ApiAutoTestResponse,
  ApiTestResponse,
  EndpointDefinition,
  HttpMethod,
} from '../../types/app';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface RequestTesterProps {
  apiId: string;
  endpoints: EndpointDefinition[];
  selectedEndpoint?: EndpointDefinition | null;
  pipelineState?: string;
}

const supportedMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
type TestMode = 'manual' | 'auto';

const prettyJson = (value: unknown) => JSON.stringify(value, null, 2);
const normalizeHeaders = (headers: Record<string, unknown> | undefined) =>
  Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => [key, String(value ?? '')]),
  );

export function RequestTester({
  apiId,
  endpoints,
  selectedEndpoint,
  pipelineState,
}: RequestTesterProps) {
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('/users');
  const [headersText, setHeadersText] = useState('{\n  "Content-Type": "application/json"\n}');
  const [bodyText, setBodyText] = useState('{\n  "name": "John Doe"\n}');
  const [mode, setMode] = useState<TestMode>('manual');
  const [response, setResponse] = useState<ApiTestResponse | null>(null);
  const [suiteResponse, setSuiteResponse] = useState<ApiAutoTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const endpoint = selectedEndpoint || endpoints[0];

    if (!endpoint) {
      return;
    }

    const normalizedMethod = String(endpoint.method).toUpperCase() as HttpMethod;
    setMethod(supportedMethods.includes(normalizedMethod) ? normalizedMethod : 'GET');
    setPath(endpoint.path);
  }, [endpoints, selectedEndpoint]);

  const statusTone =
    response == null
      ? 'text-text-secondary bg-background-border'
      : response.status < 300
        ? 'text-accent-success bg-accent-success/20'
        : response.status < 500
          ? 'text-accent-warning bg-accent-warning/20'
          : 'text-accent-danger bg-accent-danger/20';

  const handleTestRequest = async () => {
    setIsLoading(true);
    setError(null);
    setSuiteResponse(null);

    try {
      const headers = headersText.trim() ? (JSON.parse(headersText) as Record<string, string>) : {};
      const shouldSendBody = !['GET', 'HEAD'].includes(method);
      const body = shouldSendBody && bodyText.trim() ? JSON.parse(bodyText) : undefined;

      const result = await apiService.testRequest(apiId, {
        baseUrl,
        method,
        path,
        headers,
        body,
      });

      setResponse(result);
    } catch (requestError) {
      if (requestError instanceof SyntaxError) {
        setError('Headers or body is not valid JSON.');
        setResponse({
          ok: false,
          status: 0,
          statusText: 'INVALID_JSON',
          durationMs: 0,
          headers: {},
          data: { error: 'Headers or body is not valid JSON.' },
          request: {
            method,
            url: `${baseUrl}${path}`,
            path,
          },
        });
      } else if (axios.isAxiosError<{ error?: string }>(requestError)) {
        const message = requestError.response?.data?.error || requestError.message || 'Request test failed.';
        setError(message);
        setResponse({
          ok: false,
          status: requestError.response?.status || 0,
          statusText: requestError.response?.statusText || 'REQUEST_FAILED',
          durationMs: 0,
          headers: normalizeHeaders(requestError.response?.headers as Record<string, unknown> | undefined),
          data: requestError.response?.data || { error: message },
          request: {
            method,
            url: `${baseUrl}${path}`,
            path,
          },
        });
      } else if (requestError instanceof Error) {
        setError(requestError.message);
        setResponse({
          ok: false,
          status: 0,
          statusText: 'REQUEST_FAILED',
          durationMs: 0,
          headers: {},
          data: { error: requestError.message },
          request: {
            method,
            url: `${baseUrl}${path}`,
            path,
          },
        });
      } else {
        setError('Request test failed.');
        setResponse({
          ok: false,
          status: 0,
          statusText: 'REQUEST_FAILED',
          durationMs: 0,
          headers: {},
          data: { error: 'Request test failed.' },
          request: {
            method,
            url: `${baseUrl}${path}`,
            path,
          },
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoTest = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const headers = headersText.trim() ? (JSON.parse(headersText) as Record<string, string>) : {};
      const result = await apiService.runAutoTests(apiId, {
        baseUrl,
        headers,
      });
      setSuiteResponse(result);
    } catch (requestError) {
      if (requestError instanceof SyntaxError) {
        setError('Headers JSON is not valid.');
      } else if (axios.isAxiosError<{ error?: string }>(requestError)) {
        setError(requestError.response?.data?.error || requestError.message);
      } else if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError('Auto test suite failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col border-l border-background-border bg-[#0f111b]">
      <div className="flex items-center justify-between border-b border-background-border px-4 py-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-accent-secondary" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Request Tester</p>
            <p className="text-xs text-text-secondary">
              Run a manual request and watch the testing logs update below.
            </p>
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary">
          {pipelineState || 'pending'}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              mode === 'manual'
                ? 'border-[#7384ff]/60 bg-[#151c42] text-text-primary'
                : 'border-white/10 bg-white/[0.03] text-text-secondary hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              <span className="font-semibold">Manual Testing</span>
            </div>
            <p className="mt-2 text-xs opacity-80">Choose one method and test a single request.</p>
          </button>

          <button
            type="button"
            onClick={() => setMode('auto')}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              mode === 'auto'
                ? 'border-[#7384ff]/60 bg-[#151c42] text-text-primary'
                : 'border-white/10 bg-white/[0.03] text-text-secondary hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex items-center gap-2">
              <WandSparkles className="h-4 w-4" />
              <span className="font-semibold">Auto Testing</span>
            </div>
            <p className="mt-2 text-xs opacity-80">Run all saved valid endpoints for this API automatically.</p>
          </button>
        </div>

        <div className="grid grid-cols-[110px_1fr] gap-3">
          {mode === 'manual' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Method</label>
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value as HttpMethod)}
                className="w-full rounded-lg border border-background-border bg-background-primary px-3 py-2 text-text-primary outline-none focus:border-accent-primary"
              >
                {supportedMethods.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Auto Scope
              </p>
              <p className="mt-2 text-sm text-text-primary">{endpoints.length} saved endpoints</p>
            </div>
          )}

          <Input
            label="Base URL"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://your-sandbox-url.com"
          />
        </div>

        {mode === 'manual' ? (
          <>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Selected Endpoint
              </p>
              <p className="mt-2 font-mono text-sm text-text-primary">
                {selectedEndpoint ? `${selectedEndpoint.method} ${selectedEndpoint.path}` : `${method} ${path}`}
              </p>
              <p className="mt-2 text-xs text-text-secondary">
                Click an endpoint in the left sidebar to autofill the tester, or edit the method and path below.
              </p>
            </div>

            <Input
              label="Path"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="/users"
            />
          </>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
              Auto Test Coverage
            </p>
            <div className="mt-3 space-y-2">
              {endpoints.length === 0 ? (
                <p className="text-sm text-text-secondary">No saved endpoints available.</p>
              ) : (
                endpoints.map((endpoint, index) => (
                  <div
                    key={`${endpoint.method}-${endpoint.path}-${index}`}
                    className="rounded-lg border border-white/5 bg-background-primary px-3 py-2 font-mono text-xs text-text-primary"
                  >
                    {endpoint.method} {endpoint.path}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">Headers JSON</label>
          <textarea
            value={headersText}
            onChange={(event) => setHeadersText(event.target.value)}
            className="min-h-[110px] w-full rounded-lg border border-background-border bg-background-primary px-4 py-3 font-mono text-sm text-text-primary outline-none focus:border-accent-primary"
          />
        </div>

        {mode === 'manual' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Body JSON
            </label>
            <textarea
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              disabled={['GET', 'HEAD'].includes(method)}
              className="min-h-[150px] w-full rounded-lg border border-background-border bg-background-primary px-4 py-3 font-mono text-sm text-text-primary outline-none focus:border-accent-primary disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          {mode === 'manual' ? (
            <Button
              type="button"
              onClick={() => void handleTestRequest()}
              disabled={isLoading || !apiId || !baseUrl.trim() || !path.trim()}
              className="inline-flex items-center gap-2"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isLoading ? 'Testing...' : 'Test Request'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void handleAutoTest()}
              disabled={isLoading || !apiId || !baseUrl.trim() || endpoints.length === 0}
              className="inline-flex items-center gap-2"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              {isLoading ? 'Running...' : 'Run Auto Tests'}
            </Button>
          )}
          <p className="text-xs text-text-secondary">
            Use any reachable API base URL. This is ideal for your live sandbox once it is available.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-accent-danger/30 bg-accent-danger/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {mode === 'manual' ? (
          <div className="rounded-2xl border border-background-border bg-black/20">
            <div className="flex items-center justify-between border-b border-background-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Response</p>
                <p className="text-xs text-text-secondary">
                  Status, timing, and payload from the tested request
                </p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone}`}>
                {response ? `${response.status} ${response.statusText}` : 'No response yet'}
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-3 text-xs text-text-secondary">
                <div className="rounded-xl border border-white/5 bg-background-primary px-3 py-2">
                  <span className="block uppercase tracking-[0.18em] text-[10px] opacity-70">Request</span>
                  <span className="mt-1 block font-mono text-text-primary">
                    {response ? `${response.request.method} ${response.request.path}` : `${method} ${path}`}
                  </span>
                </div>
                <div className="rounded-xl border border-white/5 bg-background-primary px-3 py-2">
                  <span className="block uppercase tracking-[0.18em] text-[10px] opacity-70">Duration</span>
                  <span className="mt-1 block font-mono text-text-primary">
                    {response ? `${response.durationMs} ms` : '--'}
                  </span>
                </div>
              </div>

              <pre className="max-h-[260px] overflow-auto rounded-xl border border-white/5 bg-[#0a0a0f] p-4 text-xs text-[#cfd6ff]">
                {response ? prettyJson(response.data) : 'Run a request to inspect the response body.'}
              </pre>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-background-border bg-black/20">
            <div className="flex items-center justify-between border-b border-background-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Auto Test Results</p>
                <p className="text-xs text-text-secondary">
                  Runs each saved endpoint against the base URL you provide
                </p>
              </div>
              <div className="rounded-full px-3 py-1 text-xs font-bold text-text-secondary bg-background-border">
                {suiteResponse ? `${suiteResponse.passed}/${suiteResponse.total} passed` : 'Not run yet'}
              </div>
            </div>

            <div className="space-y-3 p-4">
              {suiteResponse ? (
                <>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl border border-white/5 bg-background-primary px-3 py-2">
                      <span className="block uppercase tracking-[0.18em] text-[10px] text-text-secondary opacity-70">Total</span>
                      <span className="mt-1 block font-mono text-text-primary">{suiteResponse.total}</span>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-background-primary px-3 py-2">
                      <span className="block uppercase tracking-[0.18em] text-[10px] text-text-secondary opacity-70">Passed</span>
                      <span className="mt-1 block font-mono text-accent-success">{suiteResponse.passed}</span>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-background-primary px-3 py-2">
                      <span className="block uppercase tracking-[0.18em] text-[10px] text-text-secondary opacity-70">Failed</span>
                      <span className="mt-1 block font-mono text-accent-danger">{suiteResponse.failed}</span>
                    </div>
                  </div>

                  <div className="max-h-[320px] space-y-2 overflow-auto">
                    {suiteResponse.results.map((result, index) => (
                      <div
                        key={`${result.endpoint.method}-${result.endpoint.path}-${index}`}
                        className="rounded-xl border border-white/5 bg-background-primary px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-sm text-text-primary">
                            {result.endpoint.method} {result.endpoint.path}
                          </p>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                              result.ok
                                ? 'bg-accent-success/20 text-accent-success'
                                : 'bg-accent-danger/20 text-accent-danger'
                            }`}
                          >
                            {result.status === 0 ? 'FAILED' : `${result.status} ${result.statusText}`}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-text-secondary">
                          {result.durationMs} ms
                          {result.endpoint.operation ? ` • ${result.endpoint.operation}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-secondary">
                  Click <span className="font-semibold text-text-primary">Run Auto Tests</span> to test all saved endpoints for this API.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
