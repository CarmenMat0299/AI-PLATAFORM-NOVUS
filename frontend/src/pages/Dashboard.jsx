import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  AlertCircle,
  TrendingUp,
  Users,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  ChevronRight,
  LogOut,
  User,
  UserCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
import NotificationPanel from '../components/NotificationPanel';

// Brand icons using images from public folder
const WhatsAppIcon = ({ className }) => (
  <img src="/whatsapp.png" alt="WhatsApp" className={className} />
);

const TeamsIcon = ({ className }) => (
  <img src="/Microsoft_Office_Teams_(2025–present).svg.png" alt="Teams" className={className} />
);

const AzureIcon = ({ className }) => (
  <img src="/microsoft_azure-logo_brandlogos.net_mlyt6-512x512.png" alt="Azure" className={className} />
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Colores oficiales de marca
  const WHATSAPP_COLOR = '#25D366';
  const TEAMS_COLOR = '#5558AF';
  const AZURE_COLOR = '#0078D4';

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
  const [isRefreshing, setIsRefreshing] = useState(false);


  const [hourlyData, setHourlyData] = useState([]);
  const [channelData, setChannelData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);

  const fetchStats = async () => {
    try {
      const data = await apiService.getStats();
      // Only update if we have valid data
      if (data && typeof data === 'object') {
        setStats(prevStats => ({
          ...prevStats,
          ...data
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Keep previous data on error
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await apiService.getSystemStatus();
      if (response && response.services) {
        setSystemStatus(prevStatus => ({
          ...prevStatus,
          ...response.services
        }));
      } else if (response && typeof response === 'object') {
        setSystemStatus(prevStatus => ({
          ...prevStatus,
          ...response
        }));
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
      // Keep previous data on error
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await apiService.getRecentActivity();
      if (response && response.activities && Array.isArray(response.activities)) {
        setRecentActivity(response.activities);
      } else if (Array.isArray(response)) {
        setRecentActivity(response);
      }
      // Keep previous data if response is invalid
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Keep previous data on error
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await apiService.getMetrics();
      if (response) {
        // Update charts - only update if we have new data
        if (response.hourlyData) {
          setHourlyData(response.hourlyData);
        }
        if (response.channelData) {
          setChannelData(response.channelData);
        }
        if (response.weeklyData && Array.isArray(response.weeklyData)) {
          setWeeklyData(response.weeklyData);
        }
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      // Don't clear data on error - keep showing previous data
    }
  };

  useEffect(() => {
    // Initial load
    const initialLoad = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchSystemStatus(),
        fetchRecentActivity(),
        fetchMetrics()
      ]);
      setLoading(false);
    };

    initialLoad();

    // Auto-refresh every 30 seconds (without showing loading state)
    const interval = setInterval(() => {
      fetchStats();
      fetchSystemStatus();
      fetchRecentActivity();
      fetchMetrics();
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

  const isAdmin = user?.role === 'admin';

  const statCards = [
    {
      title: 'Conversaciones Activas',
      value: stats.active_conversations || 0,
      icon: MessageSquare,
      gradient: 'from-blue-500 to-cyan-500',
      link: isAdmin ? '/conversations' : null // Solo admins pueden navegar
    },
    {
      title: 'Escalaciones Pendientes',
      value: stats.total_escalations || 0,
      icon: AlertCircle,
      gradient: 'from-amber-500 to-orange-500',
      link: '/escalations'
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
      key: 'whatsapp',
      label: 'WhatsApp Business',
      icon: WhatsAppIcon,
      isImage: true,
      color: WHATSAPP_COLOR,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      key: 'teams',
      label: 'Microsoft Teams',
      icon: TeamsIcon,
      isImage: true,
      color: TEAMS_COLOR,
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Bienvenido al panel de administración de JULIA</p>
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
                  <User className="w-5 h-5 text-white" />
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
            onClick={async () => {
              setIsRefreshing(true);
              await Promise.all([
                fetchStats(),
                fetchSystemStatus(),
                fetchRecentActivity(),
                fetchMetrics()
              ]);
              setIsRefreshing(false);
            }}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Actualizar dashboard"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, index) => (
          <div
            key={index}
            onClick={card.link ? () => navigate(card.link) : undefined}
            className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${card.link ? 'cursor-pointer' : ''} animate-fade-in stagger-item`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</span>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.title}</h3>
              {card.link && <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
            </div>
          </div>
        ))}
      </div>


      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow duration-300 animate-fade-in">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actividad del Día</h3>
          <div className="h-64">
            {hourlyData.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin datos de actividad hoy</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribución por Canal</h3>
          <div className="h-48">
            {channelData.length > 0 && channelData.some(d => d.value > 0) ? (
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
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin conversaciones hoy</p>
                </div>
              </div>
            )}
          </div>
          {channelData.length > 0 && (
            <div className="flex justify-center gap-6 mt-2">
              {channelData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.name} ({item.value}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weekly Chart & System Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Últimos 7 Días</h3>
          <div className="h-56">
            {weeklyData.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin datos históricos aún</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <WhatsAppIcon className="w-5 h-5 object-contain" />
              <span className="text-sm text-gray-600 dark:text-gray-400">WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <TeamsIcon className="w-5 h-5 object-contain" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Teams</span>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Estado del Sistema</h3>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700 dark:text-green-400">En línea</span>
            </div>
          </div>
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.key}
                className={`flex items-center justify-between p-4 rounded-xl border dark:border-gray-600 ${service.bgColor} dark:bg-gray-700/50 ${service.borderColor}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${service.color}15` }}
                  >
                    {service.isImage ? (
                      <service.icon className="w-6 h-6 object-contain" />
                    ) : (
                      <service.icon className="w-5 h-5" style={{ color: service.color }} />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{service.label}</span>
                </div>
                {getStatusBadge(systemStatus[service.key]?.status)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actividad Reciente</h3>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p>No hay actividad reciente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.slice(0, 5).map((activity, index) => {
              const isClickable = activity.type === 'conversation' || activity.type === 'escalation';
              const handleClick = () => {
                if (activity.type === 'escalation') {
                  navigate('/escalations');
                } else if (activity.type === 'conversation' && activity.phone) {
                  navigate(`/chat/${activity.phone}`);
                } else if (activity.type === 'conversation') {
                  navigate('/conversations');
                }
              };

              return (
                <div
                  key={index}
                  onClick={isClickable ? handleClick : undefined}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    isClickable ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'conversation' ? 'bg-blue-500' :
                    activity.type === 'escalation' ? 'bg-amber-500' : 'bg-green-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.details}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                    {isClickable && (
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4 border-t border-gray-100 dark:border-gray-700">
        <p>© 2026 Novus Soluciones S.A. Todos los derechos reservados.</p>
      </div>
    </div>
  );
};

export default Dashboard;
