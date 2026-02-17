import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search, UserMinus } from 'lucide-react';

const AssignModal = ({
  isOpen,
  onClose,
  onAssign,
  currentAgent,
  agents,
  departments,
  getDepartmentById
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedDept(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !selectedDept || agent.departmentId === selectedDept;
    return matchesSearch && matchesDept;
  });

  const groupedAgents = departments.reduce((acc, dept) => {
    const deptAgents = filteredAgents.filter(a => a.departmentId === dept.id);
    if (deptAgents.length > 0) {
      acc.push({ department: dept, agents: deptAgents });
    }
    return acc;
  }, []);

  const currentAgentData = agents.find(a => a.id === currentAgent);
  const currentDept = currentAgentData ? getDepartmentById(currentAgentData.departmentId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Asignar Colaborador</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona quién atenderá esta escalación</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Assignment */}
        {currentAgent && currentAgentData && (
          <div className="px-5 pt-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: currentDept?.color || '#6366F1' }}
                >
                  {currentAgentData.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{currentAgentData.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{currentDept?.name || 'Sin departamento'}</p>
                </div>
              </div>
              <button
                onClick={() => onAssign(null)}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
              >
                <UserMinus className="w-4 h-4" />
                Desasignar
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="p-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white dark:placeholder-gray-400"
              autoFocus
            />
          </div>
        </div>

        {/* Department Filter */}
        <div className="px-5 pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedDept(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                !selectedDept
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Todos
            </button>
            {departments.map(dept => (
              <button
                key={dept.id}
                onClick={() => setSelectedDept(dept.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedDept === dept.id
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                style={selectedDept === dept.id ? { backgroundColor: dept.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedDept === dept.id ? 'white' : dept.color }}
                />
                {dept.name}
              </button>
            ))}
          </div>
        </div>

        {/* Agents List */}
        <div className="px-5 pb-5 max-h-72 overflow-y-auto">
          {groupedAgents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No se encontraron colaboradores</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedAgents.map(({ department, agents: deptAgents }) => (
                <div key={department.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: department.color }}
                    />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {department.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {deptAgents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => onAssign(agent.id)}
                        disabled={agent.id === currentAgent}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                          agent.id === currentAgent
                            ? 'bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                            : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md'
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                          style={{ backgroundColor: department.color }}
                        >
                          {agent.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {agent.name}
                          </p>
                          {agent.id === currentAgent && (
                            <p className="text-xs text-primary-600 dark:text-primary-400">Asignado</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignModal;
