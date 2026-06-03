import { useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  FileCode2,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiService } from '../services/api';
import type { ApiPayload, EntityDefinition, EndpointDefinition } from '../types/app';

const steps = ['Idea', 'Inference', 'Config'];

type AuthType = 'jwt' | 'apikey' | 'none';
type FrameworkType = 'nodejs' | 'fastapi';
type DatabaseType = 'postgresql' | 'mongodb';
type TestMode = 'functional' | 'security' | 'all';

const entityAliases = [
  'user',
  'product',
  'order',
  'payment',
  'invoice',
  'customer',
  'cart',
  'task',
  'project',
  'ticket',
  'comment',
  'message',
  'post',
  'book',
  'author',
  'student',
  'teacher',
  'course',
  'employee',
  'company',
  'vendor',
  'shipment',
  'booking',
  'appointment',
  'review',
  'subscription',
  'report',
  'notification',
];

const normalizeEntityName = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join('') || 'Resource';

const pluralize = (value: string) => {
  const base = value.trim().toLowerCase();

  if (!base) {
    return 'resources';
  }

  if (base.endsWith('y')) {
    return `${base.slice(0, -1)}ies`;
  }

  if (base.endsWith('s')) {
    return base;
  }

  return `${base}s`;
};

const defaultFields = (entity: string) => {
  const key = entity.toLowerCase();

  const presets: Record<string, Array<{ name: string; type: EntityDefinition['fields'][number]['type']; required: boolean }>> = {
    user: [
      { name: 'name', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'password', type: 'string', required: false },
    ],
    product: [
      { name: 'name', type: 'string', required: true },
      { name: 'price', type: 'number', required: true },
      { name: 'description', type: 'string', required: false },
    ],
    order: [
      { name: 'status', type: 'string', required: true },
      { name: 'total', type: 'number', required: true },
      { name: 'userId', type: 'uuid', required: false },
    ],
    task: [
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'completed', type: 'boolean', required: false },
    ],
    project: [
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'status', type: 'string', required: false },
    ],
    book: [
      { name: 'title', type: 'string', required: true },
      { name: 'author', type: 'string', required: true },
      { name: 'isbn', type: 'string', required: false },
    ],
  };

  return presets[key] || [
    { name: 'name', type: 'string', required: true },
    { name: 'description', type: 'string', required: false },
  ];
};

const inferDesign = (name: string, description: string) => {
  const text = `${name} ${description}`.toLowerCase();
  const matched = entityAliases.filter((alias) => new RegExp(`\\b${alias}s?\\b`, 'i').test(text));
  const uniqueEntities = [...new Set((matched.length > 0 ? matched : ['resource']).map(normalizeEntityName))].slice(0, 5);

  const entities: EntityDefinition[] = uniqueEntities.map((entity, entityIndex) => ({
    id: entityIndex + 1,
    name: entity,
    fields: defaultFields(entity).map((field, fieldIndex) => ({
      id: fieldIndex + 1,
      name: field.name,
      type: field.type,
      required: field.required,
    })),
  }));

  const endpoints: EndpointDefinition[] = entities.flatMap((entity) => {
    const resource = pluralize(entity.name);

    return [
      { method: 'GET', path: `/${resource}`, entity: entity.name, operation: 'list' },
      { method: 'POST', path: `/${resource}`, entity: entity.name, operation: 'create' },
      { method: 'GET', path: `/${resource}/:id`, entity: entity.name, operation: 'get' },
      { method: 'PUT', path: `/${resource}/:id`, entity: entity.name, operation: 'replace' },
      { method: 'PATCH', path: `/${resource}/:id`, entity: entity.name, operation: 'update' },
      { method: 'DELETE', path: `/${resource}/:id`, entity: entity.name, operation: 'delete' },
    ];
  });

  return { entities, endpoints };
};

export default function CreateApi() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [authType, setAuthType] = useState<AuthType>('jwt');
  const [framework, setFramework] = useState<FrameworkType>('nodejs');
  const [dbType, setDbType] = useState<DatabaseType>('postgresql');
  const [testMode, setTestMode] = useState<TestMode>('functional');

  const inferred = useMemo(() => inferDesign(name, description), [name, description]);

  const handleGenerate = async () => {
    if (!name.trim()) {
      toast.error('API Name is required');
      return;
    }

    if (!description.trim()) {
      toast.error('Short description is required');
      return;
    }

    const payload: ApiPayload = {
      name: name.trim(),
      description: description.trim(),
      framework,
      database_type: dbType,
      test_mode: testMode,
      auth_type: authType,
      entities: inferred.entities,
      endpoints: inferred.endpoints,
      validation_rules: [],
      raw_prompt: description.trim(),
    };

    setLoading(true);

    try {
      const response = await apiService.createApi(payload);
      toast.success('ForgeAPI inferred the API structure and started generation.');
      navigate(`/workspace/${response.id}`);
    } catch (error) {
      const message = axios.isAxiosError<{ error?: string }>(error)
        ? error.response?.data?.error || error.message
        : error instanceof Error
          ? error.message
          : 'Failed to create API';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-6 pb-20 mt-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-text-primary">Create New API</h1>
        <p className="text-text-secondary mt-2">
          Describe the backend in one sentence and ForgeAPI will infer the entities and routes.
        </p>
      </div>

      <div className="flex justify-between items-center mb-12 relative">
        <div className="absolute left-0 right-0 h-1 bg-background-border top-1/2 -translate-y-1/2 z-0" />
        {steps.map((stepLabel, index) => {
          const stepNumber = index + 1;
          const isActive = step >= stepNumber;

          return (
            <div
              key={stepLabel}
              className="relative z-10 flex flex-col items-center gap-2 bg-background-primary px-4"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                  isActive
                    ? 'border-accent-primary bg-accent-primary text-white'
                    : 'border-background-border bg-background-secondary text-text-secondary'
                }`}
              >
                {step > stepNumber ? <CheckCircle2 className="w-6 h-6" /> : stepNumber}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive ? 'text-text-primary' : 'text-text-secondary'
                }`}
              >
                {stepLabel}
              </span>
            </div>
          );
        })}
      </div>

      <div className="bg-background-card border border-background-border rounded-2xl p-6 md:p-8 shadow-xl">
        {step === 1 && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="grid gap-4">
              <Input
                label="API Name"
                placeholder="e.g. E-Commerce Backend"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Short Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Example: Build an ecommerce API with users, products, orders and payments."
                  className="min-h-[140px] w-full rounded-lg border border-background-border bg-background-primary px-4 py-3 text-text-primary outline-none focus:border-accent-primary"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-background-border bg-background-secondary/30 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-accent-primary mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    Description-first generation
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">
                    You no longer need to manually enter entities here. ForgeAPI will infer them from
                    your short description and you can add editing later.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Authentication Standard</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { id: 'jwt', title: 'JWT (JSON Web Token)', desc: 'Standard stateless auth' },
                  { id: 'apikey', title: 'API Keys', desc: 'Secure B2B endpoint access' },
                  { id: 'none', title: 'None (Public API)', desc: 'No authentication required' },
                ].map((option) => (
                  <div
                    key={option.id}
                    onClick={() => setAuthType(option.id as AuthType)}
                    className={`cursor-pointer border rounded-xl p-4 transition-all ${
                      authType === option.id
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-background-border hover:border-text-secondary bg-background-secondary/50'
                    }`}
                  >
                    <h4 className="font-semibold text-text-primary">{option.title}</h4>
                    <p className="text-sm text-text-secondary mt-1">{option.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-background-border">
              <div className="rounded-xl border border-background-border bg-background-secondary/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-5 h-5 text-accent-primary" />
                  <h3 className="text-lg font-semibold text-text-primary">Inferred Entities</h3>
                </div>
                <div className="space-y-3">
                  {inferred.entities.map((entity) => (
                    <div key={entity.name} className="rounded-lg bg-background-primary px-3 py-3">
                      <p className="font-semibold text-text-primary">{entity.name}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {entity.fields.map((field) => `${field.name}:${field.type}`).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-background-border bg-background-secondary/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileCode2 className="w-5 h-5 text-accent-secondary" />
                  <h3 className="text-lg font-semibold text-text-primary">Inferred Endpoints</h3>
                </div>
                <div className="max-h-[280px] space-y-2 overflow-auto">
                  {inferred.endpoints.map((endpoint, index) => (
                    <div
                      key={`${endpoint.method}-${endpoint.path}-${index}`}
                      className="rounded-lg bg-background-primary px-3 py-2 font-mono text-xs text-text-primary"
                    >
                      {endpoint.method} {endpoint.path}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Tech Stack Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Target Framework
                    </label>
                    <select
                      value={framework}
                      onChange={(event) => setFramework(event.target.value as FrameworkType)}
                      className="w-full bg-background-primary border border-background-border rounded-lg px-4 py-2 text-text-primary outline-none focus:border-accent-primary"
                    >
                      <option value="nodejs">Node.js (Express)</option>
                      <option value="fastapi">Python (FastAPI)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Database ORM
                    </label>
                    <select
                      value={dbType}
                      onChange={(event) => setDbType(event.target.value as DatabaseType)}
                      className="w-full bg-background-primary border border-background-border rounded-lg px-4 py-2 text-text-primary outline-none focus:border-accent-primary"
                    >
                      <option value="postgresql">PostgreSQL</option>
                      <option value="mongodb">MongoDB</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Pipeline Test Mode</h3>
                <div className="space-y-3">
                  {(['functional', 'security', 'all'] as TestMode[]).map((mode) => (
                    <label
                      key={mode}
                      className="flex items-start gap-3 p-3 border border-background-border rounded-lg cursor-pointer hover:bg-background-secondary transition"
                    >
                      <input
                        type="radio"
                        checked={testMode === mode}
                        onChange={() => setTestMode(mode)}
                        className="mt-1 accent-accent-primary"
                      />
                      <div>
                        <span className="block font-medium text-text-primary capitalize">
                          {mode} Testing
                        </span>
                        <span className="block text-xs text-text-secondary">
                          {mode === 'functional'
                            ? 'Run live endpoint verification against the generated runtime.'
                            : mode === 'security'
                              ? 'Keep the focus on security validation and failure surfacing.'
                              : 'Run the full feedback loop across all generated endpoints.'}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0d0d12] border border-background-border rounded-xl mt-4">
              <h4 className="text-xs font-mono text-text-secondary uppercase mb-2">
                AI Agent Context Payload Preview
              </h4>
              <pre className="text-xs text-accent-secondary overflow-auto p-2 bg-black/30 rounded">
                {JSON.stringify(
                  {
                    name,
                    description,
                    authType,
                    framework,
                    dbType,
                    testMode,
                    inferredEntities: inferred.entities.map((entity) => entity.name),
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-background-border flex justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1}
            className={step === 1 ? 'invisible' : ''}
          >
            <ArrowLeft className="w-4 h-4 mr-2 inline" /> Back
          </Button>

          {step < 3 ? (
            <Button type="button" onClick={() => setStep((current) => Math.min(3, current + 1))}>
              Continue <ArrowRight className="w-4 h-4 ml-2 inline" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleGenerate}
              disabled={loading}
              className="shadow-lg shadow-accent-primary/20"
            >
              {loading ? 'Initializing Pipeline...' : 'Generate API & Deploy'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
