import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  AlertCircle, 
  TrendingUp, 
  Users,
  RefreshCw
} from 'lucide-react';
import StatCard from '../components/StatCard';
import apiService from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    active_conversations: 0,
    total_escalations: 0,
    status: 'loading'
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStats();
      setStats(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Bienvenida al panel de administración de JulIA
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="btn-primary flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Conversaciones Activas"
          value={stats.active_conversations}
          icon={MessageSquare}
          color="blue"
          trend="En tiempo real"
        />
        <StatCard
          title="Escalaciones Pendientes"
          value={stats.total_escalations}
          icon={AlertCircle}
          color="turquoise"
          trend="Requieren atención"
        />
        <StatCard
          title="Mensajes Hoy"
          value="--"
          icon={TrendingUp}
          color="ocean"
          trend="Últimas 24 horas"
        />
        <StatCard
          title="Usuarios Únicos"
          value="--"
          icon={Users}
          color="purple"
          trend="Este mes"
        />
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* System Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-3 animate-pulse"></div>
            Estado del Sistema
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Backend API</span>
              <span className="badge badge-success">Activo</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">WhatsApp Service</span>
              <span className="badge badge-success">Conectado</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Teams Service</span>
              <span className="badge badge-success">Conectado</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Azure OpenAI</span>
              <span className="badge badge-success">Disponible</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actividad Reciente
          </h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-primary-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5"></div>
        
            </div>
            <div className="flex items-start space-x-3 p-3 bg-turquoise-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-turquoise-500 mt-1.5"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-medium">Herramienta ejecutada</p>
                <p className="text-xs text-gray-600 mt-0.5">get_novus_info - Hace 5 minutos</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-medium">Escalación recibida</p>
                <p className="text-xs text-gray-600 mt-0.5">Cliente solicitó agente - Hace 15 minutos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all">
            <AlertCircle className="w-6 h-6 text-primary-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Ver Escalaciones</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-turquoise-400 hover:bg-turquoise-50 transition-all">
            <MessageSquare className="w-6 h-6 text-turquoise-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Ver Conversaciones</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-ocean-400 hover:bg-ocean-50 transition-all">
            <TrendingUp className="w-6 h-6 text-ocean-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Ver Estadísticas</p>
          </button>
        </div>
      </div>

      {/* Last Update */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Última actualización: {lastUpdate.toLocaleTimeString('es-CR')}
      </div>
    </div>
  );
};

export default Dashboard;
