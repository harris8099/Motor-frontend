const TOKEN_STORAGE_KEY = 'auth_token';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export function isAuthenticated() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  return !!token;
}

export async function login(username, password) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

export function logout() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function verifyToken() {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}

// Legacy exports for backward compatibility (will be removed)
export const TEMP_LOGIN_USERNAME = 'admin';
export const TEMP_LOGIN_PASSWORD = '***hidden***';
