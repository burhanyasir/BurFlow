/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router } from '../core/router';

function setupUrl(path: string) {
  window.history.pushState({}, '', path);
}

describe('Router', () => {
  let router: Router;

  beforeEach(() => {
    setupUrl('/');
    router = new Router();
  });

  it('addRoute and navigate triggers handler', () => {
    const handler = vi.fn();
    router.addRoute('/test', handler, false);
    router.navigate('/test');
    expect(handler).toHaveBeenCalledWith({});
  });

  it('navigate with pushState updates URL', () => {
    router.addRoute('/page', () => {}, false);
    router.navigate('/page');
    expect(window.location.pathname).toBe('/page');
  });

  it('navigate without pushState does not update URL', () => {
    router.addRoute('/page', () => {}, false);
    router.navigate('/page', false);
    expect(window.location.pathname).toBe('/');
  });

  it('extracts route params', () => {
    const handler = vi.fn();
    router.addRoute('/users/:id', handler, false);
    router.navigate('/users/abc123');
    expect(handler).toHaveBeenCalledWith({ id: 'abc123' });
  });

  it('multiple params extracted', () => {
    const handler = vi.fn();
    router.addRoute('/orgs/:orgId/repos/:repoId', handler, false);
    router.navigate('/orgs/o1/repos/r1');
    expect(handler).toHaveBeenCalledWith({ orgId: 'o1', repoId: 'r1' });
  });

  it('onNotFound called for unknown route', () => {
    const notFound = vi.fn();
    router.onNotFound(notFound);
    router.navigate('/nonexistent');
    expect(notFound).toHaveBeenCalled();
  });

  it('onRouteChange fires on navigation', () => {
    const fn = vi.fn();
    router.onRouteChange(fn);
    router.addRoute('/a', () => {}, false);
    router.navigate('/a');
    expect(fn).toHaveBeenCalled();
  });

  it('onRouteChange unsub works', () => {
    const fn = vi.fn();
    const unsub = router.onRouteChange(fn);
    unsub();
    router.addRoute('/a', () => {}, false);
    router.navigate('/a');
    expect(fn).not.toHaveBeenCalled();
  });

  it('getCurrentPath returns current path', () => {
    router.addRoute('/x', () => {}, false);
    router.navigate('/x');
    expect(router.getCurrentPath()).toBe('/x');
  });

  it('resolve on popstate', () => {
    const handler = vi.fn();
    router.addRoute('/pop', handler, false);
    window.history.pushState({}, '', '/pop');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(handler).toHaveBeenCalled();
  });

  it('destroy removes listener', () => {
    const handler = vi.fn();
    router.addRoute('/x', handler, false);
    router.destroy();
    window.history.pushState({}, '', '/x');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('basePath is stripped from path', () => {
    const r = new Router('/admin');
    const handler = vi.fn();
    r.addRoute('/dashboard', handler, false);
    window.history.pushState({}, '', '/admin/dashboard');
    r.navigate('/dashboard');
    expect(handler).toHaveBeenCalled();
  });

  it('addRoute returns router for chaining', () => {
    const result = router.addRoute('/a', () => {}, false).addRoute('/b', () => {}, false);
    expect(result).toBe(router);
  });

  it('handler is called on first matching route only', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    router.addRoute('/dup', h1, false);
    router.addRoute('/dup', h2, false);
    router.navigate('/dup');
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).not.toHaveBeenCalled();
  });
});
