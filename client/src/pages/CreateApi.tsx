import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiService } from '../services/api';
import type { ApiPayload, EntityDefinition, EntityField, FieldType } from '../types/app';

const steps = ['Entities & Fields', 'Endpoints & Auth', 'Config & Preview'];

type AuthType = 'jwt' | 'apikey' | 'none';
type FrameworkType = 'nodejs' | 'fastapi';
type DatabaseType = 'postgresql' | 'mongodb';
type TestMode = 'functional' | 'security' | 'all';
type EditableFieldKey = 'name' | 'type' | 'required';

const createField = (id: number): EntityField => ({
  id,
  name: '',
  type: 'string',
  required: false,
});

export default function CreateApi() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entities, setEntities] = useState<EntityDefinition[]>([
    { id: 1, name: 'User', fields: [{ id: 1, name: 'email', type: 'string', required: true }] },
  ]);
  const [authType, setAuthType] = useState<AuthType>('jwt');
  const [framework, setFramework] = useState<FrameworkType>('nodejs');
  const [dbType, setDbType] = useState<DatabaseType>('postgresql');
  const [testMode, setTestMode] = useState<TestMode>('functional');

  const addEntity = () => {
    setEntities((current) => [...current, { id: Date.now(), name: '', fields: [] }]);
  };

  const removeEntity = (entityId: number) => {
    setEntities((current) => current.filter((entity) => entity.id !== entityId));
  };

  const updateEntityName = (entityId: number, value: string) => {
    setEntities((current) =>
      current.map((entity) =>
        entity.id === entityId ? { ...entity, name: value } : entity,
      ),
    );
  };

  const addField = (entityId: number) => {
    setEntities((current) =>
      current.map((entity) =>
        entity.id === entityId
          ? { ...entity, fields: [...entity.fields, createField(Date.now())] }
          : entity,
      ),
    );
  };

  const removeField = (entityId: number, fieldId: number) => {
    setEntities((current) =>
      current.map((entity) =>
        entity.id === entityId
          ? {
              ...entity,
              fields: entity.fields.filter((field) => field.id !== fieldId),
            }
          : entity,
      ),
    );
  };

  const updateField = (
    entityId: number,
    fieldId: number,
    key: EditableFieldKey,
    value: string | boolean,
  ) => {
    setEntities((current) =>
      current.map((entity) =>
        entity.id === entityId
          ? {
              ...entity,
              fields: entity.fields.map((field) =>
                field.id === fieldId
                  ? ({
                      ...field,
                      [key]: value,
                    } as EntityField)
                  : field,
              ),
            }
          : entity,
      ),
    );
  };

  const handleGenerate = async () => {
    if (!name) {
      toast.error('API Name is required');
      return;
    }

    const endpoints = entities
      .map((entity) => [
        {
          method: 'GET',
          path: `/${entity.name.toLowerCase()}s`,
          entity: entity.name,
          operation: 'list',
        },
        {
          method: 'POST',
          path: `/${entity.name.toLowerCase()}s`,
          entity: entity.name,
          operation: 'create',
        },
        {
          method: 'GET',
          path: `/${entity.name.toLowerCase()}s/:id`,
          entity: entity.name,
          operation: 'get',
        },
        {
          method: 'PUT',
          path: `/${entity.name.toLowerCase()}s/:id`,
          entity: entity.name,
          operation: 'replace',
        },
        {
          method: 'PATCH',
          path: `/${entity.name.toLowerCase()}s/:id`,
          entity: entity.name,
          operation: 'update',
        },
        {
          method: 'DELETE',
          path: `/${entity.name.toLowerCase()}s/:id`,
          entity: entity.name,
          operation: 'delete',
        },
      ])
      .flat();

    const payload: ApiPayload = {
      name,
      description,
      framework,
      database_type: dbType,
      test_mode: testMode,
      auth_type: authType,
      entities,
      endpoints,
      validation_rules: [],
      raw_prompt: `I need a ${framework} REST API with ${entities.map((entity) => entity.name).join(', ')} entities.`,
    };

    setLoading(true);

    try {
      const response = await apiService.createApi(payload);
      toast.success('API requirement saved! Initializing generation agents...');
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
        <p className="text-text-secondary mt-2">Generate a production-ready API via AI Agents</p>
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
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="API Name"
                placeholder="e.g. E-Commerce Backend"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Input
                label="Short Description"
                placeholder="Handles users and orders"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="pt-4 border-t border-background-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Database Entities</h3>
                <Button type="button" variant="secondary" onClick={addEntity}>
                  <Plus className="w-4 h-4 mr-2 inline" /> Add Entity
                </Button>
              </div>

              {entities.map((entity) => (
                <div
                  key={entity.id}
                  className="border border-background-border rounded-xl p-4 mb-4 bg-background-secondary/30 relative"
                >
                  <div className="flex justify-between items-center mb-4">
                    <Input
                      className="w-64"
                      placeholder="Entity Name (e.g. Product)"
                      value={entity.name}
                      onChange={(event) => updateEntityName(entity.id, event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeEntity(entity.id)}
                      className="text-text-secondary hover:text-accent-danger"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2 mb-4 pl-4 border-l-2 border-background-border">
                    {entity.fields.map((field) => (
                      <div key={field.id} className="flex gap-4 items-center">
                        <Input
                          className="flex-1"
                          placeholder="Field name"
                          value={field.name}
                          onChange={(event) =>
                            updateField(entity.id, field.id, 'name', event.target.value)
                          }
                        />
                        <select
                          className="bg-background-primary border border-background-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-primary w-32"
                          value={field.type}
                          onChange={(event) =>
                            updateField(
                              entity.id,
                              field.id,
                              'type',
                              event.target.value as FieldType,
                            )
                          }
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                          <option value="uuid">UUID</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm text-text-secondary w-24">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(event) =>
                              updateField(entity.id, field.id, 'required', event.target.checked)
                            }
                            className="accent-accent-primary w-4 h-4 rounded"
                          />{' '}
                          Required
                        </label>
                        <button
                          type="button"
                          onClick={() => removeField(entity.id, field.id)}
                          className="text-text-secondary hover:text-accent-danger"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-sm border border-dashed border-background-border"
                    onClick={() => addField(entity.id)}
                  >
                    + Add Field
                  </Button>
                </div>
              ))}
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

            <div className="pt-4 border-t border-background-border">
              <h3 className="text-lg font-semibold text-text-primary mb-2">Automated Endpoints</h3>
              <p className="text-text-secondary mb-4 text-sm">
                ForgeAPI's Generation Agent will automatically scaffold full CRUD controllers for all{' '}
                {entities.length} entities mapped in Step 1.
              </p>
              <div className="flex gap-4 p-4 bg-background-secondary rounded-xl border border-background-border">
                <Bot className="w-6 h-6 text-accent-primary flex-shrink-0" />
                <p className="text-sm text-text-primary">
                  I will analyze your schema and generate exactly {entities.length * 5} optimized
                  REST endpoints with complete validation guards seamlessly.
                </p>
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
                      className="w-full bg-background-primary border border-background-border rounded-lg px-4 py-2 text-text-primary outline-none focus:border-accent-primary pt-2 pb-2"
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
                      className="w-full bg-background-primary border border-background-border rounded-lg px-4 py-2 text-text-primary outline-none focus:border-accent-primary pt-2 pb-2"
                    >
                      <option value="postgresql">PostgreSQL (Prisma)</option>
                      <option value="mongodb">MongoDB (Mongoose)</option>
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
                            ? 'Validate exact endpoint logic and edge cases.'
                            : mode === 'security'
                              ? 'Aggressive injection blocks and Auth bypass scans.'
                              : 'Complete CI/CD autonomous loop verification.'}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0d0d12] border border-background-border rounded-xl mt-4">
              <h4 className="text-xs font-mono text-text-secondary uppercase mb-2">
                AI Agent Requirement Context Payload Preview
              </h4>
              <pre className="text-xs text-accent-secondary overflow-auto p-2 bg-black/30 rounded">
                {JSON.stringify(
                  {
                    name,
                    framework,
                    dbType,
                    testMode,
                    entityCount: entities.length,
                    instruction: `Build robust ${framework} layer.`,
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
