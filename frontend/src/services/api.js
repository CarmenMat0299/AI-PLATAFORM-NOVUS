import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a todas las peticiones
api.interceptors.request.use(
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

export const apiService = {
  // Stats
  getStats: async () => {
    const response = await api.get('/api/stats');
    return response.data;
  },

  // System Status
  getSystemStatus: async () => {
    const response = await api.get('/api/system-status');
    return response.data;
  },

  // Recent Activity
  getRecentActivity: async () => {
    const response = await api.get('/api/recent-activity');
    return response.data;
  },

  // Escalations
  getEscalations: async () => {
    const response = await api.get('/api/escalations');
    return response.data;
  },

  resolveEscalation: async (phone, resolvedBy = null) => {
    const response = await api.post('/api/escalations/resolve', { phone, resolved_by: resolvedBy });
    return response.data;
  },

  updateEscalationPriority: async (phone, priority) => {
    const response = await api.post('/api/escalations/priority', { phone, priority });
    return response.data;
  },

  updateEscalationNote: async (phone, note) => {
    const response = await api.post('/api/escalations/note', { phone, note });
    return response.data;
  },

  assignEscalation: async (phone, agent) => {
    // Enviar explícitamente null cuando no hay agente (para desasignar)
    const response = await api.post('/api/escalations/assign', {
      phone,
      agent: agent === null || agent === undefined ? null : agent
    });
    return response.data;
  },

  updateEscalationStatus: async (phone, status) => {
    const response = await api.post('/api/escalations/status', { phone, status });
    return response.data;
  },

  // Conversations
  getConversations: async () => {
    const response = await api.get('/api/conversations');
    return response.data;
  },

  // Test endpoint
  testChat: async (message) => {
    const response = await api.post('/api/test', {
      message,
      conversation_id: 'dashboard-test'
    });
    return response.data;
  },

  // Logs
  getLogs: async () => {
    const response = await api.get('/api/logs');
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Metrics
  getMetrics: async () => {
    const response = await api.get('/api/metrics');
    return response.data;
  },

  // SMTP Configuration
  getSmtpConfig: async () => {
    const response = await api.get('/api/smtp-config');
    return response.data;
  },

  saveSmtpConfig: async (config) => {
    const response = await api.post('/api/smtp-config', config);
    return response.data;
  },

  testSmtpConfig: async (testEmail) => {
    const response = await api.post('/api/smtp-config/test', { test_email: testEmail });
    return response.data;
  },

  // Users/Collaborators Management
  getUsers: async () => {
    const response = await api.get('/api/users');
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/api/users', userData);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await api.put(`/api/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/api/users/${userId}`);
    return response.data;
  },

  resetUserPassword: async (userId, newPassword) => {
    const response = await api.post(`/api/users/${userId}/reset-password`, { new_password: newPassword });
    return response.data;
  },

  // Profile Management
  changePassword: async (passwordData) => {
    const response = await api.post('/api/auth/change-password', passwordData);
    return response.data;
  },

  // Departments
  getDepartments: async () => {
    const response = await api.get('/api/departments');
    return response.data;
  },

  createDepartment: async (deptData) => {
    const response = await api.post('/api/departments', deptData);
    return response.data;
  },

  updateDepartment: async (deptId, deptData) => {
    const response = await api.put(`/api/departments/${deptId}`, deptData);
    return response.data;
  },

  deleteDepartment: async (deptId) => {
    const response = await api.delete(`/api/departments/${deptId}`);
    return response.data;
  },

  // Notifications
  getNotifications: async (unreadOnly = false) => {
    const response = await api.get('/api/notifications', { params: { unread_only: unreadOnly } });
    return response.data;
  },

  markNotificationRead: async (notificationId) => {
    const response = await api.post(`/api/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    const response = await api.post('/api/notifications/read-all');
    return response.data;
  }
};

export default apiService;
