import { storage } from './storage';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  [key: string]: unknown;
}

class ApiClient {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = storage.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      const text = await res.text().catch(() => '');
      throw new Error(text ? `Server error: ${text.slice(0, 200)}` : `HTTP ${res.status}: Empty response`);
    }

    if (!res.ok) {
      const err = new Error(data.error?.message || data.error || `Request failed (${res.status})`);
      (err as any).status = res.status;
      throw err;
    }

    return data as T;
  }

  get<T = ApiResponse>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T = ApiResponse>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }

  put<T = ApiResponse>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body);
  }

  delete<T = ApiResponse>(path: string) {
    return this.request<T>('DELETE', path);
  }

  async uploadFile(path: string, file: File, onProgress?: (pct: number) => void): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}${path}`);

      const token = storage.getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed: network error'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));

      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });
  }

  async uploadFiles(path: string, files: File[], onProgress?: (pct: number) => void): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}${path}`);

      const token = storage.getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed: network error'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));

      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      xhr.send(formData);
    });
  }
}

export const apiClient = new ApiClient();

/** Drop-in replacement for window.fetch that automatically adds auth header */
export function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = storage.getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
