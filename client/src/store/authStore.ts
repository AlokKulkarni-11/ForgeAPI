import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../config/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  initAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,

  setSession: (session) =>
    set({
      session,
      user: session?.user || null,
      isAuthenticated: !!session?.user,
      isLoading: false,
    }),

  initAuth: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      set({
        session,
        user: session?.user || null,
        isAuthenticated: !!session?.user,
        isLoading: false,
      });

      supabase.auth.onAuthStateChange((_event, nextSession) => {
        set({
          session: nextSession,
          user: nextSession?.user || null,
          isAuthenticated: !!nextSession?.user,
          isLoading: false,
        });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isAuthenticated: false });
  },
}));
