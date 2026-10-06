import { storage } from '../lib/storage.js';

export const TOKEN_KEY = 'pm.token';
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

/** Error thrown for non-2xx responses. `code` is translated via errors.<code>. */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const token = storage.get(TOKEN_KEY);
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal,
      headers: {
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', err.message);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = data?.error ?? {};
    if (res.status === 401 && error.code === 'AUTH_INVALID_TOKEN') onUnauthorized();
    throw new ApiError(res.status, error.code || 'UNKNOWN', error.message, error.details);
  }
  return data;
}

export const get = (path, opts) => api(path, opts);
export const post = (path, body) => api(path, { method: 'POST', body });
export const patch = (path, body) => api(path, { method: 'PATCH', body });
export const put = (path, body) => api(path, { method: 'PUT', body });
export const del = (path) => api(path, { method: 'DELETE' });

export const photoUrl = (photo) => (photo ? `/uploads/${encodeURIComponent(photo)}` : undefined);
