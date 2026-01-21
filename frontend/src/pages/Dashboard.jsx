import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  AlertCircle,
  TrendingUp,
  Users,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import apiService from '../services/api';

// Official brand icons
const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TeamsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.625 8.073h-5.27V5.022a2.248 2.248 0 012.249-2.248h.772A2.248 2.248 0 0120.625 5.022v3.051zM16.5 9.146h5.25a1.125 1.125 0 011.125 1.125v5.104a3.375 3.375 0 01-3.375 3.375h-1.125a.375.375 0 01-.375-.375V10.271a1.125 1.125 0 01-1.5-1.125zM14.625 7.271H3.375A1.875 1.875 0 001.5 9.146v7.479a1.875 1.875 0 001.875 1.875h11.25a1.875 1.875 0 001.875-1.875V9.146a1.875 1.875 0 00-1.875-1.875zM9 15.75a2.625 2.625 0 110-5.25 2.625 2.625 0 010 5.25zm8.625-10.5a2.625 2.625 0 100-5.25 2.625 2.625 0 000 5.25z"/>
  </svg>
);

const AzureIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.483 21.3H24L14.025 4.013l-3.038 8.347 5.836 6.938L5.483 21.3zM13.23 2.7L6.105 8.677 0 19.253h5.505v.014L13.23 2.7z"/>
  </svg>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    active_conversations: 0,
    total_escalations: 0,
    messages_today: 0,
    unique_users: 0,
    status: 'loading'
  });

  const [systemStatus, setSystemStatus] = useState({
    backend_api: { status: 'checking', message: 'Verificando...' },
    whatsapp: { status: 'checking', message: 'Verificando...' },
    teams: { status: 'checking', message: 'Verificando...' },
    azure_openai: { status: 'checking', message: 'Verificando...' }
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Colores oficiales de marca
  const WHATSAPP_COLOR = '#25D366';
  const TEAMS_COLOR = '#5558AF';
  const AZURE_COLOR = '#0078D4';

  const [hourlyData] = useState([
    { hour: '8am', mensajes: 12, conversaciones: 5 },
    { hour: '9am', mensajes: 28, conversaciones: 12 },
    { hour: '10am', mensajes: 45, conversaciones: 18 },
    { hour: '11am', mensajes: 38, conversaciones: 15 },
    { hour: '12pm', mensajes: 22, conversaciones: 8 },
    { hour: '1pm', mensajes: 18, conversaciones: 7 },
    { hour: '2pm', mensajes: 35, conversaciones: 14 },
    { hour: '3pm', mensajes: 42, conversaciones: 16 },
    { hour: '4pm', mensajes: 30, conversaciones: 11 },
    { hour: '5pm', mensajes: 15, conversaciones: 6 },
  ]);

  const [channelData] = useState([
    { name: 'WhatsApp', value: 65, color: '#25D366' },
    { name: 'Teams', value: 35, color: '#5558AF' },
  ]);

  const [weeklyData] = useState([
    { day: 'Lun', whatsapp: 45, teams: 23 },
    { day: 'Mar', whatsapp: 52, teams: 28 },
    { day: 'Mié', whatsapp: 38, teams: 31 },
    { day: 'Jue', whatsapp: 61, teams: 25 },
    { day: 'Vie', whatsapp: 48, teams: 29 },
    { day: 'Sáb', whatsapp: 22, teams: 8 },
    { day: 'Dom', whatsapp: 15, teams: 5 },
  ]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await apiService.getSystemStatus();
      if (response && response.services) {
        setSystemStatus(response.services);
      } else if (response) {
        setSystemStatus(response);
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await apiService.getRecentActivity();
      if (response && response.activities) {
        setRecentActivity(response.activities);
      } else if (Array.isArray(response)) {
        setRecentActivity(response);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSystemStatus();
    fetchRecentActivity();
    const interval = setInterval(() => {
      fetchStats();
      fetchSystemStatus();
      fetchRecentActivity();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);
    if (diff < 60) return 'Hace unos segundos';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return time.toLocaleDateString('es-CR');
  };

  const statCards = [
    {
      title: 'Conversaciones Activas',
      value: stats.active_conversations || 0,
      icon: MessageSquare,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Escalaciones Pendientes',
      value: stats.total_escalations || 0,
      icon: AlertCircle,
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Mensajes Hoy',
      value: stats.messages_today || 0,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Usuarios Únicos',
      value: stats.unique_users || 0,
      icon: Users,
      gradient: 'from-violet-500 to-purple-500',
    }
  ];

  const services = [
    {
      key: 'backend_api',
      label: 'Backend API',
      icon: Zap,
      color: '#6366f1',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp Business',
      icon: WhatsAppIcon,
      color: WHATSAPP_COLOR,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      key: 'teams',
      label: 'Microsoft Teams',
      icon: TeamsIcon,
      color: TEAMS_COLOR,
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      key: 'azure_openai',
      label: 'Azure OpenAI',
      icon: AzureIcon,
      color: AZURE_COLOR,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    }
  ];

  const getStatusBadge = (status) => {
    if (['active', 'connected', 'available', 'ok'].includes(status)) {
      return (
        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-3.5 h-3.5" />
          Conectado
        </span>
      );
    }
    if (status === 'checking') {
      return (
        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Verificando
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700">
        <XCircle className="w-3.5 h-3.5" />
        Error
      </span>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Bienvenido al panel de administración de JULIA</p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchSystemStatus(); fetchRecentActivity(); }}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-gray-700 font-medium">Actualizar</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient}`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-900">{card.value}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad del Día</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorMensajes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="mensajes"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMensajes)"
                  name="Mensajes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Canal</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {channelData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar Chart & System Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversaciones por Semana</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="whatsapp" fill={WHATSAPP_COLOR} radius={[4, 4, 0, 0]} name="WhatsApp" />
                <Bar dataKey="teams" fill={TEAMS_COLOR} radius={[4, 4, 0, 0]} name="Teams" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <WhatsAppIcon className="w-4 h-4" style={{ color: WHATSAPP_COLOR }} />
              <span className="text-sm text-gray-600">WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <TeamsIcon className="w-4 h-4" style={{ color: TEAMS_COLOR }} />
              <span className="text-sm text-gray-600">Teams</span>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900">Estado del Sistema</h3>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">En línea</span>
            </div>
          </div>
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.key}
                className={`flex items-center justify-between p-4 rounded-xl border ${service.bgColor} ${service.borderColor}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${service.color}15` }}
                  >
                    <service.icon className="w-5 h-5" style={{ color: service.color }} />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{service.label}</span>
                </div>
                {getStatusBadge(systemStatus[service.key]?.status)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No hay actividad reciente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'conversation' ? 'bg-blue-500' :
                  activity.type === 'escalation' ? 'bg-amber-500' : 'bg-green-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.details}</p>
                </div>
                <span className="text-xs text-gray-400">{formatTimeAgo(activity.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 py-4 border-t border-gray-100">
        <p>© 2026 Novus Soluciones S.A. Todos los derechos reservados.</p>
      </div>
    </div>
  );
};

export default Dashboard;
