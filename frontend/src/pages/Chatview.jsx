import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  RefreshCw,
  User
} from 'lucide-react';
import apiService from '../services/api';

const ChatView = () => {
  const { phone } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversation();
    const interval = setInterval(() => fetchConversation(false), 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  useEffect(() => {
    if (conversation?.messages) {
      scrollToBottom();
    }
  }, [conversation?.messages?.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else if (!conversation) {
        setLoading(true);
      }
      const response = await apiService.getConversations();
      const conv = response.conversations.find(c => c.phone === phone);
      setConversation(conv);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-CR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    }
    
    return date.toLocaleDateString('es-CR', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Cargando conversación...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">Conversación no encontrada</p>
          <button
            onClick={() => navigate('/conversations')}
            className="btn-primary"
          >
            Volver a Conversaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-primary-600 dark:bg-gray-800 shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              onClick={() => navigate('/conversations')}
              className="hover:bg-primary-700 dark:hover:bg-gray-700 p-2 rounded-full transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-white/20 dark:bg-gray-700 flex items-center justify-center text-white shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-primary-600 dark:border-gray-800"></div>
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="font-semibold text-white truncate">
                  {conversation.user_name || conversation.phone}
                </h1>
                <p className="text-xs text-white/80 truncate">
                  {conversation.channel === 'whatsapp' ? 'WhatsApp' : 'Teams'} • {conversation.message_count} mensajes
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => fetchConversation(true)}
            disabled={refreshing}
            className="hover:bg-primary-700 dark:hover:bg-gray-700 p-2 rounded-full transition-all flex-shrink-0"
            title="Actualizar conversación"
          >
            <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Messages Area - Estilo WhatsApp */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-2"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23e5ddd5\' fill-opacity=\'0.1\'/%3E%3C/svg%3E")',
          backgroundColor: '#e5ddd5'
        }}
      >
        {/* Date Badge */}
        <div className="flex justify-center sticky top-0 z-10 mb-3">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 text-xs font-medium px-3 py-1 rounded-lg shadow-sm">
            {formatDate(conversation.started_at)}
          </div>
        </div>

        {/* Messages */}
        {conversation.messages.map((message, index) => {
          const isUser = message.role === 'user';

          return (
            <div
              key={index}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1 w-full`}
            >
              <div className={`max-w-[80%] sm:max-w-[70%] min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`rounded-lg px-3 py-2 shadow-sm overflow-hidden ${
                    isUser
                      ? 'bg-[#dcf8c6] dark:bg-[#005c4b] text-gray-900 dark:text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
                  }`}
                >
                  {!isUser && (
                    <p className="text-xs font-semibold text-turquoise-600 dark:text-turquoise-400 mb-0.5">JULIA</p>
                  )}

                  <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere">
                    {message.content}
                  </p>

                  <p className={`text-[10px] mt-1 ${isUser ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400'} text-right`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer Info */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
            <span className="font-medium">{conversation.message_count} mensajes</span>
            <span>•</span>
            <span>Inicio: {formatTime(conversation.started_at)}</span>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            conversation.channel === 'whatsapp'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
          }`}>
            {conversation.channel === 'whatsapp' ? 'WhatsApp' : 'Teams'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;