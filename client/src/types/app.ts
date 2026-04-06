export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'uuid';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface EntityField {
  id: number;
  name: string;
  type: FieldType;
  required: boolean;
}

export interface EntityDefinition {
  id: number;
  name: string;
  fields: EntityField[];
}

export interface EndpointDefinition {
  method: HttpMethod | string;
  path: string;
  entity?: string;
  operation?: string;
}

export interface RequirementField {
  name: string;
  type: string;
  required?: boolean;
}

export interface RequirementEntity {
  name: string;
  fields: RequirementField[];
}

export interface ApiRequirements {
  auth_type?: string;
  entities?: RequirementEntity[];
  endpoints?: EndpointDefinition[];
}

export interface ApiRecord {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  framework: string;
  database_type: string;
  requirements?: ApiRequirements;
  owasp_score?: number | null;
  iteration_count?: number | null;
  sandbox_url?: string | null;
  sandbox_port?: number | null;
  files?: Record<string, string>;
}

export interface ApiPayload {
  name: string;
  description: string;
  framework: string;
  database_type: string;
  test_mode: string;
  auth_type: string;
  entities: EntityDefinition[];
  endpoints: EndpointDefinition[];
  validation_rules: string[];
  raw_prompt: string;
}

export interface UserProfile {
  name: string;
  email: string;
}

export type PipelineStatus = 'connecting' | 'connected' | 'error' | 'closed';

export type PipelineLogLevel = 'info' | 'success' | 'warning' | 'error';

export interface PipelineLogEntry {
  created_at?: string | number;
  iteration?: number;
  agent?: string;
  level?: PipelineLogLevel;
  message: string;
  metadata?: unknown;
}

export interface PipelineFeed {
  status: string;
  logs: PipelineLogEntry[];
}

export interface ApiTestRequest {
  baseUrl: string;
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ApiTestResponse {
  ok: boolean;
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  data: unknown;
  request: {
    method: HttpMethod;
    url: string;
    path: string;
  };
}

export interface ApiAutoTestResult extends ApiTestResponse {
  endpoint: {
    method: HttpMethod | string;
    path: string;
    operation?: string;
  };
}

export interface ApiAutoTestResponse {
  total: number;
  passed: number;
  failed: number;
  results: ApiAutoTestResult[];
}
