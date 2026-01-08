import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  AlertCircle, 
  MessageSquare, 
  Activity,
  Bot
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/escalations', icon: AlertCircle, label: 'Escalaciones' },
    { path: '/conversations', icon: MessageSquare, label: 'Conversaciones' },
    { path: '/logs', icon: Activity, label: 'Logs del Sistema' },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-primary-50 to-turquoise-50 border-r border-gray-200 min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-primary-500 to-turquoise-500 rounded-xl shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-turquoise-600 bg-clip-text text-transparent">
              JulIA
            </h1>
            <p className="text-xs text-gray-600">Dashboard Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-white shadow-sm text-primary-600 font-medium'
                  : 'text-gray-700 hover:bg-white/50'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 bg-white/50">
        <div className="text-xs text-gray-500 text-center">
          <p>Novus Soluciones S.A.</p>
          <p className="mt-1">© 2026 Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
