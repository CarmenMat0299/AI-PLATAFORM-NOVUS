import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Clock,
  RefreshCw,
  Eye,
  User,
  Hash,
  ChevronRight
} from 'lucide-react';
import apiService from '../services/api';

// Official brand icons
const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TeamsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.625 8.073h-5.27V5.022a2.248 2.248 0 012.249-2.248h.772A2.248 2.248 0 0120.625 5.022v3.051zM16.5 9.146h5.25a1.125 1.125 0 011.125 1.125v5.104a3.375 3.375 0 01-3.375 3.375h-1.125a.375.375 0 01-.375-.375V10.271a1.125 1.125 0 01-1.5-1.125zM14.625 7.271H3.375A1.875 1.875 0 001.5 9.146v7.479a1.875 1.875 0 001.875 1.875h11.25a1.875 1.875 0 001.875-1.875V9.146a1.875 1.875 0 00-1.875-1.875zM9 15.75a2.625 2.625 0 110-5.25 2.625 2.625 0 010 5.25zm8.625-10.5a2.625 2.625 0 100-5.25 2.625 2.625 0 000 5.25z"/>
  </svg>
);

const WHATSAPP_COLOR = '#25D366';
const TEAMS_COLOR = '#5558AF';

const Conversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const navigate = useNavigate();

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await apiService.getConversations();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChannel = selectedChannel === 'all' || conv.channel === selectedChannel;
    return matchesSearch && matchesChannel;
  });

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

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-turquoise-500 to-ocean-500 rounded-xl shadow-lg">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Conversaciones</h1>
              <p className="text-gray-500 text-sm">Historial de conversaciones del día</p>
            </div>
          </div>
          <button
            onClick={fetchConversations}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-gray-700 font-medium">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => setSelectedChannel('all')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            selectedChannel === 'all'
              ? 'bg-gradient-to-br from-turquoise-500 to-ocean-500 text-white shadow-lg'
              : 'bg-white border border-gray-200 hover:border-turquoise-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${selectedChannel === 'all' ? 'text-white/80' : 'text-gray-500'}`}>Total</p>
              <p className="text-2xl font-bold">{conversations.length}</p>
            </div>
            <div className={`p-3 rounded-lg ${selectedChannel === 'all' ? 'bg-white/20' : 'bg-gray-100'}`}>
              <Hash className={`w-5 h-5 ${selectedChannel === 'all' ? 'text-white' : 'text-gray-600'}`} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setSelectedChannel('whatsapp')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            selectedChannel === 'whatsapp'
              ? 'text-white shadow-lg'
              : 'bg-white border border-gray-200 hover:border-green-300'
          }`}
          style={selectedChannel === 'whatsapp' ? { backgroundColor: WHATSAPP_COLOR } : {}}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${selectedChannel === 'whatsapp' ? 'text-white/80' : 'text-gray-500'}`}>WhatsApp</p>
              <p className="text-2xl font-bold">{whatsappCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${selectedChannel === 'whatsapp' ? 'bg-white/20' : ''}`} style={selectedChannel !== 'whatsapp' ? { backgroundColor: `${WHATSAPP_COLOR}15` } : {}}>
              <WhatsAppIcon className="w-5 h-5" style={{ color: selectedChannel === 'whatsapp' ? 'white' : WHATSAPP_COLOR }} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setSelectedChannel('teams')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
            selectedChannel === 'teams'
              ? 'text-white shadow-lg'
              : 'bg-white border border-gray-200 hover:border-indigo-300'
          }`}
          style={selectedChannel === 'teams' ? { backgroundColor: TEAMS_COLOR } : {}}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${selectedChannel === 'teams' ? 'text-white/80' : 'text-gray-500'}`}>Teams</p>
              <p className="text-2xl font-bold">{teamsCount}</p>
            </div>
            <div className={`p-3 rounded-lg ${selectedChannel === 'teams' ? 'bg-white/20' : ''}`} style={selectedChannel !== 'teams' ? { backgroundColor: `${TEAMS_COLOR}15` } : {}}>
              <TeamsIcon className="w-5 h-5" style={{ color: selectedChannel === 'teams' ? 'white' : TEAMS_COLOR }} />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por teléfono o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Conversations List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="w-10 h-10 text-turquoise-500 animate-spin mb-4" />
          <p className="text-gray-500">Cargando conversaciones...</p>
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay conversaciones</h3>
          <p className="text-gray-500">
            {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'Las conversaciones del día aparecerán aquí'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConversations.map((conversation, index) => (
            <div
              key={index}
              onClick={() => navigate(`/chat/${conversation.phone}`)}
              className="bg-white rounded-xl border overflow-hidden transition-all cursor-pointer hover:shadow-md border-l-4 border-t border-r border-b border-gray-200"
              style={{ borderLeftColor: conversation.channel === 'whatsapp' ? WHATSAPP_COLOR : TEAMS_COLOR }}
            >
              <div className="p-5">
                <div className="flex items-center justify-between gap-4">
                  {/* Left Side */}
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div
                      className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: conversation.channel === 'whatsapp' ? `${WHATSAPP_COLOR}15` : `${TEAMS_COLOR}15` }}
                    >
                      {conversation.channel === 'whatsapp' ? (
                        <WhatsAppIcon className="w-5 h-5" style={{ color: WHATSAPP_COLOR }} />
                      ) : (
                        <TeamsIcon className="w-5 h-5" style={{ color: TEAMS_COLOR }} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.user_name || conversation.phone}
                        </h3>
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: conversation.channel === 'whatsapp' ? `${WHATSAPP_COLOR}15` : `${TEAMS_COLOR}15`,
                            color: conversation.channel === 'whatsapp' ? WHATSAPP_COLOR : TEAMS_COLOR
                          }}
                        >
                          {conversation.channel === 'whatsapp' ? 'WhatsApp' : 'Teams'}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {conversation.message_count || 0} msgs
                        </span>
                      </div>

                      {/* Last Message Preview */}
                      {conversation.messages && conversation.messages.length > 0 && (
                        <p className="text-sm text-gray-500 truncate mb-2">
                          {conversation.messages[conversation.messages.length - 1].content.substring(0, 60)}...
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(conversation.last_message_at)}
                        </span>
                        <span className="text-turquoise-600 font-medium">
                          {getTimeSince(conversation.last_message_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side */}
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat/${conversation.phone}`);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-turquoise-500 to-ocean-500 text-white rounded-lg hover:from-turquoise-600 hover:to-ocean-600 transition-all shadow-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="font-medium">Ver</span>
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 py-4 mt-8 border-t border-gray-100">
        <p>© 2026 Novus Soluciones S.A. Todos los derechos reservados.</p>
      </div>
    </div>
  );
};

export default Conversations;
