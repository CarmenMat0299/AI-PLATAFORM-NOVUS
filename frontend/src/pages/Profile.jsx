import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Shield,
  Key,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Profile info state
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || ''
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    if (!profileForm.full_name.trim()) {
      showMessage('error', 'El nombre completo es requerido');
      return;
    }

    try {
      setLoading(true);
      await apiService.updateUser(user.id, {
        full_name: profileForm.full_name,
        email: profileForm.email
      });
      showMessage('success', 'Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage('error', error.response?.data?.detail || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      showMessage('error', 'Todos los campos son requeridos');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      showMessage('error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showMessage('error', 'Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);
      // Implementar endpoint de cambio de contraseña
      await apiService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });

      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });

      showMessage('success', 'Contraseña actualizada correctamente');
    } catch (error) {
      console.error('Error changing password:', error);
      showMessage('error', error.response?.data?.detail || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Volver</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-turquoise-500 rounded-xl shadow-lg">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Perfil</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Administra tu información personal y seguridad</p>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
          <p className={`text-sm font-medium ${
            message.type === 'success'
              ? 'text-green-800 dark:text-green-400'
              : 'text-red-800 dark:text-red-400'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* User Header */}
        <div className="bg-gradient-to-r from-primary-500 to-turquoise-500 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
                <User className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user?.full_name}</h2>
              <p className="text-white/80 text-sm">{user?.email}</p>
              <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-white/20 text-white backdrop-blur-sm">
                {user?.role === 'admin' ? 'Administrador' : 'Colaborador'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'info'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              Información Personal
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'password'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Key className="w-4 h-4" />
              Cambiar Contraseña
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'info' && (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white transition-all"
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white transition-all"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              {/* Role (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rol
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={user?.role === 'admin' ? 'Administrador' : 'Colaborador'}
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  El rol solo puede ser modificado por un administrador
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-turquoise-600 text-white rounded-lg hover:from-primary-700 hover:to-turquoise-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white transition-all"
                    placeholder="Tu contraseña actual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white transition-all"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white transition-all"
                    placeholder="Repite la nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-turquoise-600 text-white rounded-lg hover:from-primary-700 hover:to-turquoise-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
                >
                  <Key className="w-4 h-4" />
                  {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
