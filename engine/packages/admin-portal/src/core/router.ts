export type RouteHandler = (params: Record<string, string>) => void;
export interface Route { pattern: RegExp; paramNames: string[]; handler: RouteHandler; requiresAuth: boolean; roles?: string[]; }

export class Router {
  private routes: Route[] = [];
  private currentRoute: Route | null = null;
  private notFoundHandler: () => void = () => {};
  private listeners: Array<() => void> = [];
  private basePath: string;

  constructor(basePath = '') {
    this.basePath = basePath;
    this.onPopState = this.onPopState.bind(this);
    window.addEventListener('popstate', this.onPopState);
  }

  private onPopState(): void { this.resolve(); }

  addRoute(path: string, handler: RouteHandler, requiresAuth = true, roles?: string[]): Router {
    const paramNames: string[] = [];
    const pattern = path.replace(/:(\w+)/g, (_, name) => { paramNames.push(name); return '([^/]+)'; });
    this.routes.push({ pattern: new RegExp(`^${pattern}$`), paramNames, handler, requiresAuth, roles });
    return this;
  }

  onNotFound(handler: () => void): void { this.notFoundHandler = handler; }

  navigate(path: string, pushState = true): void {
    const url = this.basePath + path;
    if (pushState) window.history.pushState({}, '', url);
    this.resolve();
  }

  resolve(): void {
    const path = window.location.pathname.replace(new RegExp(`^${this.basePath}`), '') || '/';
    for (const route of this.routes) {
      const match = path.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
        this.currentRoute = route;
        route.handler(params);
        this.listeners.forEach(fn => fn());
        return;
      }
    }
    this.notFoundHandler();
  }

  getCurrentPath(): string { return window.location.pathname; }
  onRouteChange(fn: () => void): () => void { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(l => l !== fn); }; }
  destroy(): void { window.removeEventListener('popstate', this.onPopState); }
}
