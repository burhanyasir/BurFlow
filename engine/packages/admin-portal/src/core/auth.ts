import { UserRole } from './types';

export interface AuthState {
  userId: string | null;
  email: string | null;
  name: string | null;
  role: UserRole | null;
  tenantId: string | null;
  token: string | null;
}

const DEFAULT_AUTH: AuthState = { userId: null, email: null, name: null, role: null, tenantId: null, token: null };

let authState: AuthState = { ...DEFAULT_AUTH };
let listeners: Array<() => void> = [];

export function getAuth(): AuthState { return { ...authState }; }

export function setAuth(state: Partial<AuthState>): void {
  authState = { ...authState, ...state };
  listeners.forEach(fn => fn());
}

export function clearAuth(): void {
  authState = { ...DEFAULT_AUTH };
  listeners.forEach(fn => fn());
}

export function onAuthChange(fn: () => void): () => void {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export function isAuthenticated(): boolean {
  return authState.token !== null && authState.userId !== null;
}

export function hasRole(...roles: UserRole[]): boolean {
  return authState.role !== null && roles.includes(authState.role!);
}

export function canAccessAdmin(): boolean {
  return hasRole('owner', 'admin');
}

export function canManageKnowledge(): boolean {
  return hasRole('owner', 'admin', 'operator');
}

export function canViewConversations(): boolean {
  return hasRole('owner', 'admin', 'operator', 'member');
}

export function parseJwtPayload(token: string): Partial<AuthState> {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role as UserRole,
      tenantId: payload.tenantId,
      token,
    };
  } catch {
    return {};
  }
}

export function loginFromToken(token: string): void {
  const payload = parseJwtPayload(token);
  setAuth(payload);
}
