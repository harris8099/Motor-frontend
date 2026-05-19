const TOKEN_STORAGE_KEY = 'auth_token';
const USER_STORAGE_KEY = 'auth_user';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export function isAuthenticated() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  return !!token;
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getCurrentUserRole() {
  return getStoredUser()?.role || null;
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
      if (data.user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      }
      return data.user || true;
    }
    return false;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

export function logout() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
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
    if (!response.ok) return false;
    const data = await response.json();
    if (data?.username) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
        username: data.username,
        role: data.role,
        is_active: data.is_active,
      }));
    }
    return true;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}

// Legacy exports for backward compatibility (will be removed)
export const TEMP_LOGIN_USERNAME = 'admin';
export const TEMP_LOGIN_PASSWORD = '***hidden***';
