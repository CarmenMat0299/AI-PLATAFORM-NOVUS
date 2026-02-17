import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Clock,
  RefreshCw,
  User,
  Hash,
  ArrowLeft,
  X
} from 'lucide-react';
import apiService from '../services/api';

// Brand icons using images from public folder
const WhatsAppIcon = ({ className }) => (
  <img src="/whatsapp.png" alt="WhatsApp" className={className} />
);

const TeamsIcon = ({ className }) => (
  <img src="/Microsoft_Office_Teams_(2025–present).svg.png" alt="Teams" className={className} />
);

const WHATSAPP_COLOR = '#25D366';
const TEAMS_COLOR = '#5558AF';

const Conversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const messagesEndRef = useRef(null);

  const fetchConversations = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else if (conversations.length === 0) {
        setLoading(true);
      }
      const data = await apiService.getConversations();
      const newConversations = data.conversations || [];
      setConversations(newConversations);

      // Actualizar la conversación seleccionada si existe
      if (selectedConversation) {
        const updatedConv = newConversations.find(c => c.phone === selectedConversation.phone);
        if (updatedConv) {
          setSelectedConversation(updatedConv);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => fetchConversations(false), 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedConversation?.messages) {
      scrollToBottom();
    }
  }, [selectedConversation?.messages?.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredConversations = conversations
    .filter(conv => {
      const matchesSearch = conv.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           conv.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesChannel = selectedChannel === 'all' || conv.channel === selectedChannel;
      return matchesSearch && matchesChannel;
    })
    .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

  const whatsappCount = conversations.filter(c => c.channel === 'whatsapp').length;
  const teamsCount = conversations.filter(c => c.channel === 'teams').length;

  const getTimeSince = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) return `hace ${diffHours}h`;
    if (diffMins > 0) return `hace ${diffMins}m`;
    return 'ahora';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-CR', {
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

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Panel Izquierdo - Lista de Conversaciones */}
      <div className="w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-turquoise-500 to-ocean-500 rounded-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Conversaciones</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Todas las conversaciones</p>
              </div>
            </div>
            <button
              onClick={() => fetchConversations(true)}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border-0 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 dark:text-white"
            />
          </div>

          {/* Filtros de Canal */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSelectedChannel('all')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedChannel === 'all'
                  ? 'bg-turquoise-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              Todas ({conversations.length})
            </button>
            <button
              onClick={() => setSelectedChannel('whatsapp')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedChannel === 'whatsapp'
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
              style={selectedChannel === 'whatsapp' ? { backgroundColor: WHATSAPP_COLOR } : {}}
            >
              WhatsApp ({whatsappCount})
            </button>
            <button
              onClick={() => setSelectedChannel('teams')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedChannel === 'teams'
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
              style={selectedChannel === 'teams' ? { backgroundColor: TEAMS_COLOR } : {}}
            >
              Teams ({teamsCount})
            </button>
          </div>
        </div>

        {/* Lista de Conversaciones */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-10 h-10 text-turquoise-500 animate-spin mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Sin conversaciones</p>
            </div>
          ) : (
            filteredConversations.map((conv, index) => (
              <div
                key={index}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
                  selectedConversation?.phone === conv.phone
                    ? 'bg-turquoise-50 dark:bg-turquoise-900/20 border-l-4 border-l-turquoise-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: conv.channel === 'whatsapp' ? `${WHATSAPP_COLOR}20` : `${TEAMS_COLOR}20` }}
                  >
                    {conv.channel === 'whatsapp' ? (
                      <WhatsAppIcon className="w-5 h-5 object-contain" />
                    ) : (
                      <TeamsIcon className="w-5 h-5 object-contain" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {conv.user_name || conv.phone}
                      </h3>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {getTimeSince(conv.last_message_at)}
                      </span>
                    </div>
                    {conv.messages && conv.messages.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {conv.messages[conv.messages.length - 1].content}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {conv.message_count} mensajes
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Panel Derecho - Vista de Chat */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selectedConversation ? (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="text-center">
              <div className="w-20 h-20 bg-turquoise-100 dark:bg-turquoise-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-turquoise-600 dark:text-turquoise-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Selecciona una conversación
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Elige una conversación de la lista para ver los detalles
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header del Chat */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                  <div className="w-10 h-10 bg-gradient-to-br from-turquoise-400 to-primary-500 rounded-full flex items-center justify-center text-white">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {selectedConversation.user_name || selectedConversation.phone}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{selectedConversation.channel === 'whatsapp' ? '📱 WhatsApp' : '💬 Teams'}</span>
                      <span>•</span>
                      <span>{selectedConversation.message_count} mensajes</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="hidden md:block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
              {/* Date Badge */}
              <div className="flex justify-center sticky top-0 z-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm text-gray-600 dark:text-gray-400 text-xs font-medium px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
                  {formatDate(selectedConversation.started_at)}
                </div>
              </div>

              {selectedConversation.messages.map((message, index) => {
                const isUser = message.role === 'user';
                return (
                  <div
                    key={index}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
                  >
                    <div className={`max-w-[75%] min-w-0 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-sm overflow-hidden ${
                          isUser
                            ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                        }`}
                      >
                        {!isUser && (
                          <p className="text-xs font-semibold text-turquoise-600 dark:text-turquoise-400 mb-1">
                            JULIA
                          </p>
                        )}
                        <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere">
                          {message.content}
                        </p>
                        <p className={`text-[10px] mt-1 text-right ${isUser ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <span>Inicio: {formatTime(selectedConversation.started_at)}</span>
                  <span>Último: {formatTime(selectedConversation.last_message_at)}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedConversation.channel === 'whatsapp'
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                }`}>
                  {selectedConversation.channel === 'whatsapp' ? 'WhatsApp' : 'Teams'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Conversations;
