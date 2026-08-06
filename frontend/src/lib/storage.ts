const AUTH_SESSION_KEY = 'burflow_auth_session';

interface AuthSessionPayload {
  token: string;
  user?: unknown;
  tenant?: unknown;
}

function readSession(): AuthSessionPayload | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSessionPayload;
  } catch {
    return null;
  }
}

function writeSession(session: AuthSessionPayload | null): void {
  try {
    if (!session) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return;
    }
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export const storage = {
  getToken: (): string | null => {
    try {
      const session = readSession();
      return session?.token ?? null;
    } catch { return null; }
  },
  setToken: (token: string): void => {
    const current = readSession() ?? {} as AuthSessionPayload;
    writeSession({ ...current, token });
  },
  setAuthSession: (token: string, user?: unknown, tenant?: unknown): void => {
    writeSession({ token, user, tenant });
  },
  getAuthSession: (): AuthSessionPayload | null => readSession(),
  removeToken: (): void => {
    writeSession(null);
  },
};
