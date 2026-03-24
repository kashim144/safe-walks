import { handleApiError } from './error-handler';

/**
 * Centralized API utility for fetch calls.
 */
const api = {
  get: async (url, context) => {
    const response = await fetch(url);
    return handleApiError(response, context);
  },
  post: async (url, body, context) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleApiError(response, context);
  },
  put: async (url, body, context) => {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleApiError(response, context);
  },
  delete: async (url, context) => {
    const response = await fetch(url, {
      method: 'DELETE',
    });
    return handleApiError(response, context);
  },
};

export default api;
