import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertCircle,
  MessageSquare,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Sidebar = ({ expanded, onToggle }) => {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/escalations', icon: AlertCircle, label: 'Escalaciones' },
    { path: '/conversations', icon: MessageSquare, label: 'Conversaciones' },
    { path: '/logs', icon: Activity, label: 'Logs' },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-gradient-to-b from-primary-50 to-turquoise-50 border-r border-gray-200 z-40 flex flex-col transition-all duration-300 ${
        expanded ? 'w-64' : 'w-20'
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b border-gray-200 ${expanded ? 'px-6' : 'px-4'}`}>
        <div className={`flex items-center ${expanded ? 'space-x-3' : 'justify-center'}`}>
          <div className="p-2 bg-white rounded-xl shadow-md flex-shrink-0">
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
              <p className="text-xs text-gray-500">Dashboard</p>
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
                  ? 'bg-white shadow-sm text-primary-600 font-medium'
                  : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
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
      </nav>

      {/* Toggle Button */}
      <div className="p-3 border-t border-gray-200/50">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center rounded-xl py-3 text-gray-600 hover:bg-white/60 hover:text-gray-900 transition-all"
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
