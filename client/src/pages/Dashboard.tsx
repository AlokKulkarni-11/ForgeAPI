import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Activity,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Server,
  Shield,
  Trash2,
} from 'lucide-react';
import { Badge, type BadgeVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useApiStore } from '../store/apiStore';

const filters = ['All', 'Live', 'Failed', 'Expired'] as const;
type DashboardFilter = (typeof filters)[number];

export default function Dashboard() {
  const { apis, isLoading, fetchApis, deleteApi, getStats } = useApiStore();
  const [filter, setFilter] = useState<DashboardFilter>('All');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchApis();
  }, [fetchApis]);

  const stats = getStats();
  const filteredApis = apis.filter(
    (api) =>
      (filter === 'All' || api.status === filter.toLowerCase()) &&
      api.name.toLowerCase().includes(search.toLowerCase()),
  );

  const getStatusColor = (status: string): BadgeVariant => {
    switch (status) {
      case 'live':
        return 'success';
      case 'testing':
        return 'info';
      case 'failed':
        return 'danger';
      case 'expired':
        return 'neutral';
      case 'healing':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getScoreColor = (score?: number | null) => {
    if (!score) {
      return 'bg-background-secondary w-0';
    }

    if (score >= 80) {
      return 'bg-accent-secondary';
    }

    if (score >= 50) {
      return 'bg-accent-warning';
    }

    return 'bg-accent-danger';
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`Delete "${name}"? This will remove its saved files, logs, and reports.`);

    if (!confirmed) {
      return;
    }

    setDeletingId(id);

    try {
      await deleteApi(id);
      toast.success(`Deleted ${name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete API';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Manage your auto-generated APIs and pipelines.</p>
        </div>
        <Link to="/create">
          <Button className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> New API
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Activity, label: 'Total Generated', value: stats.total },
          { icon: Server, label: 'Live Sandboxes', value: stats.live },
          { icon: Shield, label: 'Avg OWASP Score', value: `${stats.avgScore}/100` },
          { icon: RefreshCw, label: 'Total Runs', value: stats.totalRuns },
        ].map((stat) => {
          const IconComponent = stat.icon;

          return (
            <div
              key={stat.label}
              className="bg-background-card border border-background-border rounded-xl p-6 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-text-secondary">{stat.label}</p>
                <h3 className="text-3xl font-bold text-text-primary mt-1">{stat.value}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-background-secondary border border-background-border flex items-center justify-center">
                <IconComponent className="w-6 h-6 text-accent-primary" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center bg-background-card p-2 rounded-xl border border-background-border mb-6 gap-2">
        <div className="flex items-center w-full md:w-auto overflow-x-auto gap-2 p-1">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                filter === item
                  ? 'bg-background-secondary text-text-primary shadow-sm border border-background-border'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary/50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64 px-2 md:px-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search APIs..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-background-primary border border-background-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredApis.length === 0 ? (
        <div className="text-center py-20 bg-background-card border border-background-border rounded-xl border-dashed">
          <div className="w-16 h-16 bg-background-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <Server className="w-8 h-8 text-text-secondary" />
          </div>
          <h3 className="text-xl font-bold text-text-primary">No APIs found</h3>
          <p className="text-text-secondary mt-2 mb-6 max-w-sm mx-auto">
            Create an entity specification to let ForgeAPI multi-agent system generate your first backend.
          </p>
          <Link to="/create">
            <Button>Create your first API</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApis.map((api) => (
            <div
              key={api.id}
              className="bg-background-card border border-background-border rounded-xl p-5 hover:border-accent-primary/50 transition flex flex-col group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    {api.name}
                    <Badge variant={getStatusColor(api.status)} className="capitalize">
                      {api.status}
                    </Badge>
                  </h3>
                  <p className="text-xs text-text-secondary mt-1 tracking-wide">
                    {api.framework.toUpperCase()} / {api.database_type.toUpperCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(api.id, api.name)}
                  disabled={deletingId === api.id}
                  className="text-text-secondary hover:text-accent-danger transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title={deletingId === api.id ? 'Deleting...' : 'Delete API'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-6 flex-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    OWASP Score
                  </span>
                  <span className="text-sm font-bold text-text-primary">
                    {api.owasp_score || '--'}/100
                  </span>
                </div>
                <div className="w-full h-2 bg-background-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getScoreColor(api.owasp_score)}`}
                    style={{ width: `${Math.min(api.owasp_score || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-background-border">
                <Link to={`/workspace/${api.id}`} className="flex-1">
                  <Button variant="secondary" className="w-full justify-center">
                    Workspace
                  </Button>
                </Link>
                <Link to={`/api/${api.id}`}>
                  <button
                    type="button"
                    className="p-2 border border-background-border bg-background-secondary hover:bg-background-border rounded-lg text-text-secondary hover:text-text-primary transition"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
