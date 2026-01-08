'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../dashboard-layout';
import { apiRequest } from '@/lib/utils';
import { MessageSquare, Phone, Search, ChevronDown, Paperclip, Smile, Clock, MoreHorizontal } from 'lucide-react';

interface Message {
  id: string;
  direction: string;
  text: string | null;
  channel: string;
  createdAt: string;
  metadata?: { suggestedReply?: string; suggestedActions?: unknown[] };
}

interface Conversation {
  id: string;
  status: string;
  priority: string;
  primaryChannel: string;
  customer: { name: string; phoneNumber: string | null; email?: string | null };
  assignedTo: { name: string } | null;
  messages: Array<{ text: string | null; createdAt: string }>;
  updatedAt: string;
  _count: { messages: number; tickets: number };
}

interface FullConversation extends Conversation {
  messages: Message[];
  tickets?: Array<{ id: string; number: string; status: string; category: string }>;
  callSessions?: Array<{ id: string; startedAt: string; duration: number | null; summary: string | null }>;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<FullConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    // Check for conversation ID in URL params
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get('conversation');
    if (conversationId && !selectedConversation) {
      loadFullConversation(conversationId);
    }
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadFullConversation(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  async function loadConversations() {
    try {
      setLoading(true);
      
      const data = await apiRequest<Conversation[]>('/conversations');
      setConversations(data);
      if (data.length > 0 && !selectedConversation) {
        loadFullConversation(data[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFullConversation(id: string) {
    try {
      const data = await apiRequest<FullConversation>(`/conversations/${id}`);
      if (!data) return;
      if (!data.messages) {
        data.messages = [];
      }
      setSelectedConversation(data);
      setReplyText('');
    } catch (error) {
      console.error('Error loading conversation:', error);
      setSelectedConversation(null);
    }
  }

  async function sendMessage() {
    if (!replyText.trim() || !selectedConversation) return;
    
    setSending(true);
    try {
      await apiRequest(`/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: replyText, direction: 'OUTBOUND' }),
      });
      setReplyText('');
      await loadFullConversation(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Error al enviar mensaje'}`);
    } finally {
      setSending(false);
    }
  }

  const filteredConversations = conversations.filter(conv => {
    if (filter === 'all') return true;
    if (filter === 'unassigned') return !conv.assignedTo;
    if (filter === 'urgent') return conv.priority === 'URGENT' || conv.priority === 'HIGH';
    if (filter === 'chats') return conv.primaryChannel === 'WHATSAPP';
    return true;
  });

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getAvatarColor = (name: string) => {
    // Generar color consistente basado en el nombre
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">Cargando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen bg-white">
        {/* Header superior */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <span className="text-base font-semibold text-gray-900">Inbox</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-gray-900">Customer</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          {/* Buscador */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search inbox"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All {conversations.length}
            </button>
            <button
              onClick={() => setFilter('unassigned')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === 'unassigned' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unassigned
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === 'urgent' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Urgent
            </button>
            <button
              onClick={() => setFilter('chats')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === 'chats' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Chats {conversations.filter(c => c.primaryChannel === 'WHATSAPP').length}
            </button>
          </div>
        </div>

        {/* Área principal: 3 columnas */}
        <div className="flex flex-1 overflow-hidden">
          {/* Columna Izquierda: Lista de conversaciones */}
          <div className="w-80 bg-white border-r flex flex-col overflow-hidden">
            {/* Buscador en lista */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Q Search inbox"
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Lista de conversaciones */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">TICKETS</div>
                {loading ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No hay conversaciones</div>
                ) : (
                  filteredConversations.map((conv) => {
                    const initials = getInitials(conv.customer.name);
                    const isSelected = selectedConversation?.id === conv.id;
                    const isUnassigned = !conv.assignedTo;
                    
                    return (
                      <div
                        key={conv.id}
                        onClick={() => loadFullConversation(conv.id)}
                        className={`p-3 rounded-lg cursor-pointer mb-1 transition-all ${
                          isSelected 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar circular */}
                          <div className={`w-10 h-10 rounded-full ${getAvatarColor(conv.customer.name)} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-sm text-gray-900 truncate">
                                {conv.customer.name}
                              </div>
                              {isUnassigned && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-yellow-100 text-yellow-800 flex-shrink-0 ml-1">
                                  Unassigned
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 truncate mb-1">
                              {conv.customer.phoneNumber || conv.customer.email || 'Sin contacto'}
                            </div>
                            {conv.messages && conv.messages[0] && (
                              <div className="text-[11px] text-gray-400 line-clamp-1 mb-1">
                                {conv.messages[0].text || '(sin texto)'}
                              </div>
                            )}
                            <div className="text-[10px] text-gray-400">
                              {getTimeAgo(conv.updatedAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Columna Central: Chat */}
          <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {!selectedConversation.messages || selectedConversation.messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      No hay mensajes en esta conversación
                    </div>
                  ) : (
                    selectedConversation.messages.map((message) => {
                      const isOutbound = message.direction === 'OUTBOUND';
                      const initials = getInitials(selectedConversation.customer.name);
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex gap-2 max-w-[75%] ${isOutbound ? 'flex-row-reverse' : ''}`}>
                            {!isOutbound && (
                              <div className={`w-8 h-8 rounded-full ${getAvatarColor(selectedConversation.customer.name)} flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0`}>
                                {initials}
                              </div>
                            )}
                            <div
                              className={`p-2.5 rounded-lg ${
                                isOutbound
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <div className={`text-[11px] mb-1 ${isOutbound ? 'text-blue-700' : 'text-gray-600'}`}>
                                {isOutbound ? 'You' : selectedConversation.customer.name}
                              </div>
                              <p className="text-sm leading-relaxed">{message.text || '(sin texto)'}</p>
                              <div className={`text-[10px] mt-1.5 ${isOutbound ? 'text-blue-600' : 'text-gray-500'}`}>
                                {getTimeAgo(message.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input de mensaje */}
                <div className="p-4 border-t bg-white">
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                      <Paperclip className="w-4 h-4 text-gray-500" />
                    </button>
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    />
                    <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                      <Smile className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={sendMessage}
                      disabled={sending || !replyText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Selecciona una conversación
              </div>
            )}
          </div>

          {/* Columna Derecha: Detalles del Cliente */}
          {selectedConversation && (
            <div className="w-80 bg-white border-l flex flex-col overflow-hidden relative">
              {/* Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-900">{selectedConversation.customer.name}</h3>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Perfil del Cliente */}
              <div className="p-6 border-b">
                <div className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full ${getAvatarColor(selectedConversation.customer.name)} flex items-center justify-center text-white font-semibold text-lg mb-3`}>
                    {getInitials(selectedConversation.customer.name)}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm text-gray-900 mb-1">{selectedConversation.customer.name}</div>
                    <div className="text-xs text-gray-500 mb-3">
                      {selectedConversation.customer.phoneNumber}
                    </div>
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded-full font-semibold">VIP</span>
                      <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 text-[10px] rounded-full font-semibold">Open</span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[10px] rounded-full font-semibold">Frequent</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenido scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Status */}
                <div>
                  <h4 className="font-semibold text-xs mb-2.5 text-gray-700 uppercase tracking-wide">STATUS</h4>
                  <div className="text-xs text-gray-600">
                    {selectedConversation._count?.messages || 0} messages, {selectedConversation._count?.tickets || 0} tickets
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h4 className="font-semibold text-xs mb-2.5 text-gray-700 uppercase tracking-wide">DETAILS</h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600">{selectedConversation.customer.phoneNumber}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600">{selectedConversation._count?.messages || 0} conversations</span>
                    </div>
                  </div>
                </div>

                {/* Tickets */}
                {selectedConversation.tickets && selectedConversation.tickets.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-xs mb-2.5 text-gray-700 uppercase tracking-wide">TICKETS</h4>
                    <div className="space-y-2">
                      {selectedConversation.tickets.map((ticket) => (
                        <div key={ticket.id} className="text-xs text-gray-600">
                          <div className="mb-1">• {ticket.number}</div>
                          <div className="text-gray-500 mb-1">{ticket.category}</div>
                          <div className={`text-[10px] font-medium ${
                            ticket.status === 'CLOSED' ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {ticket.status === 'CLOSED' ? 'Closed' : 'Open'} {ticket.category}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Iconos laterales */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-2">
                <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
                  <Clock className="w-4 h-4 text-gray-400" />
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
