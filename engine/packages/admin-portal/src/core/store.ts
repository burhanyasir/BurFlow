export type StoreListener<T> = (state: T, prevState: T) => void;

export class Store<T extends Record<string, unknown>> {
  private state: T;
  private listeners: Map<keyof T, Array<StoreListener<any>>> = new Map();
  private globalListeners: Array<(state: T) => void> = [];

  constructor(initialState: T) {
    this.state = { ...initialState };
  }

  get<K extends keyof T>(key: K): T[K] { return this.state[key]; }
  getAll(): Readonly<T> { return this.state; }

  set<K extends keyof T>(key: K, value: T[K]): void {
    const prev = { ...this.state };
    this.state[key] = value;
    this.notify(key, value, prev[key]);
    this.globalListeners.forEach(fn => fn(this.state));
  }

  update(partial: Partial<T>): void {
    const prev = { ...this.state };
    Object.assign(this.state, partial);
    (Object.keys(partial) as Array<keyof T>).forEach(key => {
      this.notify(key, this.state[key], prev[key]);
    });
    this.globalListeners.forEach(fn => fn(this.state));
  }

  subscribe<K extends keyof T>(key: K, listener: StoreListener<T[K]>): () => void {
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key)!.push(listener);
    return () => {
      const list = this.listeners.get(key);
      if (list) this.listeners.set(key, list.filter(l => l !== listener));
    };
  }

  onAny(fn: (state: T) => void): () => void {
    this.globalListeners.push(fn);
    return () => { this.globalListeners = this.globalListeners.filter(l => l !== fn); };
  }

  private notify<K extends keyof T>(key: K, value: T[K], prev: T[K]): void {
    const list = this.listeners.get(key);
    if (list) list.forEach(fn => fn(value, prev));
  }
}
