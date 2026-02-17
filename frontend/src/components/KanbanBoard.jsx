import React, { useState } from 'react';
import {
  User,
  Clock,
  Flag,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  GripVertical,
  UserPlus,
  StickyNote
} from 'lucide-react';
import { formatDateShortCR, getTimeSince } from '../utils/dateUtils';

const PRIORITY_COLORS = {
  low: 'border-l-gray-400',
  medium: 'border-l-yellow-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500'
};

const PRIORITY_BADGES = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};

const KanbanCard = ({ escalation, onDragStart, onResolve, onAssign, agents, departments, getAgentById, getDepartmentById }) => {
  const [isDragging, setIsDragging] = useState(false);
  const assignedAgent = getAgentById?.(escalation.assigned_agent);
  const agentDept = assignedAgent ? getDepartmentById?.(assignedAgent.departmentId) : null;

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData('escalationPhone', escalation.user_phone);
    // Normalizar el status actual para drag and drop
    const currentStatus = escalation.resolved ? 'resolved' : (escalation.status || 'pending');
    e.dataTransfer.setData('currentStatus', currentStatus);
    onDragStart?.(escalation);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };


  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-white dark:bg-gray-800 rounded-lg border-l-4 ${PRIORITY_COLORS[escalation.priority] || 'border-l-primary-500'} border border-gray-200 dark:border-gray-700 p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95 shadow-lg' : 'hover:-translate-y-0.5'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-turquoise-100 dark:from-primary-900/30 dark:to-turquoise-900/30 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <span className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[120px]">
            {escalation.user_phone}
          </span>
        </div>
        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>

      {/* Message Preview */}
      {escalation.last_message && (
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3 bg-gray-50 dark:bg-gray-700/50 rounded p-2">
          "{escalation.last_message}"
        </p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {escalation.priority && PRIORITY_BADGES[escalation.priority] && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_BADGES[escalation.priority]}`}>
            <Flag className="w-3 h-3" />
            {escalation.priority === 'urgent' ? 'Urgente' : escalation.priority === 'high' ? 'Alta' : escalation.priority === 'medium' ? 'Media' : 'Baja'}
          </span>
        )}
        {assignedAgent && assignedAgent.name && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: agentDept?.color ? `${agentDept.color}20` : '#6366F120',
              color: agentDept?.color || '#6366F1'
            }}
          >
            <UserPlus className="w-3 h-3" />
            {assignedAgent.name.split(' ')[0]}
          </span>
        )}
        {escalation.notes && Array.isArray(escalation.notes) && escalation.notes.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
            <StickyNote className="w-3 h-3" />
            {escalation.notes.length}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {escalation.timestamp ? getTimeSince(escalation.timestamp) : 'Sin fecha'}
        </span>
        <span>{escalation.timestamp ? formatDateShortCR(escalation.timestamp) : ''}</span>
      </div>
    </div>
  );
};

const KanbanColumn = ({ title, icon: Icon, color, escalations, onDrop, children, count }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const phone = e.dataTransfer.getData('escalationPhone');
    const currentStatus = e.dataTransfer.getData('currentStatus');
    onDrop?.(phone, currentStatus);
  };

  return (
    <div
      className={`flex-1 min-w-[300px] bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 transition-all duration-200 ${
        isDragOver ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 shadow-sm">
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3 min-h-[200px]">
        {children}
        {count === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-600">
            <p className="text-sm">Sin escalaciones</p>
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanBoard = ({ escalations, onStatusChange, onResolve, agents, departments, getAgentById, getDepartmentById }) => {
  // Asegurar que todas las escalaciones tengan un status definido
  const normalizedEscalations = escalations.map(e => ({
    ...e,
    status: e.resolved ? 'resolved' : (e.status || 'pending')
  }));

  const pendingEscalations = normalizedEscalations.filter(e => !e.resolved && e.status === 'pending');
  const inProgressEscalations = normalizedEscalations.filter(e => !e.resolved && e.status === 'in_progress');
  const resolvedEscalations = normalizedEscalations.filter(e => e.resolved);

  const handleDrop = (targetStatus) => (phone, currentStatus) => {
    try {
      // Normalizar el status actual
      const normalizedCurrentStatus = currentStatus || 'pending';

      console.log('Kanban Drop:', { phone, currentStatus, targetStatus, normalizedCurrentStatus });

      if (normalizedCurrentStatus === targetStatus) {
        console.log('Same status, ignoring drop');
        return;
      }

      // Si se arrastra a "Resueltas", llamar onResolve para abrir el modal de confirmación
      if (targetStatus === 'resolved') {
        console.log('Opening resolve modal');
        onResolve(phone);
      } else {
        console.log('Changing status to:', targetStatus);
        onStatusChange(phone, targetStatus);
      }
    } catch (error) {
      console.error('Error in handleDrop:', error);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {/* Pending Column */}
      <KanbanColumn
        title="Pendientes"
        icon={AlertCircle}
        color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        count={pendingEscalations.length}
        onDrop={handleDrop('pending')}
      >
        {pendingEscalations.map((escalation, index) => (
          <KanbanCard
            key={`${escalation.user_phone}-${escalation.status}-pending`}
            escalation={escalation}
            onResolve={onResolve}
            agents={agents}
            departments={departments}
            getAgentById={getAgentById}
            getDepartmentById={getDepartmentById}
          />
        ))}
      </KanbanColumn>

      {/* In Progress Column */}
      <KanbanColumn
        title="En Proceso"
        icon={PlayCircle}
        color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        count={inProgressEscalations.length}
        onDrop={handleDrop('in_progress')}
      >
        {inProgressEscalations.map((escalation, index) => (
          <KanbanCard
            key={`${escalation.user_phone}-${escalation.status}-in_progress`}
            escalation={escalation}
            onResolve={onResolve}
            agents={agents}
            departments={departments}
            getAgentById={getAgentById}
            getDepartmentById={getDepartmentById}
          />
        ))}
      </KanbanColumn>

      {/* Resolved Column */}
      <KanbanColumn
        title="Resueltas"
        icon={CheckCircle}
        color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        count={resolvedEscalations.length}
        onDrop={handleDrop('resolved')}
      >
        {resolvedEscalations.slice(0, 10).map((escalation, index) => (
          <KanbanCard
            key={`${escalation.user_phone}-resolved`}
            escalation={{ ...escalation, status: 'resolved' }}
            onResolve={onResolve}
            agents={agents}
            departments={departments}
            getAgentById={getAgentById}
            getDepartmentById={getDepartmentById}
          />
        ))}
        {resolvedEscalations.length > 10 && (
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-2">
            +{resolvedEscalations.length - 10} más
          </p>
        )}
      </KanbanColumn>
    </div>
  );
};

export default KanbanBoard;
