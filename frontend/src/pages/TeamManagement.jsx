import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Check, X, RefreshCw, Key, Mail, Shield } from 'lucide-react';
import apiService from '../services/api';

const DEFAULT_DEPARTMENTS = [
  { id: 'dept_bd', name: 'Base de Datos', color: '#3B82F6' },
  { id: 'dept_dev', name: 'Desarrollo', color: '#10B981' },
  { id: 'dept_ia', name: 'Inteligencia Artificial', color: '#8B5CF6' },
  { id: 'dept_infra', name: 'Infraestructura', color: '#F59E0B' },
  { id: 'dept_soporte', name: 'Soporte', color: '#EF4444' }
];

const PRESET_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

const ROLES = [
  { value: 'collaborator', label: 'Colaborador', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'admin', label: 'Administrador', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
];

const TeamManagement = () => {
  const [activeTab, setActiveTab] = useState('collaborators');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Users state (loaded from backend)
  const [users, setUsers] = useState([]);

  // Departments state (from backend)
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptColor, setNewDeptColor] = useState('#6366F1');
  const [showAddDept, setShowAddDept] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptColor, setEditDeptColor] = useState('');

  // User form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    role: 'collaborator',
    department_id: '',
    password: 'novus123'
  });

  // Password reset modal
  const [resetPasswordModal, setResetPasswordModal] = useState({ isOpen: false, user: null, newPassword: 'novus123' });

  // Load users and departments from backend
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, deptsResponse] = await Promise.all([
        apiService.getUsers(),
        apiService.getDepartments()
      ]);
      setUsers(usersResponse.users || []);
      setDepartments(deptsResponse.departments || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = loadData;

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // User CRUD operations
  const handleUserFormChange = (field, value) => {
    setUserForm(prev => ({ ...prev, [field]: value }));
  };

  const resetUserForm = () => {
    setUserForm({
      email: '',
      full_name: '',
      role: 'agent',
      department_id: '',
      password: 'novus123'
    });
    setEditingUser(null);
    setShowAddUser(false);
  };

  const startAddUser = () => {
    resetUserForm();
    setShowAddUser(true);
  };

  const startEditUser = (user) => {
    setEditingUser(user.id);
    setUserForm({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department_id: user.department_id || '',
      password: ''
    });
  };

  const saveUser = async () => {
    try {
      setSaving(true);

      if (!userForm.email.trim() || !userForm.full_name.trim()) {
        showMessage('error', 'Email y nombre son requeridos');
        return;
      }

      if (editingUser) {
        // Update existing user
        const updateData = {
          email: userForm.email,
          full_name: userForm.full_name,
          role: userForm.role,
          department_id: userForm.department_id || null
        };
        await apiService.updateUser(editingUser, updateData);
        showMessage('success', 'Usuario actualizado exitosamente');
      } else {
        // Create new user
        await apiService.createUser(userForm);
        showMessage('success', 'Usuario creado exitosamente');
      }

      resetUserForm();
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      showMessage('error', error.response?.data?.detail || 'Error al guardar usuario');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (userId, userName) => {
    if (!confirm(`¿Estás seguro de eliminar a ${userName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setSaving(true);
      await apiService.deleteUser(userId);
      showMessage('success', 'Usuario eliminado exitosamente');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showMessage('error', error.response?.data?.detail || 'Error al eliminar usuario');
    } finally {
      setSaving(false);
    }
  };

  const openResetPasswordModal = (user) => {
    setResetPasswordModal({ isOpen: true, user, newPassword: 'novus123' });
  };

  const resetPassword = async () => {
    try {
      setSaving(true);
      const { user, newPassword } = resetPasswordModal;
      await apiService.resetUserPassword(user.id, newPassword);
      showMessage('success', `Contraseña actualizada para ${user.full_name}`);
      setResetPasswordModal({ isOpen: false, user: null, newPassword: 'novus123' });
    } catch (error) {
      console.error('Error resetting password:', error);
      showMessage('error', 'Error al resetear contraseña');
    } finally {
      setSaving(false);
    }
  };

  // Department functions
  const addDepartment = async () => {
    if (newDeptName.trim()) {
      try {
        const response = await apiService.createDepartment({ name: newDeptName.trim(), color: newDeptColor });
        setDepartments([...departments, response.department]);
        setNewDeptName('');
        setNewDeptColor('#6366F1');
        setShowAddDept(false);
        showMessage('success', 'Departamento creado exitosamente');
      } catch (error) {
        showMessage('error', 'Error al crear departamento');
      }
    }
  };

  const startEditDept = (dept) => {
    setEditingDept(dept.id);
    setEditDeptName(dept.name);
    setEditDeptColor(dept.color);
  };

  const saveEditDept = async (id) => {
    try {
      const response = await apiService.updateDepartment(id, { name: editDeptName, color: editDeptColor });
      setDepartments(departments.map(d => d.id === id ? response.department : d));
      setEditingDept(null);
      showMessage('success', 'Departamento actualizado');
    } catch (error) {
      showMessage('error', 'Error al actualizar departamento');
    }
  };

  const removeDepartment = async (id) => {
    const hasUsers = users.some(u => u.department_id === id);
    if (hasUsers) {
      alert('No puedes eliminar un departamento que tiene colaboradores asignados. Reasigna los colaboradores primero.');
      return;
    }
    try {
      await apiService.deleteDepartment(id);
      setDepartments(departments.filter(d => d.id !== id));
      showMessage('success', 'Departamento eliminado');
    } catch (error) {
      showMessage('error', 'Error al eliminar departamento');
    }
  };

  const getDepartmentById = (id) => {
    return departments.find(d => d.id === id);
  };

  const getUsersByDepartment = (deptId) => {
    return users.filter(u => u.department_id === deptId);
  };

  const getRoleLabel = (role) => {
    const roleObj = ROLES.find(r => r.value === role);
    return roleObj || ROLES[0];
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Equipo</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Administra usuarios y departamentos</p>
            </div>
          </div>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div
          onClick={() => setActiveTab('collaborators')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            activeTab === 'collaborators'
              ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${activeTab === 'collaborators' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Colaboradores</p>
              <p className={`text-2xl font-bold ${activeTab === 'collaborators' ? '' : 'dark:text-white'}`}>{users.length}</p>
            </div>
            <div className={`p-3 rounded-lg ${activeTab === 'collaborators' ? 'bg-white/20' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
              <Users className={`w-5 h-5 ${activeTab === 'collaborators' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('departments')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            activeTab === 'departments'
              ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${activeTab === 'departments' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Departamentos</p>
              <p className={`text-2xl font-bold ${activeTab === 'departments' ? '' : 'dark:text-white'}`}>{departments.length}</p>
            </div>
            <div className={`p-3 rounded-lg ${activeTab === 'departments' ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              <div className="flex -space-x-1">
                {departments.slice(0, 4).map((dept) => (
                  <div
                    key={dept.id}
                    className="w-3 h-3 rounded-full border border-white dark:border-gray-800"
                    style={{ backgroundColor: dept.color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collaborators Tab */}
      {activeTab === 'collaborators' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Colaboradores / Usuarios</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Usuarios que pueden iniciar sesión en el sistema</p>
            </div>
            <button
              onClick={startAddUser}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Agregar</span>
            </button>
          </div>

          {/* Add/Edit Form */}
          {(showAddUser || editingUser) && (
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => handleUserFormChange('email', e.target.value)}
                    placeholder="usuario@novuscr.com"
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-white"
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={userForm.full_name}
                    onChange={(e) => handleUserFormChange('full_name', e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-white"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Rol
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => handleUserFormChange('role', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-white"
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Departamento</label>
                  <select
                    value={userForm.department_id}
                    onChange={(e) => handleUserFormChange('department_id', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-white"
                  >
                    <option value="">Sin departamento</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* Password (only when creating) */}
                {!editingUser && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Key className="w-4 h-4 inline mr-1" />
                      Contraseña Inicial
                    </label>
                    <input
                      type="text"
                      value={userForm.password}
                      onChange={(e) => handleUserFormChange('password', e.target.value)}
                      placeholder="novus123"
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      El usuario podrá cambiarla después de iniciar sesión
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveUser}
                  disabled={saving || !userForm.email.trim() || !userForm.full_name.trim()}
                  className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {saving ? 'Guardando...' : (editingUser ? 'Actualizar' : 'Crear Usuario')}
                </button>
                <button
                  onClick={resetUserForm}
                  className="px-4 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* List */}
          <div className="p-5">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Cargando usuarios...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Sin usuarios</h3>
                <p className="text-gray-500 dark:text-gray-400">Agrega usuarios para gestionar el equipo</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group by department */}
                {departments.map((dept) => {
                  const deptUsers = getUsersByDepartment(dept.id);
                  if (deptUsers.length === 0) return null;

                  return (
                    <div key={dept.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{dept.name}</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">({deptUsers.length})</span>
                      </div>
                      <div className="space-y-2">
                        {deptUsers.map((user) => {
                          const roleInfo = getRoleLabel(user.role);
                          return (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: `${dept.color}20` }}
                                >
                                  <span className="text-sm font-semibold" style={{ color: dept.color }}>
                                    {user.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-white">{user.full_name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${roleInfo.color}`}>
                                      {roleInfo.label}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openResetPasswordModal(user)}
                                  className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                  title="Resetear contraseña"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => startEditUser(user)}
                                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteUser(user.id, user.full_name)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Users without department */}
                {users.filter(u => !u.department_id || !departments.find(d => d.id === u.department_id)).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Sin departamento</span>
                    </div>
                    <div className="space-y-2">
                      {users.filter(u => !u.department_id || !departments.find(d => d.id === u.department_id)).map((user) => {
                        const roleInfo = getRoleLabel(user.role);
                        return (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                  {user.full_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 dark:text-white">{user.full_name}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${roleInfo.color}`}>
                                    {roleInfo.label}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openResetPasswordModal(user)}
                                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                title="Resetear contraseña"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => startEditUser(user)}
                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteUser(user.id, user.full_name)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Departments Tab - Keep existing code */}
      {activeTab === 'departments' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Departamentos</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Áreas o ramas de la organización</p>
            </div>
            <button
              onClick={() => setShowAddDept(!showAddDept)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Agregar</span>
            </button>
          </div>

          {/* Add Form */}
          {showAddDept && (
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="Nombre del departamento"
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-gray-400"
                    onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                  <div className="flex gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewDeptColor(color)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${newDeptColor === color ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addDepartment}
                    disabled={!newDeptName.trim()}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => { setShowAddDept(false); setNewDeptName(''); }}
                    className="px-4 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* List */}
          <div className="p-5">
            {departments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="flex -space-x-1">
                    {PRESET_COLORS.slice(0, 4).map((color, idx) => (
                      <div key={idx} className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-700" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Sin departamentos</h3>
                <p className="text-gray-500 dark:text-gray-400">Crea departamentos para organizar a tus colaboradores</p>
              </div>
            ) : (
              <div className="space-y-3">
                {departments.map((dept) => {
                  const deptUsers = getUsersByDepartment(dept.id);

                  return (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-l-4 border-t border-r border-b border-gray-100 dark:border-gray-600"
                      style={{ borderLeftColor: dept.color }}
                    >
                      {editingDept === dept.id ? (
                        <div className="flex items-center gap-3 flex-1 flex-wrap">
                          <input
                            type="text"
                            value={editDeptName}
                            onChange={(e) => setEditDeptName(e.target.value)}
                            className="flex-1 min-w-[150px] px-3 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg dark:text-white"
                          />
                          <div className="flex gap-1">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => setEditDeptColor(color)}
                                className={`w-6 h-6 rounded border-2 ${editDeptColor === color ? 'border-gray-800 dark:border-white' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <button
                            onClick={() => saveEditDept(dept.id)}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setEditingDept(null)}
                            className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: dept.color }}
                            />
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {deptUsers.length} colaborador{deptUsers.length !== 1 ? 'es' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Avatar stack */}
                            {deptUsers.length > 0 && (
                              <div className="flex -space-x-2 mr-2">
                                {deptUsers.slice(0, 4).map((user, idx) => (
                                  <div
                                    key={user.id}
                                    className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 flex items-center justify-center text-xs font-semibold"
                                    style={{ backgroundColor: `${dept.color}30`, color: dept.color, zIndex: 4 - idx }}
                                    title={user.full_name}
                                  >
                                    {user.full_name.charAt(0)}
                                  </div>
                                ))}
                                {deptUsers.length > 4 && (
                                  <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                                    +{deptUsers.length - 4}
                                  </div>
                                )}
                              </div>
                            )}
                            <button
                              onClick={() => startEditDept(dept)}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => removeDepartment(dept.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resetear Contraseña
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Establecer nueva contraseña para <strong>{resetPasswordModal.user?.full_name}</strong>
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nueva Contraseña
              </label>
              <input
                type="text"
                value={resetPasswordModal.newPassword}
                onChange={(e) => setResetPasswordModal(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetPassword}
                disabled={saving || !resetPasswordModal.newPassword}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Resetear Contraseña'}
              </button>
              <button
                onClick={() => setResetPasswordModal({ isOpen: false, user: null, newPassword: 'novus123' })}
                className="px-4 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4 mt-8 border-t border-gray-100 dark:border-gray-700">
        <p>© 2026 Novus Soluciones S.A. Todos los derechos reservados.</p>
      </div>
    </div>
  );
};

export default TeamManagement;
