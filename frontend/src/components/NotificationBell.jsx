import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, AlertCircle, MessageSquare, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    markAsRead,
    markAllAsRead,
    clearAll
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.type === 'escalation') {
      navigate('/escalations');
    } else if (notification.type === 'conversation') {
      navigate(notification.link || '/conversations');
    }
    setIsOpen(false);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'escalation':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'conversation':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString('es-CR');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-gray-500" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay notificaciones</p>
              </div>
            ) : (
              <div>
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white`}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {unreadCount > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={markAllAsRead}
                className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
              >
                Marcar todo como leído
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
