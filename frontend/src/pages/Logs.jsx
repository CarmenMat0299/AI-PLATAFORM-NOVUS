import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Zap,
  ChevronRight,
  LogOut,
  User as UserIcon,
  UserCircle
} from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import NotificationPanel from '../components/NotificationPanel';

const Logs = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);

  const fetchLogs = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await apiService.getLogs();
      setLogs(response.logs || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial load with loading state
    fetchLogs(true);

    // Auto-refresh every 30 seconds without loading state
    const interval = setInterval(() => fetchLogs(false), 30000);
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logs del Sistema</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Registro de actividad y eventos</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Notifications */}
            <NotificationPanel />

            {/* User Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-turquoise-500 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.full_name || 'Usuario'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
                      <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-md bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                        {user?.role === 'admin' ? 'Administrador' : 'Colaborador'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/profile');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <UserCircle className="w-4 h-4" />
                      Mi Perfil
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchLogs(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Actualizar logs"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div
          onClick={() => setLevelFilter('all')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            levelFilter === 'all'
              ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${levelFilter === 'all' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Total</p>
              <p className={`text-2xl font-bold ${levelFilter === 'all' ? '' : 'dark:text-white'}`}>{logs.length}</p>
            </div>
            <div className={`p-3 rounded-lg ${levelFilter === 'all' ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <Activity className={`w-5 h-5 ${levelFilter === 'all' ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setLevelFilter('info')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            levelFilter === 'info'
              ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${levelFilter === 'info' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Info</p>
              <p className={`text-2xl font-bold ${levelFilter === 'info' ? '' : 'dark:text-white'}`}>{infoCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${levelFilter === 'info' ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              <Info className={`w-5 h-5 ${levelFilter === 'info' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setLevelFilter('warning')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            levelFilter === 'warning'
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${levelFilter === 'warning' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Advertencias</p>
              <p className={`text-2xl font-bold ${levelFilter === 'warning' ? '' : 'dark:text-white'}`}>{warningCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${levelFilter === 'warning' ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              <AlertTriangle className={`w-5 h-5 ${levelFilter === 'warning' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setLevelFilter('error')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            levelFilter === 'error'
              ? 'bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${levelFilter === 'error' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Errores</p>
              <p className={`text-2xl font-bold ${levelFilter === 'error' ? '' : 'dark:text-white'}`}>{errorCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${levelFilter === 'error' ? 'bg-white/20' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <AlertCircle className={`w-5 h-5 ${levelFilter === 'error' ? 'text-white' : 'text-red-600 dark:text-red-400'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar en logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-600 dark:text-white dark:placeholder-gray-400 transition-all"
          />
        </div>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Cargando logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No hay logs</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || levelFilter !== 'all' ? 'No se encontraron resultados con los filtros actuales' : 'El sistema no ha generado logs aún'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log, index) => {
            const isClickable = log.type === 'conversation' || log.type === 'escalation';
            const handleClick = () => {
              if (log.type === 'escalation') {
                navigate('/escalations');
              } else if (log.type === 'conversation' && log.phone) {
                navigate(`/chat/${log.phone}`);
              } else if (log.type === 'conversation') {
                navigate('/conversations');
              }
            };

            return (
              <div
                key={log.id || index}
                onClick={isClickable ? handleClick : undefined}
                className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-all ${
                  isClickable ? 'hover:shadow-md cursor-pointer' : 'hover:shadow-sm'
                } ${
                  log.level === 'error'
                    ? 'border-l-4 border-l-red-500'
                    : log.level === 'warning'
                    ? 'border-l-4 border-l-amber-500'
                    : 'border-l-4 border-l-blue-500'
                } border-t border-r border-b border-gray-200 dark:border-gray-700`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      log.level === 'error'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : log.level === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {getLevelIcon(log.level)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{log.message}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.level === 'error'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : log.level === 'warning'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          {log.level === 'error' ? 'Error' : log.level === 'warning' ? 'Advertencia' : 'Info'}
                        </span>
                        {log.type && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {getTypeIcon(log.type)}
                            {log.type}
                          </span>
                        )}
                      </div>

                      {log.details && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{log.details}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
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

                    {/* Arrow for clickable items */}
                    {isClickable && (
                      <div className="flex-shrink-0 self-center">
                        <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4 mt-8 border-t border-gray-100 dark:border-gray-700">
        <p>© 2026 Novus Soluciones S.A. Todos los derechos reservados.</p>
      </div>
    </div>
  );
};

export default Logs;
