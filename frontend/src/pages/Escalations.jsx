import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import apiService from '../services/api';

const Escalations = () => {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, resolved

  const fetchEscalations = async () => {
    try {
      setLoading(true);
      const data = await apiService.getEscalations();
      setEscalations(data.escalations || []);
    } catch (error) {
      console.error('Error fetching escalations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
    // Auto-refresh every minute
    const interval = setInterval(fetchEscalations, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (phone) => {
    try {
      await apiService.resolveEscalation(phone);
      fetchEscalations();
    } catch (error) {
      console.error('Error resolving escalation:', error);
    }
  };

  //  ARREGLADO: Agregado optional chaining (?.) y || false
  const filteredEscalations = escalations.filter(esc => {
    const matchesSearch = esc.user_phone?.includes(searchTerm) || 
                         esc.last_message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         false;
    const matchesFilter = filter === 'all' || 
                         (filter === 'pending' && !esc.resolved) ||
                         (filter === 'resolved' && esc.resolved);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <AlertCircle className="w-8 h-8 text-primary-600 mr-3" />
            Escalaciones
          </h1>
          <p className="text-gray-600 mt-1">
            Solicitudes de atención con agente humano
          </p>
        </div>
        <button
          onClick={fetchEscalations}
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
              placeholder="Buscar por teléfono o mensaje..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-primary-500 to-turquoise-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({escalations.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-gradient-to-r from-primary-500 to-turquoise-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendientes ({escalations.filter(e => !e.resolved).length})
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'resolved'
                  ? 'bg-gradient-to-r from-primary-500 to-turquoise-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Resueltas ({escalations.filter(e => e.resolved).length})
            </button>
          </div>
        </div>
      </div>

      {/* Escalations List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : filteredEscalations.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No hay escalaciones</p>
          <p className="text-gray-400 text-sm mt-2">
            {searchTerm ? 'Intenta con otra búsqueda' : 'Todas las solicitudes han sido atendidas'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEscalations.map((escalation, index) => (
            <div
              key={index}
              className={`card ${
                escalation.resolved
                  ? 'bg-gray-50 border-gray-200'
                  : 'border-l-4 border-l-primary-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      escalation.resolved
                        ? 'bg-green-100'
                        : 'bg-gradient-to-br from-primary-100 to-turquoise-100'
                    }`}>
                      {escalation.resolved ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-primary-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Solicitud de Agente Humano
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(escalation.timestamp).toLocaleString('es-CR')}
                      </p>
                    </div>
                    {escalation.resolved ? (
                      <span className="badge badge-success ml-auto">Resuelta</span>
                    ) : (
                      <span className="badge badge-warning ml-auto">Pendiente</span>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{escalation.user_phone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">
                        {new Date(escalation.timestamp).toLocaleDateString('es-CR')}
                      </span>
                    </div>
                  </div>

                  {/* Last Message */}
                  {escalation.last_message && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-500 mb-1">Último mensaje:</p>
                      <p className="text-sm text-gray-700">{escalation.last_message}</p>
                    </div>
                  )}

                  {/* Conversation History */}
                  {escalation.conversation_history && escalation.conversation_history.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-sm text-primary-600 cursor-pointer hover:text-primary-700">
                        Ver historial de conversación ({escalation.conversation_history.length} mensajes)
                      </summary>
                      <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                        {escalation.conversation_history.slice(-5).map((msg, idx) => (
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
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>

                {/* Actions */}
                {!escalation.resolved && (
                  <div className="ml-4">
                    <button
                      onClick={() => handleResolve(escalation.user_phone)}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Marcar Resuelta</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Escalations;