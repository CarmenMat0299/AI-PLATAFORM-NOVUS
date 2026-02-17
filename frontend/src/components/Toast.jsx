import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const Toast = () => {
  const { notifications, dismissNotification } = useNotifications();

  // Only show unread notifications as toasts
  const activeToasts = notifications.filter(n => !n.read).slice(0, 3);

  if (activeToasts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'escalation':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'escalation':
        return 'border-l-amber-500';
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {activeToasts.map((notification) => (
        <div
          key={notification.id}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 border-l-4 ${getBorderColor(notification.type)} p-4 animate-slide-in`}
        >
          <div className="flex items-start gap-3">
            {getIcon(notification.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {notification.title}
              </p>
              {notification.message && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {notification.message}
                </p>
              )}
            </div>
            <button
              onClick={() => dismissNotification(notification.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Toast;
