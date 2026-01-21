import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Escalations from './pages/Escalations';
import Conversations from './pages/Conversations';
import ChatView from './pages/Chatview';
import Logs from './pages/Logs';

function App() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
        <main className={`flex-1 transition-all duration-300 ${sidebarExpanded ? 'ml-64' : 'ml-20'}`}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/escalations" element={<Escalations />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/chat/:phone" element={<ChatView />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
