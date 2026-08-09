export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  role?: string;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus?: string;
}

export interface AuthState {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isAuthenticated: boolean;
  loading: boolean;
}
