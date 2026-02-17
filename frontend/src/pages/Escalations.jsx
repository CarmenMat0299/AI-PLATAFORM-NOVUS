import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Phone,
  Clock,
  CheckCircle,
  RefreshCw,
  Search,
  MessageSquare,
  User,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckSquare,
  Square,
  X,
  Flag,
  StickyNote,
  UserPlus,
  Send,
  Building2,
  LayoutList,
  LayoutGrid,
  LogOut,
  User as UserIcon,
  UserCircle
} from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import ConfirmModal from '../components/ConfirmModal';
import ChangeHistory from '../components/ChangeHistory';
import SaveIndicator, { useSaveIndicator } from '../components/SaveIndicator';
import AssignModal from '../components/AssignModal';
import NotificationPanel from '../components/NotificationPanel';
import { formatDateShortCR, getTimeSince, formatFullDateCR } from '../utils/dateUtils';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
];

const DEFAULT_DEPARTMENTS = [
  { id: 'dept_bd', name: 'Base de Datos', color: '#3B82F6' },
  { id: 'dept_dev', name: 'Desarrollo', color: '#10B981' },
  { id: 'dept_ia', name: 'Inteligencia Artificial', color: '#8B5CF6' },
  { id: 'dept_infra', name: 'Infraestructura', color: '#F59E0B' },
  { id: 'dept_soporte', name: 'Soporte', color: '#EF4444' }
];

const DEFAULT_AGENTS = [
  { id: 'agent1', name: 'Carlos Rodríguez', departmentId: 'dept_dev' },
  { id: 'agent2', name: 'María García', departmentId: 'dept_ia' },
  { id: 'agent3', name: 'Juan Pérez', departmentId: 'dept_bd' },
  { id: 'agent4', name: 'Ana Martínez', departmentId: 'dept_soporte' }
];

const getDepartments = () => {
  const saved = localStorage.getItem('departments');
  return saved ? JSON.parse(saved) : DEFAULT_DEPARTMENTS;
};

const getAgents = () => {
  const saved = localStorage.getItem('agents');
  return saved ? JSON.parse(saved) : DEFAULT_AGENTS;
};

const Escalations = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedCard, setExpandedCard] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [actionPanel, setActionPanel] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [departments, setDepartments] = useState(getDepartments);
  const [agents, setAgents] = useState(getAgents);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, phone: null, action: null });
  const [assignModal, setAssignModal] = useState({ isOpen: false, phone: null, currentAgent: null });
  const { saveStatus, lastSaved, startSaving, markSaved, markError } = useSaveIndicator();

  // Update from localStorage when it changes
  useEffect(() => {
    const handleStorageChange = () => {
      setDepartments(getDepartments());
      setAgents(getAgents());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchEscalations = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const data = await apiService.getEscalations();
      setEscalations(data.escalations || []);
    } catch (error) {
      console.error('Error fetching escalations:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial load with loading state
    fetchEscalations(true);

    // Auto-refresh every 15 seconds without loading state
    const interval = setInterval(() => fetchEscalations(false), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (phone) => {
    try {
      const resolvedBy = user?.name || user?.email || 'Usuario';
      await apiService.resolveEscalation(phone, resolvedBy);
      fetchEscalations(false);
      setConfirmModal({ isOpen: false, phone: null, action: null });
    } catch (error) {
      console.error('Error resolving escalation:', error);
    }
  };

  const openResolveConfirm = (phone) => {
    setConfirmModal({ isOpen: true, phone, action: 'resolve' });
  };

  const handleStatusChange = async (phone, newStatus) => {
    try {
      console.log('handleStatusChange called:', { phone, newStatus });

      if (newStatus === 'resolved') {
        openResolveConfirm(phone);
      } else {
        startSaving();
        console.log('Calling API to update status...');
        const result = await apiService.updateEscalationStatus(phone, newStatus);
        console.log('API response:', result);

        console.log('Fetching escalations...');
        await fetchEscalations(false);
        console.log('Escalations fetched successfully');

        markSaved();
      }
    } catch (error) {
      console.error('Error changing status:', error);
      markError();
    }
  };

  const toggleSelectItem = (phone) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(phone)) {
      newSelected.delete(phone);
    } else {
      newSelected.add(phone);
    }
    setSelectedItems(newSelected);
  };

  const selectAllPending = () => {
    const pendingPhones = escalations.filter(e => !e.resolved).map(e => e.user_phone);
    setSelectedItems(new Set(pendingPhones));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setSelectMode(false);
  };

  const handleBatchResolve = async () => {
    try {
      const resolvedBy = user?.name || user?.email || 'Usuario';
      for (const phone of selectedItems) {
        await apiService.resolveEscalation(phone, resolvedBy);
      }
      clearSelection();
      fetchEscalations(false);
    } catch (error) {
      console.error('Error resolving escalations:', error);
    }
  };

  const handleSetPriority = async (phone, priority) => {
    try {
      startSaving();
      await apiService.updateEscalationPriority(phone, priority);
      fetchEscalations(false);
      setActionPanel(null);
      markSaved();
    } catch (error) {
      console.error('Error setting priority:', error);
      markError();
    }
  };

  const handleAddNote = async (phone) => {
    if (!newNote.trim()) return;
    try {
      startSaving();
      await apiService.updateEscalationNote(phone, newNote);
      setNewNote('');
      fetchEscalations(false);
      setActionPanel(null);
      markSaved();
    } catch (error) {
      console.error('Error adding note:', error);
      markError();
    }
  };

  const handleAssignAgent = async (phone, agent) => {
    try {
      startSaving();
      await apiService.assignEscalation(phone, agent);
      fetchEscalations(false);
      setActionPanel(null);
      setAssignModal({ isOpen: false, phone: null, currentAgent: null });
      markSaved();
    } catch (error) {
      console.error('Error assigning agent:', error);
      markError();
    }
  };

  const openAssignModal = (phone, currentAgent) => {
    setAssignModal({ isOpen: true, phone, currentAgent });
  };

  const getAgentById = (agentId) => {
    return agents.find(a => a.id === agentId);
  };

  const getDepartmentById = (deptId) => {
    return departments.find(d => d.id === deptId);
  };

  const getAgentsByDepartment = (deptId) => {
    return agents.filter(a => a.departmentId === deptId);
  };

  const getPriorityBadge = (priority) => {
    const option = PRIORITY_OPTIONS.find(p => p.value === priority);
    if (!option) return null;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${option.color}`}>
        <Flag className="w-3 h-3" />
        {option.label}
      </span>
    );
  };

  const filteredEscalations = escalations
    .filter(esc => {
      const matchesSearch = esc.user_phone?.includes(searchTerm) ||
                           esc.last_message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           false;
      const matchesFilter = filter === 'all' ||
                           (filter === 'pending' && !esc.resolved) ||
                           (filter === 'resolved' && esc.resolved);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      // Pendientes primero
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      // Luego por fecha más reciente
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

  const pendingCount = escalations.filter(e => !e.resolved).length;
  const resolvedCount = escalations.filter(e => e.resolved).length;

  // Get conversation data - handle both field names
  const getConversation = (escalation) => {
    return escalation.conversation_history || escalation.conversation || [];
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-turquoise-500 rounded-xl shadow-lg">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Escalaciones</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Solicitudes de atención con agente humano</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Save Indicator */}
            <SaveIndicator status={saveStatus} lastSaved={lastSaved} />

            {/* Notifications */}
            <NotificationPanel />

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Vista de lista"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Vista Kanban"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* User Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-turquoise-500 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white" />
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
              onClick={() => fetchEscalations(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Actualizar escalaciones"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => setFilter('all')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            filter === 'all'
              ? 'bg-gradient-to-br from-primary-500 to-turquoise-500 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${filter === 'all' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Total</p>
              <p className={`text-2xl font-bold ${filter === 'all' ? '' : 'dark:text-white'}`}>{escalations.length}</p>
            </div>
            <div className={`p-3 rounded-lg ${filter === 'all' ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <Filter className={`w-5 h-5 ${filter === 'all' ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilter('pending')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            filter === 'pending'
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${filter === 'pending' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Pendientes</p>
              <p className={`text-2xl font-bold ${filter === 'pending' ? '' : 'dark:text-white'}`}>{pendingCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${filter === 'pending' ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              <Clock className={`w-5 h-5 ${filter === 'pending' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilter('resolved')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            filter === 'resolved'
              ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${filter === 'resolved' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Resueltas</p>
              <p className={`text-2xl font-bold ${filter === 'resolved' ? '' : 'dark:text-white'}`}>{resolvedCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${filter === 'resolved' ? 'bg-white/20' : 'bg-green-100 dark:bg-green-900/30'}`}>
              <CheckCircle className={`w-5 h-5 ${filter === 'resolved' ? 'text-white' : 'text-green-600 dark:text-green-400'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Batch Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por teléfono o mensaje..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-600 dark:text-white dark:placeholder-gray-400 transition-all"
            />
          </div>
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              <CheckSquare className="w-5 h-5" />
              <span>Seleccionar</span>
            </button>
          ) : (
            <button
              onClick={clearSelection}
              className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              <X className="w-5 h-5" />
              <span>Cancelar</span>
            </button>
          )}
        </div>

        {/* Batch Actions Bar */}
        {selectMode && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <button
                onClick={selectAllPending}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                Seleccionar todas pendientes
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedItems.size} seleccionadas
              </span>
            </div>
            {selectedItems.size > 0 && (
              <button
                onClick={handleBatchResolve}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-medium shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Resolver {selectedItems.size} escalaciones</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Escalations View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="w-10 h-10 text-primary-500 animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Cargando escalaciones...</p>
        </div>
      ) : filteredEscalations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No hay escalaciones</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'Todas las solicitudes han sido atendidas'}
          </p>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          escalations={filteredEscalations}
          onStatusChange={handleStatusChange}
          onResolve={openResolveConfirm}
          agents={agents}
          departments={departments}
          getAgentById={getAgentById}
          getDepartmentById={getDepartmentById}
        />
      ) : (
        <div className="space-y-3">
          {filteredEscalations.map((escalation, index) => {
            const assignedAgent = getAgentById(escalation.assigned_agent);
            const agentDepartment = assignedAgent ? getDepartmentById(assignedAgent.departmentId) : null;
            const conversation = getConversation(escalation);

            return (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-all ${
                  escalation.resolved
                    ? 'border-gray-200 dark:border-gray-700 opacity-75'
                    : 'border-l-4 border-l-primary-500 border-t border-r border-b border-gray-200 dark:border-gray-700 shadow-sm'
                } ${selectedItems.has(escalation.user_phone) ? 'ring-2 ring-primary-500 dark:ring-primary-400' : ''}`}
              >
                {/* Main Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Side */}
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      {/* Checkbox in select mode */}
                      {selectMode && !escalation.resolved && (
                        <button
                          onClick={() => toggleSelectItem(escalation.user_phone)}
                          className="flex-shrink-0 mt-1"
                        >
                          {selectedItems.has(escalation.user_phone) ? (
                            <CheckSquare className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                          ) : (
                            <Square className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      )}
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        escalation.resolved
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-gradient-to-br from-primary-100 to-turquoise-100 dark:from-primary-900/30 dark:to-turquoise-900/30'
                      }`}>
                        {escalation.resolved ? (
                          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {escalation.user_phone}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            escalation.resolved
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          }`}>
                            {escalation.resolved ? 'Resuelta' : 'Pendiente'}
                          </span>
                          {escalation.priority && getPriorityBadge(escalation.priority)}
                          {assignedAgent && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: agentDepartment ? `${agentDepartment.color}20` : '#6366F120',
                                color: agentDepartment ? agentDepartment.color : '#6366F1'
                              }}
                            >
                              <UserPlus className="w-3 h-3" />
                              {assignedAgent.name}
                              {agentDepartment && (
                                <span className="opacity-70">• {agentDepartment.name}</span>
                              )}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDateShortCR(escalation.timestamp)}
                          </span>
                          <span className="text-primary-600 dark:text-primary-400 font-medium">
                            {getTimeSince(escalation.timestamp)}
                          </span>
                        </div>

                        {/* Last Message Preview */}
                        {escalation.last_message && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                              "{escalation.last_message}"
                            </p>
                          </div>
                        )}

                        {/* Resolved Info */}
                        {escalation.resolved && escalation.resolved_by && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            <span>Resuelta por <strong>{escalation.resolved_by}</strong></span>
                            {escalation.resolved_at && (
                              <span>• {formatDateShortCR(escalation.resolved_at)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side - Actions */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {!escalation.resolved && (
                        <>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setActionPanel(actionPanel === `priority-${index}` ? null : `priority-${index}`)}
                              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <Flag className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openAssignModal(escalation.user_phone, escalation.assigned_agent)}
                              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              title="Asignar colaborador"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setActionPanel(actionPanel === `note-${index}` ? null : `note-${index}`)}
                              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <StickyNote className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openResolveConfirm(escalation.user_phone)}
                              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span className="font-medium">Resolver</span>
                            </button>
                          </div>

                          {/* Priority Panel */}
                          {actionPanel === `priority-${index}` && (
                            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Seleccionar prioridad:</p>
                              <div className="flex flex-wrap gap-2">
                                {PRIORITY_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={() => handleSetPriority(escalation.user_phone, option.value)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${option.color} ${escalation.priority === option.value ? 'ring-2 ring-primary-500' : ''}`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Add Note Panel */}
                          {actionPanel === `note-${index}` && (
                            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 w-80">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Agregar nota interna:</p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newNote}
                                  onChange={(e) => setNewNote(e.target.value)}
                                  placeholder="Escribe una nota..."
                                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-primary-500 dark:text-white dark:placeholder-gray-400"
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddNote(escalation.user_phone)}
                                />
                                <button
                                  onClick={() => handleAddNote(escalation.user_phone)}
                                  className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {conversation.length > 0 && (
                        <button
                          onClick={() => setExpandedCard(expandedCard === index ? null : index)}
                          className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{conversation.length} mensajes</span>
                          {expandedCard === index ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Conversation History */}
                {expandedCard === index && (
                  <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-5">
                    {/* Notes Section - Full View */}
                    {escalation.notes && escalation.notes.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <StickyNote className="w-4 h-4 text-yellow-600" />
                          Notas internas ({escalation.notes.length})
                        </h4>
                        <div className="space-y-2">
                          {escalation.notes.map((note, noteIdx) => (
                            <div key={noteIdx} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                              <p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatDateShortCR(note.timestamp)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Conversation History */}
                    {conversation.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Historial de conversación</h4>
                        <div className="space-y-1 max-h-96 overflow-y-auto">
                          {conversation.slice(-10).map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                            >
                              <div
                                className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-sm ${
                                  msg.role === 'user'
                                    ? 'bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-800 dark:text-gray-200 rounded-bl-md'
                                    : 'bg-gradient-to-r from-primary-500 to-turquoise-500 text-white rounded-br-md'
                                }`}
                              >
                                <p className="text-xs font-medium mb-0.5 opacity-70">
                                  {msg.role === 'user' ? 'Usuario' : 'JULIA'}
                                </p>
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Change History */}
                    {escalation.history && escalation.history.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <ChangeHistory history={escalation.history} maxVisible={5} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4 mt-8 border-t border-gray-100 dark:border-gray-700">
        <p>© 2026 Novus Soluciones S.A. Todos los derechos reservados.</p>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, phone: null, action: null })}
        onConfirm={() => handleResolve(confirmModal.phone)}
        title="¿Marcar como resuelta?"
        message="Esta escalación se moverá a la sección de resueltas. Podrás ver el historial pero no podrás modificarla."
        confirmText="Resolver"
        cancelText="Cancelar"
        type="success"
      />

      {/* Assign Modal */}
      <AssignModal
        isOpen={assignModal.isOpen}
        onClose={() => setAssignModal({ isOpen: false, phone: null, currentAgent: null })}
        onAssign={(agentId) => handleAssignAgent(assignModal.phone, agentId)}
        currentAgent={assignModal.currentAgent}
        agents={agents}
        departments={departments}
        getDepartmentById={getDepartmentById}
      />
    </div>
  );
};

export default Escalations;
