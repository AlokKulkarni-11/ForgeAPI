import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Database,
  PlayCircle,
  Server,
  ShieldCheck,
  TerminalSquare,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ExportModal } from '../components/workspace/ExportModal';
import { apiService } from '../services/api';
import type { ApiRecord, ApiSecurityVulnerability } from '../types/app';

type ApiDetailsTab = 'requirements' | 'endpoints' | 'security';

export default function ApiDetails() {
  const { id = '' } = useParams();
  const [api, setApi] = useState<ApiRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ApiDetailsTab>('requirements');
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    setLoading(true);

    apiService
      .getApiById(id)
      .then((data) => {
        setApi(data);
        setLoading(false);
      })
      .catch((requestError: Error) => {
        setError(requestError.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-text-secondary animate-pulse-slow">Loading API details...</div>;
  }

  if (error || !api) {
    return <div className="p-12 text-center text-accent-danger">Failed to load API details.</div>;
  }

  const requirements = api.requirements || {};
  const latestTestReport = api.latest_test_report;
  const latestSecurityReport = api.latest_security_report;
  const latestVulnerabilities = Array.isArray(latestSecurityReport?.vulnerabilities)
    ? latestSecurityReport.vulnerabilities
    : [];
  const formatVulnerabilityLabel = (item: ApiSecurityVulnerability, index: number) =>
    item.owasp_id || item.id || `#${index + 1}`;
  const formatVulnerabilityText = (item: ApiSecurityVulnerability) =>
    item.description || item.name || JSON.stringify(item);

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8">
      {exportOpen && (
        <ExportModal apiId={id} apiName={api.name} onClose={() => setExportOpen(false)} />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-text-primary capitalize">{api.name}</h1>
            <Badge variant={api.status === 'live' ? 'success' : 'warning'}>{api.status}</Badge>
          </div>
          <p className="text-text-secondary">{api.description || 'No description provided.'}</p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 border-dashed"
          >
            Export Code
          </Button>
          <Link to={`/workspace/${id}`}>
            <Button type="button" variant="secondary" className="flex items-center gap-2">
              <TerminalSquare className="w-4 h-4" /> Open Workspace
            </Button>
          </Link>
          <Button
            type="button"
            className="flex items-center gap-2 bg-accent-primary shadow-lg shadow-accent-primary/20"
          >
            <PlayCircle className="w-4 h-4" /> Run Pipeline
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-background-card p-4 rounded-xl border border-background-border flex items-center gap-3">
          <Server className="w-6 h-6 text-blue-400" />
          <div>
            <p className="text-xs text-text-secondary">Framework</p>
            <p className="font-semibold text-text-primary capitalize">{api.framework}</p>
          </div>
        </div>
        <div className="bg-background-card p-4 rounded-xl border border-background-border flex items-center gap-3">
          <Database className="w-6 h-6 text-accent-success" />
          <div>
            <p className="text-xs text-text-secondary">Database</p>
            <p className="font-semibold text-text-primary capitalize">{api.database_type}</p>
          </div>
        </div>
        <div className="bg-background-card p-4 rounded-xl border border-background-border flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-accent-secondary" />
          <div>
            <p className="text-xs text-text-secondary">Auth Protocol</p>
            <p className="font-semibold text-text-primary uppercase">
              {requirements.auth_type || 'NONE'}
            </p>
          </div>
        </div>
        <div className="bg-background-card p-4 rounded-xl border border-background-border flex items-center gap-3">
          <Activity className="w-6 h-6 text-orange-400" />
          <div>
            <p className="text-xs text-text-secondary">Iteration</p>
            <p className="font-semibold text-text-primary">{api.iteration_count || 1}</p>
          </div>
        </div>
      </div>

      {latestTestReport && (
        <div className="mb-6 rounded-xl border border-background-border bg-background-card px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            Latest Test Run
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-white/5 bg-background-primary px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-secondary">Mode</p>
              <p className="mt-1 font-semibold capitalize text-text-primary">{latestTestReport.test_mode}</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-background-primary px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-secondary">Total</p>
              <p className="mt-1 font-semibold text-text-primary">{latestTestReport.total_tests}</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-background-primary px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-secondary">Passed</p>
              <p className="mt-1 font-semibold text-accent-success">{latestTestReport.passed_tests}</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-background-primary px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-secondary">Failed</p>
              <p className="mt-1 font-semibold text-accent-danger">{latestTestReport.failed_tests}</p>
            </div>
          </div>
        </div>
      )}

      {api.runtime_base_url && (
        <div className="mb-6 rounded-xl border border-background-border bg-background-card px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            Live Runtime Base URL
          </p>
          <p className="mt-2 font-mono text-sm text-text-primary break-all">
            {api.runtime_base_url}
          </p>
        </div>
      )}

      <div className="flex items-center gap-6 border-b border-background-border mb-6">
        {[
          { id: 'requirements', label: 'Schema Requirements' },
          { id: 'endpoints', label: 'Endpoints' },
          { id: 'security', label: 'Security & Score' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as ApiDetailsTab)}
            className={`pb-3 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-background-card border border-background-border rounded-xl p-6 min-h-[400px]">
        {activeTab === 'requirements' && (
          <div className="space-y-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-text-primary border-b border-background-border pb-2 mb-4">
              Database Entities
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requirements.entities?.map((entity) => (
                <div
                  key={entity.name}
                  className="border border-background-border bg-background-primary/50 rounded-lg p-4"
                >
                  <h4 className="font-bold text-accent-primary mb-3 capitalize text-lg">
                    {entity.name}
                  </h4>
                  <div className="space-y-2">
                    {entity.fields.map((field) => (
                      <div
                        key={`${entity.name}-${field.name}`}
                        className="flex justify-between items-center bg-background-secondary px-3 py-1.5 rounded-md text-sm"
                      >
                        <span className="font-mono text-text-primary">{field.name}</span>
                        <div className="flex space-x-2">
                          <span className="text-text-secondary text-xs">{field.type}</span>
                          {field.required && (
                            <span className="text-accent-secondary text-[10px] uppercase font-bold px-1 rounded bg-accent-secondary/10">
                              REQ
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {(!requirements.entities || requirements.entities.length === 0) && (
              <p className="text-text-secondary italic">No entities documented.</p>
            )}
          </div>
        )}

        {activeTab === 'endpoints' && (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="text-lg font-bold text-text-primary border-b border-background-border pb-2 mb-4">
              Planned Routes
            </h3>
            {requirements.endpoints?.map((endpoint, index) => (
              <div
                key={`${endpoint.method}-${endpoint.path}-${index}`}
                className="flex items-center p-3 bg-background-primary rounded-lg border border-background-border gap-4"
              >
                <span
                  className={`font-mono text-sm font-bold w-16 text-center py-1 rounded-md bg-opacity-10 ${
                    endpoint.method === 'GET'
                      ? 'text-blue-400 bg-blue-400'
                      : endpoint.method === 'POST'
                        ? 'text-accent-success bg-accent-success'
                        : endpoint.method === 'PUT'
                          ? 'text-orange-400 bg-orange-400'
                          : 'text-accent-danger bg-accent-danger'
                  }`}
                >
                  {endpoint.method}
                </span>
                <span className="font-mono text-text-primary flex-1">{endpoint.path}</span>
                <span className="text-sm font-semibold text-text-secondary capitalize">
                  {endpoint.operation}
                </span>
              </div>
            ))}
            {(!requirements.endpoints || requirements.endpoints.length === 0) && (
              <p className="text-text-secondary italic">No endpoints defined.</p>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between p-6 bg-background-primary border-2 border-background-border rounded-xl">
              <div>
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-accent-warning" /> OWASP Automated Security
                  Score
                </h3>
                <p className="text-text-secondary text-sm mt-1">
                  Based on iterative execution sandbox analysis.
                </p>
              </div>
              <div className="text-5xl font-extrabold text-accent-warning tracking-tighter shadow-lg">
                {latestSecurityReport?.score ?? api.owasp_score ?? '--'}
              </div>
            </div>

            <div className="bg-background-secondary/30 border border-background-border rounded-xl p-4">
              <h4 className="font-semibold text-text-primary flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-accent-danger" /> Latest Vulnerabilities
                Blocked
              </h4>
              {latestVulnerabilities.length > 0 ? (
                <div className="space-y-2">
                  {latestVulnerabilities.map((item, index) => (
                    <div
                      key={`vulnerability-${index}`}
                      className="text-sm flex gap-4 bg-background-primary p-3 rounded-lg border-l-2 border-accent-warning"
                    >
                      <span className="font-mono text-accent-warning font-bold">
                        {typeof item === 'string'
                          ? `#${index + 1}`
                          : formatVulnerabilityLabel(item, index)}
                      </span>
                      <span className="text-text-primary">
                        {typeof item === 'string' ? item : formatVulnerabilityText(item)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : latestSecurityReport?.passed ? (
                <div className="space-y-2">
                  <div className="text-sm flex gap-4 bg-background-primary p-3 rounded-lg border-l-2 border-accent-success">
                    <span className="font-mono text-accent-success font-bold">PASS</span>
                    <span className="text-text-primary">Latest automated security scan passed.</span>
                  </div>
                </div>
              ) : (
                <p className="text-text-secondary text-sm italic">
                  Run pipeline to generate security report.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
