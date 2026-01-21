import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  Search,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  MessageSquare,
  Zap
} from 'lucide-react';
import apiService from '../services/api';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await apiService.getLogs();
      setLogs(response.logs || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.phone?.includes(searchTerm)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, levelFilter, searchTerm]);

  const getLevelIcon = (level) => {
    switch(level) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'conversation':
        return <MessageSquare className="w-4 h-4" />;
      case 'escalation':
        return <AlertCircle className="w-4 h-4" />;
      case 'system':
        return <Zap className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-CR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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

  const getLevelCount = (level) => logs.filter(log => log.level === level).length;

  const infoCount = getLevelCount('info');
  const warningCount = getLevelCount('warning');
  const errorCount = getLevelCount('error');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Logs del Sistema</h1>
              <p className="text-gray-500 text-sm">Registro de actividad y eventos</p>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-gray-700 font-medium">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div
          onClick={() => setLevelFilter('all')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            levelFilter === 'all'
              ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg'
              : 'bg-white border border-gray-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${levelFilter === 'all' ? 'text-white/80' : 'text-gray-500'}`}>Total</p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </div>
            <div className={`p-3 rounded-lg ${levelFilter === 'all' ? 'bg-white/20' : 'bg-gray-100'}`}>
              <Activity className={`w-5 h-5 ${levelFilter === 'all' ? 'text-white' : 'text-gray-600'}`} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setLevelFilter('info')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            levelFilter === 'info'
              ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg'
              : 'bg-white border border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${levelFilter === 'info' ? 'text-white/80' : 'text-gray-500'}`}>Info</p>
              <p className="text-2xl font-bold">{infoCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${levelFilter === 'info' ? 'bg-white/20' : 'bg-blue-100'}`}>
              <Info className={`w-5 h-5 ${levelFilter === 'info' ? 'text-white' : 'text-blue-600'}`} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setLevelFilter('warning')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            levelFilter === 'warning'
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg'
              : 'bg-white border border-gray-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${levelFilter === 'warning' ? 'text-white/80' : 'text-gray-500'}`}>Advertencias</p>
              <p className="text-2xl font-bold">{warningCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${levelFilter === 'warning' ? 'bg-white/20' : 'bg-amber-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${levelFilter === 'warning' ? 'text-white' : 'text-amber-600'}`} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setLevelFilter('error')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            levelFilter === 'error'
              ? 'bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg'
              : 'bg-white border border-gray-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${levelFilter === 'error' ? 'text-white/80' : 'text-gray-500'}`}>Errores</p>
              <p className="text-2xl font-bold">{errorCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${levelFilter === 'error' ? 'bg-white/20' : 'bg-red-100'}`}>
              <AlertCircle className={`w-5 h-5 ${levelFilter === 'error' ? 'text-white' : 'text-red-600'}`} />
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
            placeholder="Buscar en logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-gray-500">Cargando logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay logs</h3>
          <p className="text-gray-500">
            {searchTerm || levelFilter !== 'all' ? 'No se encontraron resultados con los filtros actuales' : 'El sistema no ha generado logs aún'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log, index) => (
            <div
              key={log.id || index}
              className={`bg-white rounded-xl border overflow-hidden transition-all hover:shadow-sm ${
                log.level === 'error'
                  ? 'border-l-4 border-l-red-500'
                  : log.level === 'warning'
                  ? 'border-l-4 border-l-amber-500'
                  : 'border-l-4 border-l-blue-500'
              } border-t border-r border-b border-gray-200`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    log.level === 'error'
                      ? 'bg-red-100'
                      : log.level === 'warning'
                      ? 'bg-amber-100'
                      : 'bg-blue-100'
                  }`}>
                    {getLevelIcon(log.level)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-gray-900">{log.message}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.level === 'error'
                          ? 'bg-red-100 text-red-700'
                          : log.level === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {log.level === 'error' ? 'Error' : log.level === 'warning' ? 'Advertencia' : 'Info'}
                      </span>
                      {log.type && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {getTypeIcon(log.type)}
                          {log.type}
                        </span>
                      )}
                    </div>

                    {log.details && (
                      <p className="text-sm text-gray-600 mb-2">{log.details}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className="text-indigo-600 font-medium">
                        {getTimeSince(log.timestamp)}
                      </span>
                      {log.phone && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {log.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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

export default Logs;
