import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { rewriteUserId } from '@/lib/db';
import { syncAllForUser } from '@/lib/sync';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_GUEST_ID = 'carbonpie_guest_user_id';

type AuthContextValue = {
  initializing: boolean;
  guestUserId: string | null;
  principalUserId: string | null;
  session: Session | null;
  isGuest: boolean;
  refreshSession: () => Promise<void>;
  signInEmailPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUpEmailPassword: (email: string, password: string) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  sendPasswordResetEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function ensureGuestId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_GUEST_ID);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(STORAGE_GUEST_ID, id);
  return id;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const refreshSession = useCallback(async () => {
    if (!supabaseConfigured) {
      setSession(null);
      return;
    }
    const { data } = await supabase.auth.getSession();
    setSession(data.session ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const gid = await ensureGuestId();
      if (!cancelled) setGuestUserId(gid);
      await refreshSession();
      if (!cancelled) setInitializing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!supabaseConfigured) return undefined;
    const sub = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const principalUserId = useMemo(() => {
    const uid = session?.user?.id;
    return uid ?? guestUserId;
  }, [guestUserId, session?.user?.id]);

  const isGuest = !session?.user;

  const signInEmailPassword = useCallback(
    async (email: string, password: string) => {
      if (!supabaseConfigured) {
        return {
          error:
            'Supabase 未配置：请在本地 .env 或 Vercel 环境变量中设置 EXPO_PUBLIC_SUPABASE_URL 与 EXPO_PUBLIC_SUPABASE_ANON_KEY 后重新部署。',
        };
      }
      const beforeGuest = guestUserId;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { error: error.message };
      const user = data.user;
      if (user && beforeGuest) {
        rewriteUserId(beforeGuest, user.id);
        const { error: profileErr } = await supabase.from('profiles').upsert(
          { id: user.id, display_name: user.email ?? '用户' },
          { onConflict: 'id' },
        );
        if (profileErr) {
          console.warn('profiles upsert', profileErr.message);
        }
        await syncAllForUser(user.id);
      }
      return {};
    },
    [guestUserId],
  );

  const signUpEmailPassword = useCallback(
    async (email: string, password: string) => {
      if (!supabaseConfigured) {
        return {
          error:
            'Supabase 未配置：请在本地 .env 或 Vercel 环境变量中设置 EXPO_PUBLIC_SUPABASE_URL 与 EXPO_PUBLIC_SUPABASE_ANON_KEY 后重新部署。',
        };
      }
      const beforeGuest = guestUserId;
      const cleanedEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: cleanedEmail,
        password,
      });
      if (error) return { error: error.message };

      const user = data.user;
      if (user) {
        if (beforeGuest) {
          rewriteUserId(beforeGuest, user.id);
        }
        const { error: profileErr } = await supabase.from('profiles').upsert(
          { id: user.id, display_name: user.email ?? cleanedEmail },
          { onConflict: 'id' },
        );
        if (profileErr) {
          console.warn('profiles upsert', profileErr.message);
        }
      }

      const needsEmailConfirm = !data.session;
      if (!needsEmailConfirm && user) {
        await syncAllForUser(user.id);
      }

      return { needsEmailConfirm };
    },
    [guestUserId],
  );

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    if (!supabaseConfigured) {
      return {
        error:
          'Supabase 未配置：请在本地 .env 或 Vercel 环境变量中设置 EXPO_PUBLIC_SUPABASE_URL 与 EXPO_PUBLIC_SUPABASE_ANON_KEY 后重新部署。',
      };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    if (supabaseConfigured) {
      await supabase.auth.signOut();
    }
    await refreshSession();
  }, [refreshSession]);

  const value: AuthContextValue = {
    initializing,
    guestUserId,
    principalUserId,
    session,
    isGuest,
    refreshSession,
    signInEmailPassword,
    signUpEmailPassword,
    sendPasswordResetEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function currentUserEmail(user: User | null | undefined): string | undefined {
  return user?.email ?? undefined;
}
