import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, Phone, Calendar, RefreshCw } from 'lucide-react';
import apiService from '../services/api';

const Conversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await apiService.getConversations();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtrar conversaciones
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChannel = selectedChannel === 'all' || conv.channel === selectedChannel;
    return matchesSearch && matchesChannel;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <MessageSquare className="w-8 h-8 text-turquoise-600 mr-3" />
            Conversaciones
          </h1>
          <p className="text-gray-600 mt-1">
            Historial de conversaciones del día con clientes y colaboradores
          </p>
        </div>
        <button
          onClick={fetchConversations}
          disabled={loading}
          className="btn-primary flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>

          {/* Channel filters */}
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedChannel('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedChannel === 'all'
                  ? 'bg-gradient-to-r from-turquoise-500 to-ocean-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({conversations.length})
            </button>
            <button
              onClick={() => setSelectedChannel('whatsapp')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedChannel === 'whatsapp'
                  ? 'bg-gradient-to-r from-turquoise-500 to-ocean-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              WhatsApp ({conversations.filter(c => c.channel === 'whatsapp').length})
            </button>
            <button
              onClick={() => setSelectedChannel('teams')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedChannel === 'teams'
                  ? 'bg-gradient-to-r from-turquoise-500 to-ocean-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Teams ({conversations.filter(c => c.channel === 'teams').length})
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && conversations.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-turquoise-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Conversations List */}
          {filteredConversations.length > 0 ? (
            <div className="space-y-4">
              {filteredConversations.map((conversation, index) => (
                <div key={index} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Avatar */}
                      <div className={`p-3 rounded-xl ${
                        conversation.channel === 'whatsapp'
                          ? 'bg-gradient-to-br from-green-100 to-green-200'
                          : 'bg-gradient-to-br from-purple-100 to-purple-200'
                      }`}>
                        {conversation.channel === 'whatsapp' ? (
                          <Phone className="w-6 h-6 text-green-600" />
                        ) : (
                          <MessageSquare className="w-6 h-6 text-purple-600" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-semibold text-gray-900">{conversation.phone}</h3>
                          <span className={`badge ${
                            conversation.channel === 'whatsapp' ? 'badge-success' : 'badge-info'
                          }`}>
                            {conversation.channel === 'whatsapp' ? 'WhatsApp' : 'Teams'}
                          </span>
                          <span className="badge badge-warning">
                            {conversation.message_count || 0} mensajes
                          </span>
                        </div>
                        
                        {/* Último mensaje */}
                        {conversation.messages && conversation.messages.length > 0 && (
                          <p className="text-sm text-gray-600 mb-2">
                            {conversation.messages[conversation.messages.length - 1].content.substring(0, 100)}
                            {conversation.messages[conversation.messages.length - 1].content.length > 100 ? '...' : ''}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            Inicio: {new Date(conversation.started_at).toLocaleString('es-CR')}
                          </span>
                          <span>
                            Última actividad: {new Date(conversation.last_message_at).toLocaleTimeString('es-CR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ver detalles */}
                    <details className="ml-4">
                      <summary className="btn-secondary text-sm cursor-pointer">
                        Ver Mensajes
                      </summary>
                      <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
                        {conversation.messages?.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg text-sm ${
                              msg.role === 'user'
                                ? 'bg-blue-50 text-blue-900'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <span className="font-medium">
                              {msg.role === 'user' ? 'Usuario' : 'JulIA'}:
                            </span>{' '}
                            {msg.content}
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString('es-CR')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="card text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No hay conversaciones</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm 
                  ? 'No se encontraron conversaciones con ese criterio de búsqueda'
                  : 'Las conversaciones del día aparecerán aquí cuando los usuarios interactúen con JulIA'
                }
              </p>
            </div>
          )}
        </>
      )}

      {/* Info Card */}
      <div className="card mt-6 bg-gradient-to-r from-turquoise-50 to-ocean-50 border-turquoise-200">
        <div className="flex items-start space-x-3">
          <MessageSquare className="w-5 h-5 text-turquoise-600 mt-1" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Conversaciones del Día</h4>
            <p className="text-sm text-gray-600">
              Se muestran todas las conversaciones del día actual. Las conversaciones se archivan automáticamente al día siguiente.
              Total de hoy: <strong>{conversations.length}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conversations;
