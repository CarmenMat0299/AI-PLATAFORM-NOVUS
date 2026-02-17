import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertCircle,
  MessageSquare,
  Activity,
  ChevronLeft,
  ChevronRight,
  Settings,
  Users,
  LogOut,
  User
} from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ expanded, onToggle }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [pendingEscalations, setPendingEscalations] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [lastSeenEscalations, setLastSeenEscalations] = useState(() => {
    return parseInt(localStorage.getItem('lastSeenEscalations') || '0');
  });
  const [lastSeenConversations, setLastSeenConversations] = useState(() => {
    return parseInt(localStorage.getItem('lastSeenConversations') || '0');
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const escalations = await apiService.getEscalations();
        const pending = (escalations.escalations || []).filter(e => !e.resolved).length;
        setPendingEscalations(pending);

        const conversations = await apiService.getConversations();
        setConversationCount((conversations.conversations || []).length);
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Mark as seen when visiting the page
  useEffect(() => {
    if (location.pathname === '/escalations') {
      setLastSeenEscalations(pendingEscalations);
      localStorage.setItem('lastSeenEscalations', pendingEscalations.toString());
    }
    if (location.pathname === '/conversations' || location.pathname.startsWith('/chat/')) {
      setLastSeenConversations(conversationCount);
      localStorage.setItem('lastSeenConversations', conversationCount.toString());
    }
  }, [location.pathname, pendingEscalations, conversationCount]);

  const hasNewEscalations = pendingEscalations > lastSeenEscalations;
  const hasNewConversations = conversationCount > lastSeenConversations;
  const isAdmin = user?.role === 'admin';

  // Define all navigation items with role requirements
  const allNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'collaborator'] },
    { path: '/escalations', icon: AlertCircle, label: 'Escalaciones', badge: hasNewEscalations, roles: ['admin', 'collaborator'] },
    { path: '/conversations', icon: MessageSquare, label: 'Conversaciones', badge: hasNewConversations, roles: ['admin'] },
    { path: '/logs', icon: Activity, label: 'Logs', roles: ['admin'] },
  ];

  // Navigation items for bottom section
  const bottomNavItems = [
    { path: '/team', icon: Users, label: 'Equipo', roles: ['admin'] },
    { path: '/settings', icon: Settings, label: 'Configuración', roles: ['admin', 'collaborator'] },
  ];

  // Filter navigation items based on user role
  const navItems = allNavItems.filter(item =>
    item.roles.includes(isAdmin ? 'admin' : 'collaborator')
  );

  const filteredBottomNav = bottomNavItems.filter(item =>
    item.roles.includes(isAdmin ? 'admin' : 'collaborator')
  );

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-gradient-to-b from-primary-50 to-turquoise-50 dark:from-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700 z-40 flex flex-col transition-all duration-150 ${
        expanded ? 'w-64' : 'w-20'
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${expanded ? 'px-6' : 'px-4'}`}>
        <div className={`flex items-center ${expanded ? 'space-x-3' : 'justify-center'}`}>
          <div className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-md flex-shrink-0">
            <img
              src="/JulIA_32_32.png"
              alt="JULIA Logo"
              className="w-8 h-8"
            />
          </div>
          {expanded && (
            <div className="overflow-hidden">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-turquoise-600 bg-clip-text text-transparent">
                JULIA
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dashboard</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center rounded-xl transition-all duration-200 group relative ${
                expanded ? 'px-4 py-3 space-x-3' : 'px-0 py-3 justify-center'
              } ${
                isActive
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <div className="relative">
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.badge && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
              )}
            </div>

            {expanded ? (
              <span className="whitespace-nowrap">{item.label}</span>
            ) : (
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Team, Settings & Toggle */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
        {/* Show filtered bottom navigation items based on role */}
        {filteredBottomNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center rounded-xl transition-all duration-200 group relative ${
                expanded ? 'px-4 py-3 space-x-3' : 'px-0 py-3 justify-center'
              } ${
                isActive
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />

            {expanded ? (
              <span className="whitespace-nowrap">{item.label}</span>
            ) : (
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}

        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center rounded-xl py-3 text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white transition-all"
        >
          {expanded ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
