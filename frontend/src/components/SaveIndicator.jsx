import React from 'react';
import { Check, Loader2, Cloud, CloudOff, AlertCircle } from 'lucide-react';

/**
 * SaveIndicator - Shows auto-save status
 *
 * @param {string} status - 'idle' | 'saving' | 'saved' | 'error'
 * @param {string} lastSaved - ISO timestamp of last save
 * @param {string} className - Additional CSS classes
 */
const SaveIndicator = ({ status = 'idle', lastSaved, className = '' }) => {
  const formatLastSaved = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'hace un momento';
    if (diffMins < 60) return `hace ${diffMins} min`;

    return date.toLocaleTimeString('es-CR', {
      timeZone: 'America/Costa_Rica',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getIndicator = () => {
    switch (status) {
      case 'saving':
        return (
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium">Guardando...</span>
          </div>
        );

      case 'saved':
        return (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 animate-fade-in">
            <Cloud className="w-4 h-4" />
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3" />
              <span className="text-xs font-medium">Guardado</span>
              {lastSaved && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  • {formatLastSaved(lastSaved)}
                </span>
              )}
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <CloudOff className="w-4 h-4" />
            <span className="text-xs font-medium">Error al guardar</span>
            <AlertCircle className="w-3 h-3" />
          </div>
        );

      default: // idle
        return (
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
            <Cloud className="w-4 h-4" />
            <span className="text-xs">Sincronizado</span>
          </div>
        );
    }
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      {getIndicator()}
    </div>
  );
};

/**
 * useSaveIndicator - Hook to manage auto-save state
 */
export const useSaveIndicator = () => {
  const [saveStatus, setSaveStatus] = React.useState('idle');
  const [lastSaved, setLastSaved] = React.useState(null);
  const timeoutRef = React.useRef(null);

  const startSaving = React.useCallback(() => {
    setSaveStatus('saving');
  }, []);

  const markSaved = React.useCallback(() => {
    setSaveStatus('saved');
    setLastSaved(new Date().toISOString());

    // Reset to idle after 3 seconds
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSaveStatus('idle');
    }, 3000);
  }, []);

  const markError = React.useCallback(() => {
    setSaveStatus('error');

    // Reset to idle after 5 seconds
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSaveStatus('idle');
    }, 5000);
  }, []);

  const reset = React.useCallback(() => {
    setSaveStatus('idle');
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    saveStatus,
    lastSaved,
    startSaving,
    markSaved,
    markError,
    reset
  };
};

export default SaveIndicator;
