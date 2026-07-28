/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersPage } from '../pages/users';
import { clearAuth, setAuth } from '../core/auth';

function makeApi(overrides: Record<string, any> = {}): any {
  const defaults: Record<string, (...args: any[]) => Promise<any>> = {
    getMembers: vi.fn().mockResolvedValue({
      members: [
        { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'owner' },
        { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'member' },
      ],
    }),
    getTenant: vi.fn().mockResolvedValue({ tenant: { name: 'Test Tenant' } }),
  };
  return { ...defaults, ...overrides };
}

describe('UsersPage', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    setAuth({ userId: 'u1', token: 'tok', role: 'admin', tenantId: 't1' });
  });

  it('renders page header', async () => {
    const api = makeApi();
    const page = new UsersPage(api);
    page.mount(container);
    expect(container.textContent).toContain('User & Role Management');
    page.unmount();
  });

  it('loads members', async () => {
    const api = makeApi();
    const page = new UsersPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(api.getMembers).toHaveBeenCalled();
    expect(container.textContent).toContain('Alice');
    expect(container.textContent).toContain('Bob');
    expect(container.textContent).toContain('alice@test.com');
    page.unmount();
  });

  it('shows role badges', async () => {
    const api = makeApi();
    const page = new UsersPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('owner');
    expect(container.textContent).toContain('member');
    page.unmount();
  });

  it('handles API error gracefully', async () => {
    const api = makeApi({
      getMembers: vi.fn().mockRejectedValue(new Error('fail')),
      getTenant: vi.fn().mockRejectedValue(new Error('fail')),
    });
    const page = new UsersPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.querySelector('[data-testid="users-page"]')).toBeTruthy();
    page.unmount();
  });

  it('shows tenant name', async () => {
    const api = makeApi();
    const page = new UsersPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('Test Tenant');
    page.unmount();
  });
});
