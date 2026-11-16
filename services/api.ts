import axios from 'axios';
import { API_URL } from '@/constants/config';

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setApiTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

api.interceptors.request.use(async (config) => {
  if (!config.headers.Authorization && tokenGetter) {
    const token = await tokenGetter();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
