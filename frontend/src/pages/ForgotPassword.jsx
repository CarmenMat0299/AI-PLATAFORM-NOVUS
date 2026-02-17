import { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Por favor ingresa tu email');
      setLoading(false);
      return;
    }

    try {
      await authService.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="/JulIA_192_192.png"
                alt="JULIA Logo"
                className="h-24 w-24 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              JULIA Dashboard
            </h1>
            <p className="text-gray-600 text-sm">
              Sistema de gestión inteligente
            </p>
          </div>

          {/* Back to Login */}
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Volver al inicio de sesión
          </Link>

          {/* Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              ¿Olvidaste tu contraseña?
            </h2>
            <p className="text-gray-600 mt-2 text-sm">
              No te preocupes, te enviaremos instrucciones para recuperarla.
            </p>
          </div>

          {success ? (
            /* Success Message */
            <div className="space-y-6">
              <div className="p-6 bg-green-50 border border-green-300 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-green-900 mb-1">
                      Revisa tu correo
                    </h3>
                    <p className="text-sm text-green-800">
                      Si existe una cuenta asociada a <strong>{email}</strong>,
                      recibirás un correo con instrucciones para restablecer tu
                      contraseña.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  ¿No recibiste el correo? Revisa tu carpeta de spam.
                </p>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Intentar con otro email
                </button>
              </div>

              <Link
                to="/login"
                className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            /* Form */
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                      placeholder="tu@email.com"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Enviando...
                    </span>
                  ) : (
                    'Enviar instrucciones'
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-center text-xs text-gray-500">
                  © 2026 Novus Soluciones S.A. Todos los derechos reservados
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;