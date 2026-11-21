import { API_URL } from './config';

export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

let unauthorizedHandler = null;

/**
 * Registers a callback for 401 responses on authenticated requests
 * (expired or invalid token). The store uses it to end the session.
 */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

/**
 * Small fetch wrapper for the OrderFlow API.
 * Returns the parsed JSON body ({ success, data, meta }) or throws an ApiError
 * with the message and field details sent by the API.
 */
export async function apiRequest(path, { method = 'GET', body, token, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(
      'Cannot reach the server. Check your connection or try again in a minute.',
      0,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(
      payload?.message || `Request failed with status ${response.status}`,
      response.status,
      payload?.details || null,
    );
  }

  return payload;
}

/**
 * Converts an error into a plain object that Redux can store
 * (class instances are not serializable).
 */
export function toSerializableError(error) {
  return {
    message: error?.message || 'Something went wrong',
    status: error?.status ?? null,
    details: error?.details ?? null,
  };
}
