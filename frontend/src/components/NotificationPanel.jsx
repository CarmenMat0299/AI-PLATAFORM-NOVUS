import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  Check,
  AlertCircle,
  MessageSquare,
  Info,
  CheckCheck
} from 'lucide-react';
import apiService from '../services/api';

const NotificationPanel = () => {
  const navigate = useNavigate();
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await apiService.getNotifications();
      setNotifications(response.notifications || []);
      setUnreadCount(response.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch on mount and every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await apiService.markNotificationRead(notificationId);
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await apiService.markAllNotificationsRead();
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate to action URL if exists
    if (notification.data?.action_url) {
      navigate(notification.data.action_url);
      setShowPanel(false);
    }
  };

  // Get icon based on notification type
  const getIcon = (type) => {
    switch (type) {
      case 'escalation':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'conversation':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'system':
        return <Info className="w-5 h-5 text-indigo-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // Format time ago
  const timeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} d`;
    return date.toLocaleDateString('es-CR');
  };

  return (
    <div className="relative">
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPanel(false)}
          ></div>

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 max-h-[600px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-20 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notificaciones
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="p-1.5 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors disabled:opacity-50"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                    <Bell className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    No tienes notificaciones
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5"></div>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {timeAgo(notification.created_at)}
                            </span>

                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                              >
                                Marcar como leída
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationPanel;
