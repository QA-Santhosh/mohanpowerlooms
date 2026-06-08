import { mockAuthService, isMockAuth } from './firebase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  
  // Get token
  let token: string | null = null;
  if (isMockAuth) {
    token = mockAuthService.getToken();
  } else {
    // If using real Firebase, we can fetch from current user token (or session storage)
    token = typeof window !== 'undefined' ? localStorage.getItem('mpl_token') : null;
  }

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred while processing your request.';
    try {
      const errData = await response.json();
      errorMessage = errData.message || errorMessage;
    } catch (e) {
      // Fallback if not JSON
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'GET' }),
    
  post: <T>(path: string, body: any, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
    
  put: <T>(path: string, body: any, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    
  delete: <T>(path: string, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'DELETE' }),
};
