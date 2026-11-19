import axios from 'axios';
import { API_URL } from '@/constants/config';

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  withCredentials: false,
});

let cookieGetter: (() => Promise<string | null>) | null = null;

/** @deprecated Use setApiCookieGetter — Better Auth sessions use Cookie headers. */
export function setApiTokenGetter(getter: () => Promise<string | null>) {
  cookieGetter = getter;
}

export function setApiCookieGetter(getter: () => Promise<string | null>) {
  cookieGetter = getter;
}

api.interceptors.request.use(async (config) => {
  if (cookieGetter) {
    const cookie = await cookieGetter();
    if (cookie) {
      config.headers = config.headers || {};
      (config.headers as Record<string, string>).Cookie = cookie;
    }
  }
  return config;
});

export default api;
