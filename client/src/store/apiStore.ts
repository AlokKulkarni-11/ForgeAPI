import axios from 'axios';
import { create } from 'zustand';
import { apiService } from '../services/api';
import type { ApiRecord } from '../types/app';

interface ApiStats {
  total: number;
  live: number;
  avgScore: number;
  totalRuns: number;
}

interface ApiStore {
  apis: ApiRecord[];
  isLoading: boolean;
  error: string | null;
  fetchApis: () => Promise<void>;
  deleteApi: (id: string) => Promise<void>;
  getStats: () => ApiStats;
}

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Failed to fetch APIs.';
};

export const useApiStore = create<ApiStore>((set, get) => ({
  apis: [],
  isLoading: false,
  error: null,

  fetchApis: async () => {
    set({ isLoading: true, error: null });

    try {
      const data = await apiService.getApis();
      set({ apis: data, isLoading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  deleteApi: async (id) => {
    set({ error: null });

    try {
      await apiService.deleteApi(id);
      set((state) => ({
        apis: state.apis.filter((api) => api.id !== id),
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) });
      throw error;
    }
  },

  getStats: () => {
    const { apis } = get();

    return {
      total: apis.length,
      live: apis.filter((api) => api.status === 'live').length,
      avgScore: apis.length
        ? Math.round(
            apis.reduce((acc, curr) => acc + (curr.owasp_score || 0), 0) / apis.length,
          )
        : 0,
      totalRuns: apis.reduce((acc, curr) => acc + (curr.iteration_count || 0), 0),
    };
  },
}));
