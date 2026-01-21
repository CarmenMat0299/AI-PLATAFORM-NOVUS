import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Phone,
  Clock,
  CheckCircle,
  RefreshCw,
  Search,
  MessageSquare,
  User,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import apiService from '../services/api';

const Escalations = () => {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedCard, setExpandedCard] = useState(null);

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

  const filteredEscalations = escalations.filter(esc => {
    const matchesSearch = esc.user_phone?.includes(searchTerm) ||
                         esc.last_message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         false;
    const matchesFilter = filter === 'all' ||
                         (filter === 'pending' && !esc.resolved) ||
                         (filter === 'resolved' && esc.resolved);
    return matchesSearch && matchesFilter;
  });

  const pendingCount = escalations.filter(e => !e.resolved).length;
  const resolvedCount = escalations.filter(e => e.resolved).length;

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-CR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSince = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `hace ${diffDays}d`;
    if (diffHours > 0) return `hace ${diffHours}h`;
    if (diffMins > 0) return `hace ${diffMins}m`;
    return 'ahora';
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-turquoise-500 rounded-xl shadow-lg">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Escalaciones</h1>
              <p className="text-gray-500 text-sm">Solicitudes de atención con agente humano</p>
            </div>
          </div>
          <button
            onClick={fetchEscalations}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-gray-700 font-medium">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => setFilter('all')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            filter === 'all'
              ? 'bg-gradient-to-br from-primary-500 to-turquoise-500 text-white shadow-lg'
              : 'bg-white border border-gray-200 hover:border-primary-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${filter === 'all' ? 'text-white/80' : 'text-gray-500'}`}>Total</p>
              <p className="text-2xl font-bold">{escalations.length}</p>
            </div>
            <div className={`p-3 rounded-lg ${filter === 'all' ? 'bg-white/20' : 'bg-gray-100'}`}>
              <Filter className={`w-5 h-5 ${filter === 'all' ? 'text-white' : 'text-gray-600'}`} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilter('pending')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            filter === 'pending'
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg'
              : 'bg-white border border-gray-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${filter === 'pending' ? 'text-white/80' : 'text-gray-500'}`}>Pendientes</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${filter === 'pending' ? 'bg-white/20' : 'bg-amber-100'}`}>
              <Clock className={`w-5 h-5 ${filter === 'pending' ? 'text-white' : 'text-amber-600'}`} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilter('resolved')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            filter === 'resolved'
              ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg'
              : 'bg-white border border-gray-200 hover:border-green-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${filter === 'resolved' ? 'text-white/80' : 'text-gray-500'}`}>Resueltas</p>
              <p className="text-2xl font-bold">{resolvedCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${filter === 'resolved' ? 'bg-white/20' : 'bg-green-100'}`}>
              <CheckCircle className={`w-5 h-5 ${filter === 'resolved' ? 'text-white' : 'text-green-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por teléfono o mensaje..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Escalations List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="w-10 h-10 text-primary-500 animate-spin mb-4" />
          <p className="text-gray-500">Cargando escalaciones...</p>
        </div>
      ) : filteredEscalations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay escalaciones</h3>
          <p className="text-gray-500">
            {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'Todas las solicitudes han sido atendidas'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEscalations.map((escalation, index) => (
            <div
              key={index}
              className={`bg-white rounded-xl border overflow-hidden transition-all ${
                escalation.resolved
                  ? 'border-gray-200 opacity-75'
                  : 'border-l-4 border-l-primary-500 border-t border-r border-b border-gray-200 shadow-sm'
              }`}
            >
              {/* Main Content */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Left Side */}
                  <div className="flex items-start space-x-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      escalation.resolved
                        ? 'bg-green-100'
                        : 'bg-gradient-to-br from-primary-100 to-turquoise-100'
                    }`}>
                      {escalation.resolved ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <User className="w-6 h-6 text-primary-600" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {escalation.user_phone}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          escalation.resolved
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {escalation.resolved ? 'Resuelta' : 'Pendiente'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(escalation.timestamp)}
                        </span>
                        <span className="text-primary-600 font-medium">
                          {getTimeSince(escalation.timestamp)}
                        </span>
                      </div>

                      {/* Last Message Preview */}
                      {escalation.last_message && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            "{escalation.last_message}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side - Actions */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    {!escalation.resolved && (
                      <button
                        onClick={() => handleResolve(escalation.user_phone)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Resolver</span>
                      </button>
                    )}

                    {escalation.conversation_history && escalation.conversation_history.length > 0 && (
                      <button
                        onClick={() => setExpandedCard(expandedCard === index ? null : index)}
                        className="flex items-center space-x-1 text-sm text-gray-500 hover:text-primary-600 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{escalation.conversation_history.length} mensajes</span>
                        {expandedCard === index ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Conversation History */}
              {expandedCard === index && escalation.conversation_history && (
                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Historial de conversación</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {escalation.conversation_history.slice(-10).map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                            msg.role === 'user'
                              ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                              : 'bg-gradient-to-r from-primary-500 to-turquoise-500 text-white rounded-br-md'
                          }`}
                        >
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {msg.role === 'user' ? 'Usuario' : 'JULIA'}
                          </p>
                          <p>{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 py-4 mt-8 border-t border-gray-100">
        <p>© 2026 Novus Soluciones S.A. Todos los derechos reservados.</p>
      </div>
    </div>
  );
};

export default Escalations;
