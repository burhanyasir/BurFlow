import { storage } from './storage';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class AuthClient {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = storage.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      const text = await res.text().catch(() => '');
      throw new Error(text ? `Server error: ${text.slice(0, 200)}` : `HTTP ${res.status}: Empty response`);
    }

    if (!res.ok) {
      const err = new Error(data.error?.message || data.error || `Request failed (${res.status})`);
      (err as any).status = res.status;
      throw err;
    }

    return data as T;
  }

  signup(email: string, password: string, name: string, companyName?: string) {
    return this.request<{ user: { id: string; email: string; name: string }; token: string; tenant: { id: string; name: string; slug: string; plan: string } }>('POST', '/auth/signup', { email, password, name, companyName });
  }

  login(email: string, password: string) {
    return this.request<{ user: { id: string; email: string; name: string }; token: string; tenant: { id: string; name: string; slug: string; plan: string } | null }>('POST', '/auth/login', { email, password });
  }

  getMe() {
    return this.request<{ user: { id: string; email: string; name: string; avatarUrl?: string }; tenants: Array<{ id: string; name: string; slug: string; plan: string; subscriptionStatus?: string }> }>('GET', '/auth/me');
  }

  updateProfile(name?: string, avatarUrl?: string) {
    return this.request<{ user: { id: string; email: string; name: string; avatarUrl?: string } }>('PUT', '/auth/me', { name, avatarUrl });
  }

  switchWorkspace(subTenantId: string) {
    return this.request<{ token: string; tenant: { id: string; name: string; slug: string; plan: string; subscriptionStatus?: string } }>('POST', '/agency/switch-workspace', { subTenantId });
  }

  listAgencyWorkspaces() {
    return this.request<{
      workspaces: Array<{ id: string; name: string; slug: string; plan: string; subscriptionStatus?: string; customDomain?: string | null }>;
      parent: { id: string; name: string; slug: string; plan: string; subscriptionStatus?: string; customDomain?: string | null } | null;
    }>('GET', '/agency/workspaces');
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('PUT', '/auth/password', { currentPassword, newPassword });
  }

  forgotPassword(email: string) {
    return this.request<{ message: string }>('POST', '/auth/forgot-password', { email });
  }

  resetPassword(token: string, password: string) {
    return this.request<{ message: string }>('POST', '/auth/reset-password', { token, password });
  }

  verifyEmail(token: string) {
    return this.request<{ message: string }>('POST', '/auth/verify-email', { token });
  }

  resendVerification() {
    return this.request<{ message: string }>('POST', '/auth/resend-verification');
  }
}

export const authClient = new AuthClient();
