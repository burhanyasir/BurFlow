const TOKEN_KEY = 'auth_token';

export const storage = {
  getToken: (): string | null => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  setToken: (token: string): void => {
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
  },
  removeToken: (): void => {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  },
};
