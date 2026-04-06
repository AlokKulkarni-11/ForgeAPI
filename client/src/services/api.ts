import axios, { type InternalAxiosRequestConfig } from 'axios';
import { supabase } from '../config/supabase';
import type {
  ApiAutoTestResponse,
  ApiPayload,
  ApiRecord,
  ApiTestRequest,
  ApiTestResponse,
  PipelineFeed,
  UserProfile,
} from '../types/app';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
);

export const apiService = {
  getApis: () => apiClient.get<ApiRecord[]>('/api/apis').then((res) => res.data),
  deleteApi: (id: string) => apiClient.delete<{ success: boolean; message: string }>(`/api/apis/${id}`).then((res) => res.data),
  createApi: (payload: ApiPayload) =>
    apiClient.post<ApiRecord>('/api/apis', payload).then((res) => res.data),
  getApiById: (id: string) =>
    apiClient.get<ApiRecord>(`/api/apis/${id}`).then((res) => res.data),
  getApiPipeline: (id: string) =>
    apiClient.get<PipelineFeed>(`/api/apis/${id}/pipeline`).then((res) => res.data),
  getUserProfile: () =>
    apiClient.get<UserProfile>('/api/user/profile').then((res) => res.data),
  updateUserProfile: (payload: Pick<UserProfile, 'name'>) =>
    apiClient.put<UserProfile>('/api/user/profile', payload).then((res) => res.data),
  exportGithub: (id: string, repoName: string) =>
    apiClient
      .post<{ url: string }>(`/api/apis/${id}/export/github`, { repoName })
      .then((res) => res.data),
  testRequest: (id: string, payload: ApiTestRequest) =>
    apiClient.post<ApiTestResponse>(`/api/apis/${id}/test-request`, payload).then((res) => res.data),
  runAutoTests: (id: string, payload: Pick<ApiTestRequest, 'baseUrl' | 'headers'>) =>
    apiClient
      .post<ApiAutoTestResponse>(`/api/apis/${id}/test-suite`, payload)
      .then((res) => res.data),
  exportZipUrl: (id: string) => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${backendUrl}/api/apis/${id}/export/zip`;
  },
};
