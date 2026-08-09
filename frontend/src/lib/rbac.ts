import type { AuthUser } from './auth-types';

export const ADMIN_ROLES = ['admin', 'owner'] as const;

export function isAdmin(user?: Pick<AuthUser, 'role'> | null): boolean {
  return !!user && !!user.role && (ADMIN_ROLES as readonly string[]).includes(user.role);
}

export const ADMIN_ONLY_PATHS = [
  '/dashboard/insights',
  '/dashboard/unanswered',
  '/dashboard/citations',
  '/dashboard/settings',
];

export function isAdminPath(path: string): boolean {
  return ADMIN_ONLY_PATHS.some(p => path === p || path.startsWith(`${p}/`));
}