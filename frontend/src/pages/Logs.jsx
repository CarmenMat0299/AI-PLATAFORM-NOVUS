import React, { useState } from 'react';
import { Activity, Zap, AlertTriangle, CheckCircle, Info, Search } from 'lucide-react';

const Logs = () => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock logs - en producción estos vendrían del backend
  const mockLogs = [
    {
      id: 1,
      type: 'success',
      title: 'Herramienta ejecutada',
      message: 'get_novus_info ejecutada exitosamente',
      details: 'query_type: servicios, páginas encontradas: 5',
      timestamp: new Date(),
    },
    {
      id: 2,
      type: 'info',
      title: 'Nueva conversación',
      message: 'Cliente inició conversación desde WhatsApp',
      details: 'Teléfono: +506 8888 7777',
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: 3,
      type: 'warning',
      title: 'Escalación detectada',
      message: 'Cliente solicitó hablar con agente humano',
      details: 'Razón: Consulta técnica compleja',
      timestamp: new Date(Date.now() - 600000),
    },
    {
      id: 4,
      type: 'activity',
      title: 'Respuesta generada',
      message: 'GPT-4 generó respuesta (1200 caracteres)',
      details: 'Tokens usados: 850, tiempo: 2.3s',
      timestamp: new Date(Date.now() - 900000),
    },
    {
      id: 5,
      type: 'success',
      title: 'Imagen procesada',
      message: 'Azure Vision analizó imagen exitosamente',
      details: 'Tipo: documento, texto extraído: 450 caracteres',
      timestamp: new Date(Date.now() - 1200000),
    },
  ];

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'activity':
        return <Zap className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'activity':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const filteredLogs = mockLogs.filter(log => {
    const matchesFilter = filter === 'all' || log.type === filter;
    const matchesSearch = log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Activity className="w-8 h-8 text-ocean-600 mr-3" />
          Logs del Sistema
        </h1>
        <p className="text-gray-600 mt-1">
          Actividad y eventos del sistema en tiempo real
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Exitosos</p>
              <p className="text-2xl font-bold text-green-900">
                {mockLogs.filter(l => l.type === 'success').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Actividades</p>
              <p className="text-2xl font-bold text-blue-900">
                {mockLogs.filter(l => l.type === 'activity').length}
              </p>
            </div>
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">Advertencias</p>
              <p className="text-2xl font-bold text-yellow-900">
                {mockLogs.filter(l => l.type === 'warning').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 font-medium">Total</p>
              <p className="text-2xl font-bold text-gray-900">{mockLogs.length}</p>
            </div>
            <Info className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar en logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
            />
          </div>

          {/* Type filters */}
          <div className="flex space-x-2">
            {['all', 'success', 'activity', 'warning', 'info'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                  filter === type
                    ? 'bg-gradient-to-r from-ocean-500 to-turquoise-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? 'Todos' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className={`card border ${getBackgroundColor(log.type)}`}
          >
            <div className="flex items-start space-x-4">
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {getIcon(log.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{log.title}</h3>
                    <p className="text-sm text-gray-600 mt-0.5">{log.message}</p>
                    {log.details && (
                      <p className="text-xs text-gray-500 mt-1 font-mono bg-white/50 rounded px-2 py-1 inline-block">
                        {log.details}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                    {log.timestamp.toLocaleTimeString('es-CR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 && (
        <div className="card text-center py-12">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No hay logs</p>
          <p className="text-gray-400 text-sm mt-2">
            {searchTerm ? 'Intenta con otra búsqueda' : 'Los logs aparecerán aquí cuando haya actividad'}
          </p>
        </div>
      )}

      {/* Info Card */}
      <div className="card mt-6 bg-gradient-to-r from-ocean-50 to-turquoise-50 border-ocean-200">
        <div className="flex items-start space-x-3">
          <Activity className="w-5 h-5 text-ocean-600 mt-1" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Próximamente</h4>
            <p className="text-sm text-gray-600">
              Logs en tiempo real conectados directamente con el backend de JulIA.
              Incluirá exportación de logs, filtros avanzados por fecha y nivel de severidad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;
