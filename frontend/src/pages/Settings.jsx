import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Sun, Moon, Bell, Mail, Send, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

const Settings = () => {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // SMTP Configuration State
  const [smtpConfig, setSmtpConfig] = useState({
    smtp_server: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    enabled: false
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState({ type: '', text: '' });
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);

  // Load SMTP config on mount (only for admins)
  useEffect(() => {
    if (isAdmin) {
      loadSmtpConfig();
    }
  }, [isAdmin]);

  const loadSmtpConfig = async () => {
    try {
      setSmtpLoading(true);
      const response = await apiService.getSmtpConfig();
      if (response && response.config) {
        setSmtpConfig(response.config);
      }
    } catch (error) {
      console.error('Error loading SMTP config:', error);
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSmtpChange = (field, value) => {
    setSmtpConfig(prev => ({ ...prev, [field]: value }));
  };

  const saveSmtpConfig = async () => {
    try {
      setSmtpSaving(true);
      setSmtpMessage({ type: '', text: '' });

      await apiService.saveSmtpConfig(smtpConfig);

      setSmtpMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
      setTimeout(() => setSmtpMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setSmtpMessage({ type: 'error', text: 'Error al guardar la configuración' });
      console.error('Error saving SMTP config:', error);
    } finally {
      setSmtpSaving(false);
    }
  };

  const testSmtpConfig = async () => {
    try {
      setTesting(true);
      setSmtpMessage({ type: '', text: '' });

      const response = await apiService.testSmtpConfig(testEmail);

      if (response.success) {
        setSmtpMessage({ type: 'success', text: response.message });
      } else {
        setSmtpMessage({ type: 'error', text: response.message });
      }
    } catch (error) {
      setSmtpMessage({ type: 'error', text: 'Error al probar la configuración' });
      console.error('Error testing SMTP:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg">
            <SettingsIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Preferencias del dashboard</p>
          </div>
        </div>
      </div>

      {/* Settings Cards */}
      <div className="space-y-4">
        {/* Theme Setting */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {isDark ? (
                  <Moon className="w-6 h-6 text-indigo-400" />
                ) : (
                  <Sun className="w-6 h-6 text-amber-500" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Tema de la interfaz</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isDark ? 'Modo oscuro activado' : 'Modo claro activado'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isDark ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isDark ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Notifications Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Indicadores de notificación</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Las nuevas escalaciones y conversaciones se muestran con un punto en el menú lateral
              </p>
            </div>
          </div>
        </div>

        {/* SMTP Configuration - Admin Only */}
        {isAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <Mail className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">Configuración de Email (SMTP)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configura el servidor SMTP para enviar correos de recuperación de contraseña
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Activado</span>
                <button
                  onClick={() => handleSmtpChange('enabled', !smtpConfig.enabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    smtpConfig.enabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      smtpConfig.enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>

            {smtpLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Server & Port */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Servidor SMTP
                    </label>
                    <input
                      type="text"
                      value={smtpConfig.smtp_server}
                      onChange={(e) => handleSmtpChange('smtp_server', e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Puerto
                    </label>
                    <input
                      type="number"
                      value={smtpConfig.smtp_port}
                      onChange={(e) => handleSmtpChange('smtp_port', parseInt(e.target.value))}
                      placeholder="587"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Usuario / Email
                  </label>
                  <input
                    type="text"
                    value={smtpConfig.smtp_username}
                    onChange={(e) => handleSmtpChange('smtp_username', e.target.value)}
                    placeholder="tu-email@ejemplo.com"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={smtpConfig.smtp_password}
                    onChange={(e) => handleSmtpChange('smtp_password', e.target.value)}
                    placeholder="Contraseña de aplicación"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Para Gmail, usa una contraseña de aplicación generada en tu cuenta de Google
                  </p>
                </div>

                {/* From Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email de origen
                  </label>
                  <input
                    type="email"
                    value={smtpConfig.from_email}
                    onChange={(e) => handleSmtpChange('from_email', e.target.value)}
                    placeholder="noreply@novus.com"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white"
                  />
                </div>

                {/* Test Email */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Probar configuración
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="email-de-prueba@ejemplo.com"
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white"
                    />
                    <button
                      onClick={testSmtpConfig}
                      disabled={testing || !testEmail}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {testing ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Probar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Message */}
                {smtpMessage.text && (
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${
                    smtpMessage.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                  }`}>
                    {smtpMessage.type === 'success' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">{smtpMessage.text}</span>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={saveSmtpConfig}
                    disabled={smtpSaving}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                  >
                    {smtpSaving ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar Configuración'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4 mt-8 border-t border-gray-100 dark:border-gray-700">
        <p>© 2026 Novus Soluciones S.A. Todos los derechos reservados.</p>
      </div>
    </div>
  );
};

export default Settings;
