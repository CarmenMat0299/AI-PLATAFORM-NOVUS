import React, { useState } from 'react';
import {
  History,
  ChevronDown,
  ChevronUp,
  User,
  Flag,
  UserPlus,
  MessageSquare,
  CheckCircle,
  Clock,
  StickyNote,
  PlayCircle
} from 'lucide-react';
import { formatDateShortCR } from '../utils/dateUtils';

const ACTION_ICONS = {
  created: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  priority_changed: { icon: Flag, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  assigned: { icon: UserPlus, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  unassigned: { icon: UserPlus, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700' },
  note_added: { icon: StickyNote, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  status_changed: { icon: PlayCircle, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  resolved: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  message: { icon: MessageSquare, color: 'text-primary-500', bg: 'bg-primary-100 dark:bg-primary-900/30' }
};

const ACTION_LABELS = {
  created: 'Escalación creada',
  priority_changed: 'Prioridad cambiada',
  assigned: 'Asignado a',
  unassigned: 'Desasignado',
  note_added: 'Nota agregada',
  status_changed: 'Estado cambiado',
  resolved: 'Marcado como resuelto',
  message: 'Nuevo mensaje'
};

const ChangeHistoryItem = ({ change }) => {
  const config = ACTION_ICONS[change.action] || ACTION_ICONS.message;
  const IconComponent = config.icon;

  return (
    <div className="flex gap-3 py-3">
      {/* Timeline indicator */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <IconComponent className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="w-px h-full bg-gray-200 dark:bg-gray-700 mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900 dark:text-white">
            {ACTION_LABELS[change.action] || change.action}
          </span>
          {change.value && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {change.value}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {change.user && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <User className="w-3 h-3" />
              {change.user}
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDateShortCR(change.timestamp)}
          </span>
        </div>

        {change.details && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 bg-gray-50 dark:bg-gray-700/50 rounded p-2">
            {change.details}
          </p>
        )}
      </div>
    </div>
  );
};

const ChangeHistory = ({ history = [], maxVisible = 5, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!history || history.length === 0) {
    return (
      <div className={`text-center py-6 text-gray-400 dark:text-gray-500 ${className}`}>
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Sin historial de cambios</p>
      </div>
    );
  }

  const visibleHistory = isExpanded ? history : history.slice(0, maxVisible);
  const hasMore = history.length > maxVisible;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
          Historial de cambios
        </h4>
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
          {history.length}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {visibleHistory.map((change, index) => (
          <ChangeHistoryItem key={change.id || index} change={change} />
        ))}

        {/* Last item indicator (no line) */}
        {visibleHistory.length > 0 && (
          <div className="absolute bottom-0 left-4 w-px h-3 bg-gray-200 dark:bg-gray-700" style={{ display: 'none' }} />
        )}
      </div>

      {/* Show more/less button */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mt-2 font-medium"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Ver {history.length - maxVisible} más
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ChangeHistory;
