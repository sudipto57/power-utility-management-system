// The ONE place that talks to the backend.
// Every API file (customers.js, bills.js ...) uses apiRequest().

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const TOKEN_KEY = 'power_utility_token';

// The login token is kept in the browser (localStorage) so a refresh keeps you logged in.
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage not available: the user just has to log in again after a refresh */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiRequestError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * apiRequest('/customers', { params: { search: 'john' } })
 * apiRequest('/customers', { method: 'POST', body: { full_name: '...' } })
 * Returns the "data" part of the answer, or throws ApiRequestError with a readable message.
 */
export async function apiRequest(path, { method = 'GET', body, params } = {}) {
  const url = new URL(API_URL + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
  }

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // On your computer the usual cause is a stopped backend. On the live website the
    // server may be waking up (free hosting sleeps when nobody uses it), so just try again.
    throw new ApiRequestError(
      import.meta.env.DEV
        ? 'Cannot reach the server. Make sure the backend is running (npm run dev in the backend folder).'
        : 'Cannot reach the server right now. Please check your internet and try again in a minute.',
      0
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Token expired or invalid: tell the app to show the login page
    if (response.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiRequestError(payload.message || `Request failed (${response.status})`, response.status, payload.code);
  }

  return payload.data;
}

/** Downloads a file (e.g. a Support attachment) and returns it as a Blob. */
export async function apiDownload(path) {
  const token = tokenStore.get();
  const response = await fetch(API_URL + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => null);
  if (!response || !response.ok) {
    const payload = response ? await response.json().catch(() => ({})) : {};
    throw new ApiRequestError(payload.message || 'The file could not be downloaded. Please try again', response?.status || 0);
  }
  return response.blob();
}
