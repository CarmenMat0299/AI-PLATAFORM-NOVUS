import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

  resolveEscalation: async (phone) => {
    const response = await api.post('/api/escalations/resolve', { phone });
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
  }
};

export default apiService;
