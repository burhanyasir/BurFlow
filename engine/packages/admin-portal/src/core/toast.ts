export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast { id: string; type: ToastType; message: string; duration: number; }

let toasts: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];
let nextId = 1;

export function addToast(type: ToastType, message: string, duration = 5000): string {
  const id = String(nextId++);
  const toast: Toast = { id, type, message, duration };
  toasts = [...toasts, toast];
  listeners.forEach(fn => fn(toasts));
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
  return id;
}

export function removeToast(id: string): void {
  toasts = toasts.filter(t => t.id !== id);
  listeners.forEach(fn => fn(toasts));
}

export function getToasts(): readonly Toast[] { return toasts; }

export function onToastsChange(fn: (toasts: Toast[]) => void): () => void {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export const toast = {
  success: (msg: string, duration?: number) => addToast('success', msg, duration),
  error: (msg: string, duration?: number) => addToast('error', msg, duration),
  info: (msg: string, duration?: number) => addToast('info', msg, duration),
  warning: (msg: string, duration?: number) => addToast('warning', msg, duration),
};
