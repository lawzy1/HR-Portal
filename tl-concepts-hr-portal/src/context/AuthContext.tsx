import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export type AppRole = 'admin' | 'employee';

export interface AuthProfile {
  id: string;
  companyId: string;
  employeeId: string | null;
  role: AppRole;
  isActive: boolean;
}

interface AuthContextType {
  session: Session | null;
  profile: AuthProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Row Level Security on `profiles` is what actually enforces access — this
// query only ever returns the caller's own row (or nothing, pre-Phase 2
// bootstrap). See supabase/migrations/00000000000001_foundation.sql.
async function fetchProfile(userId: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, company_id, employee_id, role, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    companyId: data.company_id,
    employeeId: data.employee_id,
    role: data.role,
    isActive: data.is_active,
  };
}

async function fetchSessionTimeout(companyId: string): Promise<number> {
  const { data } = await supabase
    .from('company_settings')
    .select('session_timeout_minutes')
    .eq('company_id', companyId)
    .maybeSingle();
  return data?.session_timeout_minutes || 30;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session?.user) {
        const nextProfile = await fetchProfile(data.session.user.id);
        setProfile(nextProfile);
        if (nextProfile) setSessionTimeoutMinutes(await fetchSessionTimeout(nextProfile.companyId));
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      const nextProfile = newSession?.user ? await fetchProfile(newSession.user.id) : null;
      setProfile(nextProfile);
      if (nextProfile) setSessionTimeoutMinutes(await fetchSessionTimeout(nextProfile.companyId));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let timer = window.setTimeout(() => supabase.auth.signOut(), sessionTimeoutMinutes * 60_000);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => supabase.auth.signOut(), sessionTimeoutMinutes * 60_000);
    };
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [session, sessionTimeoutMinutes]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
