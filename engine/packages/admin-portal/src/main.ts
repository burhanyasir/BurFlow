import { ApiClient } from './core/api-client';
import { AdminLayout } from './pages/layout';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const api = new ApiClient({
  baseUrl: API_BASE,
  getToken: () => localStorage.getItem('token'),
});

const app = document.getElementById('app')!;
const layout = new AdminLayout(api);
layout.mount(app);
