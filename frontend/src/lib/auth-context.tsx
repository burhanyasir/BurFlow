import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authClient } from './auth-client';
import { storage } from './storage';
import type { AuthState, AuthUser, AuthTenant } from './auth-types';

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, companyName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (name?: string, avatarUrl?: string) => Promise<void>;
  switchWorkspace: (subTenantId: string) => Promise<AuthTenant | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeTokenRole(token: string): string | undefined {
  try {
    const payload = token.split('.')[1];
    if (!payload) return undefined;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.role === 'string' ? json.role : undefined;
  } catch {
    return undefined;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    isAuthenticated: false,
    loading: true,
  });

  const setUser = useCallback((user: AuthUser | null, tenant?: AuthTenant | null) => {
    setState({
      user,
      tenant: tenant || null,
      isAuthenticated: !!user,
      loading: false,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const token = storage.getToken();
    if (!token) {
      setUser(null);
      return;
    }
    const applyUser = (data: any) => {
      const primaryTenant = data.tenants?.[0] || null;
      setUser(
        { ...data.user, emailVerified: true, role: decodeTokenRole(token) },
        primaryTenant ? { id: primaryTenant.id, name: primaryTenant.name, slug: primaryTenant.slug, plan: primaryTenant.plan, subscriptionStatus: primaryTenant.subscriptionStatus } : null,
      );
    };
    const isAuthError = (err: any) => {
      const status = err?.status ?? err?.statusCode ?? err?.response?.status;
      return status === 401 || status === 403;
    };
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        applyUser(await authClient.getMe());
        return;
      } catch (err: any) {
        if (isAuthError(err)) {
          storage.removeToken();
          setUser(null);
          return;
        }
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    setState(prev => ({ ...prev, loading: false }));
  }, [setUser]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const onFocus = () => {
      if (storage.getToken()) refreshUser();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authClient.login(email, password);
    const user = { id: data.user.id, email: data.user.email, name: data.user.name, emailVerified: true, role: decodeTokenRole(data.token) };
    const tenant = data.tenant ? { id: data.tenant.id, name: data.tenant.name, slug: data.tenant.slug, plan: data.tenant.plan } : null;
    storage.setAuthSession(data.token, user, tenant);
    setUser(user, tenant);
  }, [setUser]);

  const signup = useCallback(async (email: string, password: string, name: string, companyName?: string) => {
    const data = await authClient.signup(email, password, name, companyName);
    const user = { id: data.user.id, email: data.user.email, name: data.user.name, emailVerified: false, role: decodeTokenRole(data.token) };
    const tenant = data.tenant ? { id: data.tenant.id, name: data.tenant.name, slug: data.tenant.slug, plan: data.tenant.plan } : null;
    storage.setAuthSession(data.token, user, tenant);
    setUser(user, tenant);
  }, [setUser]);

  const logout = useCallback(async () => {
    // Notify server to revoke refresh tokens — fire-and-forget, don't block UI
    try {
      const token = storage.getToken();
      if (token) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch {}
    storage.removeToken();
    setUser(null);
  }, [setUser]);

  const updateProfile = useCallback(async (name?: string, avatarUrl?: string) => {
    const data = await authClient.updateProfile(name, avatarUrl);
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...data.user } : null,
    }));
  }, []);

  const switchWorkspace = useCallback(async (subTenantId: string) => {
    const data = await authClient.switchWorkspace(subTenantId);
    const user = state.user ? { ...state.user, role: decodeTokenRole(data.token) } : null;
    const tenant: AuthTenant | null = data.tenant
      ? { id: data.tenant.id, name: data.tenant.name, slug: data.tenant.slug, plan: data.tenant.plan, subscriptionStatus: data.tenant.subscriptionStatus }
      : null;
    storage.setAuthSession(data.token, user, tenant);
    setUser(user, tenant);
    return tenant;
  }, [state.user, setUser]);

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, refreshUser, updateProfile, switchWorkspace }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
