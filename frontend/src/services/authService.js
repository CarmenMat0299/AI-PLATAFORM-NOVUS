import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance for auth endpoints
const authApi = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor - add token to headers
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 errors
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');

      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const authService = {
  // Login
  login: (email, password) => {
    return authApi.post('/api/auth/login', { email, password });
  },

  // Logout
  logout: () => {
    return authApi.post('/api/auth/logout');
  },

  // Get current user info
  getMe: () => {
    return authApi.get('/api/auth/me');
  },

  // Forgot password
  forgotPassword: (email) => {
    return authApi.post('/api/auth/forgot-password', { email });
  },

  // Reset password
  resetPassword: (token, newPassword) => {
    return authApi.post('/api/auth/reset-password', {
      token,
      new_password: newPassword
    });
  },

  // Change password
  changePassword: (currentPassword, newPassword) => {
    return authApi.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
  }
};

export default authService;
