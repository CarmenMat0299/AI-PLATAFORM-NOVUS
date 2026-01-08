import axios from 'axios';

const API_BASE_URL = 'https://app-chatbot-novus.proudsea-b52fc0ea.eastus2.azurecontainerapps.io';

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

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

export default apiService;
