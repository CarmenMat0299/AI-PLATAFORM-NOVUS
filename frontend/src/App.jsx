import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Escalations from './pages/Escalations';
import Conversations from './pages/Conversations';
import ChatView from './pages/Chatview';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import TeamManagement from './pages/TeamManagement';
import Profile from './pages/Profile';

function AppContent() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { isAuthenticated, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Rutas Privadas */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
              <Sidebar
                expanded={sidebarExpanded}
                onToggle={() => setSidebarExpanded(!sidebarExpanded)}
              />
              <main className={`flex-1 transition-all duration-150 ${sidebarExpanded ? 'ml-64' : 'ml-20'}`}>
                <Routes>
                  {/* Routes accessible to all authenticated users */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/escalations" element={<Escalations />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />

                  {/* Admin-only routes */}
                  <Route
                    path="/conversations"
                    element={
                      <RoleBasedRoute allowedRoles={['admin']}>
                        <Conversations />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="/chat/:phone"
                    element={
                      <RoleBasedRoute allowedRoles={['admin']}>
                        <ChatView />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="/logs"
                    element={
                      <RoleBasedRoute allowedRoles={['admin']}>
                        <Logs />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="/team"
                    element={
                      <RoleBasedRoute allowedRoles={['admin']}>
                        <TeamManagement />
                      </RoleBasedRoute>
                    }
                  />

                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Toast />
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <Router>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </Router>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
