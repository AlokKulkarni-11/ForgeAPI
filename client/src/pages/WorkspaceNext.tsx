import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, GitBranch, HeartPulse, LayoutDashboard, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { apiClient, apiService } from '../services/api';
import type { ApiRecord } from '../types/app';
import { Button } from '../components/ui/Button';

const getScoreTone = (score?: number | null) => {
  if (!score) {
    return {
      text: 'text-text-secondary',
      ring: 'border-background-border',
      bar: 'bg-background-border',
    };
  }

  if (score >= 90) {
    return {
      text: 'text-accent-secondary',
      ring: 'border-accent-secondary/30',
      bar: 'bg-accent-secondary',
    };
  }

  if (score >= 80) {
    return {
      text: 'text-accent-warning',
      ring: 'border-accent-warning/30',
      bar: 'bg-accent-warning',
    };
  }

  return {
    text: 'text-accent-danger',
    ring: 'border-accent-danger/30',
    bar: 'bg-accent-danger',
  };
};

const getScoreStroke = (score?: number | null) => {
  if (!score) {
    return '#3b4256';
  }

  if (score >= 90) {
    return '#22c55e';
  }

  if (score >= 80) {
    return '#f59e0b';
  }

  return '#ef4444';
};

const slugifyRepoName = (value: string) =>
  `forgeapi-${String(value || 'project')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;

export default function WorkspaceNext() {
  const { id = '' } = useParams();
  const [api, setApi] = useState<ApiRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [zipLoading, setZipLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadApi = async () => {
      try {
        const data = await apiService.getApiById(id);
        if (!cancelled) {
          setApi(data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load project summary');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadApi();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const repoName = useMemo(() => slugifyRepoName(api?.name || 'project'), [api?.name]);
  const scoreTone = getScoreTone(api?.owasp_score);
  const scoreValue = Math.min(Math.max(api?.owasp_score || 0, 0), 100);
  const circleRadius = 52;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleOffset = circleCircumference - (scoreValue / 100) * circleCircumference;
  const circleStroke = getScoreStroke(api?.owasp_score);

  const handleZipDownload = async () => {
    if (!api) {
      return;
    }

    setZipLoading(true);
    toast.loading('Generating ZIP archive...', { id: 'workspace-next-zip' });

    try {
      const response = await apiClient.get<Blob>(`/api/apis/${api.id}/export/zip`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `forgeapi-${api.name}-export.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('ZIP downloaded successfully.', { id: 'workspace-next-zip' });
    } catch {
      toast.error('Failed to download ZIP.', { id: 'workspace-next-zip' });
    } finally {
      setZipLoading(false);
    }
  };

  const handleGithubPush = async () => {
    if (!api) {
      return;
    }

    setGithubLoading(true);

    try {
      const response = await apiService.exportGithub(api.id, repoName);
      toast.success(`Code pushed to GitHub repository "${repoName}".`);
      window.open(response.url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Failed to push code to GitHub.');
    } finally {
      setGithubLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-text-secondary animate-pulse-slow">Loading project summary...</div>;
  }

  if (!api) {
    return <div className="p-12 text-center text-accent-danger">Failed to load project summary.</div>;
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          to={`/workspace/${id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-background-border bg-background-secondary px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-background-border"
        >
          <ArrowLeft className="h-4 w-4" />
          Back To Workspace
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-background-border bg-background-secondary px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-background-border"
        >
          Go To Dashboard
          <LayoutDashboard className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-3xl border border-background-border bg-background-card p-8 shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-secondary">
              Summary Of Project
            </p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">{api.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              {api.description || 'Generated API project overview and export readiness summary.'}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-background-border bg-background-primary px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                  Status
                </p>
                <p className="mt-2 text-sm font-semibold capitalize text-text-primary">{api.status}</p>
              </div>
              <div className="rounded-2xl border border-background-border bg-background-primary px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                  Framework
                </p>
                <p className="mt-2 text-sm font-semibold capitalize text-text-primary">{api.framework}</p>
              </div>
              <div className="rounded-2xl border border-background-border bg-background-primary px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                  Database
                </p>
                <p className="mt-2 text-sm font-semibold capitalize text-text-primary">{api.database_type}</p>
              </div>
              <div className="rounded-2xl border border-background-border bg-background-primary px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                  Iterations
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{api.iteration_count || 0}</p>
              </div>
            </div>
          </div>

          <div
            className={`min-w-[300px] rounded-3xl border ${scoreTone.ring} bg-background-primary px-8 pb-7 pt-5 text-center md:ml-auto`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
              OWASP Score
            </p>
            <div className="relative mx-auto mt-5 flex h-40 w-40 items-center justify-center">
              <svg className="h-40 w-40 -rotate-90 drop-shadow-[0_0_28px_rgba(34,197,94,0.18)]" viewBox="0 0 140 140" aria-hidden="true">
                <circle
                  cx="70"
                  cy="70"
                  r={circleRadius}
                  fill="none"
                  stroke="#1f2432"
                  strokeWidth="7"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={circleRadius}
                  fill="none"
                  stroke={circleStroke}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circleCircumference}
                  strokeDashoffset={circleOffset}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5">
                  <ShieldCheck className={`h-4 w-4 ${scoreTone.text}`} />
                </div>
                <p className={`text-3xl font-extrabold leading-none tracking-tight ${scoreTone.text}`}>
                  {api.owasp_score ?? '--'}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-text-secondary">
                  out of 100
                </p>
              </div>
            </div>
            <div className="mt-2 px-2">
              <p className="text-xs text-text-secondary">Current project security rating</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                Based on the latest OWASP evaluation.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <button
            type="button"
            onClick={() => void handleZipDownload()}
            disabled={zipLoading}
            className="rounded-2xl border border-background-border bg-background-primary p-6 text-left transition hover:border-accent-primary/40 hover:bg-background-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-accent-primary/15 p-3 text-accent-primary">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-text-primary">Download Code ZIP</p>
                <p className="text-sm text-text-secondary">
                  Export the generated project files as a local ZIP archive.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Button type="button" disabled={zipLoading} className="pointer-events-none">
                {zipLoading ? 'Preparing ZIP...' : 'Download ZIP'}
              </Button>
            </div>
          </button>

          <button
            type="button"
            onClick={() => void handleGithubPush()}
            disabled={githubLoading}
            className="rounded-2xl border border-background-border bg-background-primary p-6 text-left transition hover:border-accent-secondary/40 hover:bg-background-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-accent-secondary/15 p-3 text-accent-secondary">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-text-primary">Push Code To GitHub</p>
                <p className="text-sm text-text-secondary">
                  Publish this API using the default repository name
                  {' '}
                  <span className="font-mono text-text-primary">{repoName}</span>.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Button type="button" disabled={githubLoading} variant="secondary" className="pointer-events-none">
                {githubLoading ? 'Pushing To GitHub...' : 'Push To GitHub'}
              </Button>
            </div>
          </button>

          <button
            type="button"
            className="rounded-2xl border border-background-border bg-background-primary p-6 text-left transition hover:border-accent-warning/40 hover:bg-background-secondary"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-accent-warning/15 p-3 text-accent-warning">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-text-primary">Self heal</p>
                <p className="text-sm text-text-secondary">
                  Self heal the project to improve code quality and reliability.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Button type="button" variant="secondary" className="pointer-events-none">
                Self heal
              </Button>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
