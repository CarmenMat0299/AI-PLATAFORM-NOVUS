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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversation();
  }, [phone]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async () => {
    try {
      setLoading(true);
      const response = await apiService.getConversations();
      const conv = response.conversations.find(c => c.phone === phone);
      setConversation(conv);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando conversación...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-600 text-lg mb-4">Conversación no encontrada</p>
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/conversations')}
              className="hover:bg-gray-100 p-2 rounded-full transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="flex items-center space-x-3">
              {/* Avatar con icono de usuario */}
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-turquoise-400 to-primary-500 flex items-center justify-center text-white shadow-md">
                  <User className="w-6 h-6" />
                </div>
                {/* Badge de estado online/offline */}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              
              <div>
                <h1 className="font-semibold text-base text-gray-900">
                  {conversation.user_name || conversation.phone}
                </h1>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-gray-500">
                    {conversation.channel === 'whatsapp' ? '📱 WhatsApp' : '💬 Teams'}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-500">{conversation.message_count} mensajes</span>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={fetchConversation}
            className="hover:bg-gray-100 p-2.5 rounded-full transition-all group"
            title="Actualizar conversación"
          >
            <RefreshCw className="w-5 h-5 text-gray-600 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* Messages Area - Fondo con patrón sutil */}
      <div 
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)),
            repeating-linear-gradient(45deg, #f9fafb 0px, #f9fafb 10px, transparent 10px, transparent 20px)
          `
        }}
      >
        {/* Date Badge */}
        <div className="flex justify-center sticky top-0 z-10 mb-4">
          <div className="bg-white/95 backdrop-blur-sm text-gray-600 text-xs font-medium px-4 py-1.5 rounded-full shadow-sm border border-gray-200">
            {formatDate(conversation.started_at)}
          </div>
        </div>

        {/* Messages */}
        {conversation.messages.map((message, index) => {
          const isUser = message.role === 'user';
          
          return (
            <div
              key={index}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm transition-all hover:shadow-md ${
                    isUser
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
                      : 'bg-white text-gray-800 border border-gray-100'
                  } ${
                    isUser ? 'rounded-br-md' : 'rounded-bl-md'
                  }`}
                >
                  {/* Label Usuario/JULIA */}
                  {!isUser && (
                    <p className="text-xs font-semibold text-turquoise-600 mb-1">JULIA</p>
                  )}
                  
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  
                  {/* Timestamp dentro de la burbuja */}
                  <p className={`text-[10px] mt-1 ${isUser ? 'text-white/70' : 'text-gray-400'} text-right`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer Info - Más estilizado */}
      <div className="bg-white border-t border-gray-100 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-turquoise-400 to-primary-500"></div>
              <span className="font-medium">{conversation.message_count}</span>
              <span className="text-gray-400">mensajes</span>
            </div>
            
            <div className="h-4 w-px bg-gray-200"></div>
            
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Inicio:</span>
              <span className="font-medium">{formatTime(conversation.started_at)}</span>
            </div>
            
            <div className="h-4 w-px bg-gray-200"></div>
            
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Último:</span>
              <span className="font-medium">{formatTime(conversation.last_message_at)}</span>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            conversation.channel === 'whatsapp' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {conversation.channel === 'whatsapp' ? ' WhatsApp' : ' Teams'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;