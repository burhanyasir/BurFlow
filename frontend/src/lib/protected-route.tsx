import { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';
import { isAdmin } from './rbac';
import { useToast } from '../components/ui/Toast';

function RouteSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-[var(--color-accent-600)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <RouteSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const { addToast } = useToast();

  useEffect(() => {
    if (!loading && isAuthenticated && !isAdmin(user)) {
      addToast('Admin privileges required to access this page', 'error');
    }
  }, [loading, isAuthenticated, user, addToast]);

  if (loading) {
    return <RouteSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-neutral-100)]">
            <svg className="h-7 w-7 text-[var(--color-neutral-400)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-[var(--color-neutral-900)]">Admin privileges required</h1>
          <p className="mt-2 text-sm text-[var(--color-neutral-500)]">
            This page is restricted to workspace owners and admins. Ask the workspace owner to grant you access.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex h-9 items-center gap-2 px-4 text-sm font-semibold rounded-lg bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-700)] transition-colors"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
