import { useState, type ChangeEvent } from 'react';
import { Code2, Download, GitBranch, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient, apiService } from '../../services/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ExportModalProps {
  apiId: string;
  apiName: string;
  onClose: () => void;
}

export function ExportModal({ apiId, apiName, onClose }: ExportModalProps) {
  const [repoName, setRepoName] = useState(
    `forgeapi-${apiName.toLowerCase().replace(/\s+/g, '-')}`,
  );
  const [loading, setLoading] = useState(false);

  const handleGithubPush = async () => {
    if (!repoName) {
      toast.error('Repository name required');
      return;
    }

    setLoading(true);

    try {
      const response = await apiService.exportGithub(apiId, repoName);
      toast.success('Successfully deployed to GitHub!');
      window.open(response.url, '_blank', 'noopener,noreferrer');
      onClose();
    } catch {
      toast.error('Failed to push to GitHub');
    } finally {
      setLoading(false);
    }
  };

  const handleZipDownload = async () => {
    toast.loading('Generating Archive...', { id: 'zip' });

    try {
      const response = await apiClient.get<Blob>(`/api/apis/${apiId}/export/zip`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `forgeapi-${apiName}-export.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download complete', { id: 'zip' });
      onClose();
    } catch {
      toast.error('Failed to download ZIP', { id: 'zip' });
    }
  };

  const handleRepoNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRepoName(event.target.value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
      <div className="bg-background-card border border-background-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 border-b border-background-border bg-background-secondary/30">
          <Code2 className="w-8 h-8 text-accent-primary mb-3" />
          <h2 className="text-2xl font-bold text-text-primary">Export Source Code</h2>
          <p className="text-sm text-text-secondary mt-1">
            Download the fully configured code or push it directly to GitHub.
          </p>
        </div>

        <div className="p-6 space-y-8">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4" /> One-Click Deploy to GitHub
            </h3>
            <div className="flex gap-2 items-end">
              <Input
                label="Target Repository"
                value={repoName}
                onChange={handleRepoNameChange}
                className="flex-1"
              />
              <Button type="button" onClick={handleGithubPush} disabled={loading} className="w-24">
                {loading ? 'Pushing...' : 'Push'}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="h-px w-full bg-background-border" />
            <span className="text-xs text-text-secondary font-mono tracking-widest uppercase">OR</span>
            <span className="h-px w-full bg-background-border" />
          </div>

          <div className="text-center">
            <Button
              type="button"
              variant="secondary"
              onClick={handleZipDownload}
              className="w-full flex justify-center items-center gap-2 py-3 border-dashed border-2 hover:border-accent-primary transition-colors"
            >
              <Download className="w-4 h-4" /> Download Local ZIP Archive
            </Button>
            <p className="text-xs text-text-secondary mt-3">
              Contains server.js, express routes, environment variables, and package.json ready to jumpstart locally.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
