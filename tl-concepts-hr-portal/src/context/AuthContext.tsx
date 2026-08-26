import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export type AppRole = 'admin' | 'hr' | 'employee';

export interface AuthProfile {
  id: string;
  companyId: string;
  employeeId: string | null;
  role: AppRole;
  isActive: boolean;
  onboardingStatus: 'invited' | 'in_progress' | 'submitted' | 'needs_changes' | 'approved' | 'revoked';
  onboardingNote: string | null;
}

interface AuthContextType {
  session: Session | null;
  profile: AuthProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Row Level Security on `profiles` is what actually enforces access — this
// query only ever returns the caller's own row (or nothing, pre-Phase 2
// bootstrap). See supabase/migrations/00000000000001_foundation.sql.
async function fetchProfile(userId: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, company_id, employee_id, role, is_active, onboarding_status, onboarding_note')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    companyId: data.company_id,
    employeeId: data.employee_id,
    role: data.role,
    isActive: data.is_active,
    onboardingStatus: data.onboarding_status as AuthProfile['onboardingStatus'],
    onboardingNote: data.onboarding_note,
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
  const profileRequestId = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const syncAuthState = async (nextSession: Session | null) => {
      const requestId = ++profileRequestId.current;
      setLoading(true);
      setSession(nextSession);
      setProfile(null);

      if (!nextSession?.user) {
        if (isMounted && requestId === profileRequestId.current) {
          setSessionTimeoutMinutes(30);
          setLoading(false);
        }
        return;
      }

      const nextProfile = await fetchProfile(nextSession.user.id);
      const nextSessionTimeoutMinutes = nextProfile
        ? await fetchSessionTimeout(nextProfile.companyId)
        : 30;

      if (!isMounted || requestId !== profileRequestId.current) return;
      setProfile(nextProfile);
      setSessionTimeoutMinutes(nextSessionTimeoutMinutes);
      setLoading(false);
    };

    void supabase.auth.getSession().then(({ data }) => syncAuthState(data.session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      void syncAuthState(newSession);
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
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return { error: error?.message ?? null };
  };

  const requestPasswordReset = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    return { error: error?.message ?? null };
  };

  // Password changes are deliberately scoped to the currently authenticated
  // user. Re-authentication prevents a stale/unattended session from being
  // used to change the account password without knowing the current password.
  const changePassword = async (currentPassword: string, newPassword: string) => {
    const { data: currentSession } = await supabase.auth.getSession();
    const email = currentSession.session?.user.email?.trim().toLowerCase();
    if (!email) return { error: 'Không xác định được email của tài khoản hiện tại.' };

    const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (reauthenticationError) {
      return { error: 'Mật khẩu hiện tại không đúng hoặc phiên đăng nhập đã hết hạn.' };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    const nextProfile = data.session?.user ? await fetchProfile(data.session.user.id) : null;
    setSession(data.session);
    setProfile(nextProfile);
    if (nextProfile) setSessionTimeoutMinutes(await fetchSessionTimeout(nextProfile.companyId));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, requestPasswordReset, changePassword, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
