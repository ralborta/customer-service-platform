'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/utils';
import { MessageSquare, Phone, Search, Check, X, ArrowUp, ChevronDown, Paperclip, Smile, User, FileText } from 'lucide-react';
import type { TriageResult } from '@customer-service/shared';

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
    if (selectedConversation) {
      loadFullConversation(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  async function loadConversations() {
    try {
      setLoading(true);
      
      // Verificar que hay token (autenticación)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        console.warn('⚠️ No hay token de autenticación. Redirigiendo a login...');
        window.location.href = '/login';
        return;
      }
      
      const data = await apiRequest<Conversation[]>('/conversations');
      console.log('📥 Conversaciones cargadas:', data.length);
      setConversations(data);
      if (data.length > 0 && !selectedConversation) {
        loadFullConversation(data[0].id);
      } else if (data.length === 0) {
        console.info('ℹ️ No hay conversaciones en la base de datos');
        console.info('💡 Esto es normal si:');
        console.info('   1. Es la primera vez que usas el sistema');
        console.info('   2. Aún no han llegado mensajes por WhatsApp');
        console.info('   3. Los webhooks de Builderbot no están configurados');
      }
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Mensaje más específico según el tipo de error
      let userMessage = errorMessage;
      if (errorMessage.includes('No se pudo conectar')) {
        userMessage = 'No se puede conectar al API. Verifica que NEXT_PUBLIC_API_URL esté configurado en Vercel.';
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        userMessage = 'No estás autenticado. Serás redirigido al login...';
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (errorMessage.includes('404')) {
        userMessage = 'El endpoint del API no existe. Verifica que el API esté corriendo correctamente.';
      }
      
      alert(`Error al cargar conversaciones: ${userMessage}\n\nRevisa la consola (F12) para más detalles.`);
    } finally {
      setLoading(false);
    }
  }

  async function loadFullConversation(id: string) {
    try {
      const data = await apiRequest<FullConversation>(`/conversations/${id}`);
      
      // Validar que los datos existen
      if (!data) {
        throw new Error('No se recibieron datos de la conversación');
      }
      
      // Asegurar que messages existe (puede ser un array vacío)
      if (!data.messages) {
        data.messages = [];
      }
      
      console.log('💬 Conversación cargada:', {
        id: data.id,
        messagesCount: data.messages?.length || 0,
        customer: data.customer?.name || 'Sin nombre'
      });
      setSelectedConversation(data);
      
      // Check for suggested reply in last message
      if (data.messages && data.messages.length > 0) {
        const lastMessage = data.messages[data.messages.length - 1];
        if (lastMessage?.metadata?.suggestedReply) {
          setReplyText(lastMessage.metadata.suggestedReply as string);
        } else {
          setReplyText('');
        }
      } else {
        setReplyText('');
      }
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error al cargar conversación: ${errorMessage}`);
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
      // Mensaje enviado exitosamente (podrías agregar un toast aquí)
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al enviar mensaje';
      // Solo mostrar el error real, no el mensaje genérico
      alert(`Error: ${errorMessage}`);
    } finally {
      setSending(false);
    }
  }

  async function approveAndSend() {
    if (!replyText.trim()) return;
    await sendMessage();
  }

  async function getSuggestedReply() {
    if (!selectedConversation || !selectedConversation.messages || selectedConversation.messages.length === 0) return;
    
    try {
      const lastMessage = selectedConversation.messages[selectedConversation.messages.length - 1];
      if (lastMessage) {
        const triage = await apiRequest<TriageResult>(`/ai/triage`, {
          method: 'POST',
          body: JSON.stringify({
            conversationId: selectedConversation.id,
            lastMessageId: lastMessage.id,
            channel: 'whatsapp',
          }),
        });
        if (triage.suggestedReply) {
          setReplyText(triage.suggestedReply);
        }
      }
    } catch (error) {
      console.error('Error getting triage:', error);
    }
  }

  const filteredConversations = conversations.filter(conv => {
    if (filter === 'all') return true;
    if (filter === 'unassigned') return !conv.assignedTo;
    if (filter === 'urgent') return conv.priority === 'URGENT' || conv.priority === 'HIGH';
    if (filter === 'chats') return conv.primaryChannel === 'WHATSAPP';
    return true;
  });

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get badge color and text based on status/priority
  const getBadgeInfo = (conv: Conversation) => {
    if (conv.priority === 'URGENT' || conv.priority === 'HIGH') {
      return { color: 'bg-red-500 text-white', text: 'Urgent' };
    }
    if (!conv.assignedTo) {
      return { color: 'bg-yellow-500 text-white', text: 'Unassigned' };
    }
    if (conv.status === 'OPEN') {
      return { color: 'bg-green-500 text-white', text: 'Open' };
    }
    if (conv._count.messages > 10) {
      return { color: 'bg-purple-500 text-white', text: conv._count.messages.toString() };
    }
    return { color: 'bg-blue-500 text-white', text: conv._count.messages.toString() };
  };

  // Format time ago
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">Cargando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header común arriba de todo */}
        <div className="bg-white border-b px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <span className="text-base font-semibold text-gray-900">Inbox</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-base font-semibold text-gray-900">Customer</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          {/* Barra de búsqueda */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search inbox"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All {conversations.length}
            </button>
            <button
              onClick={() => setFilter('unassigned')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === 'unassigned' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unassigned
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === 'urgent' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Urgent
            </button>
            <button
              onClick={() => setFilter('chats')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === 'chats' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Chats {conversations.filter(c => c.primaryChannel === 'WHATSAPP').length}
            </button>
          </div>
        </div>

        {/* Área principal: Lista de conversaciones + Chat */}
        <div className="flex flex-1 overflow-hidden">
          {/* Columna Izquierda: Lista de Conversaciones */}
          <div className="w-80 bg-white border-r flex flex-col overflow-hidden">
            {/* Search Bar en lista */}
            <div className="p-4 border-b bg-white">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search inbox"
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-md text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Lista de conversaciones */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Tickets</div>
                {loading ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Cargando conversaciones...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <p className="mb-2">No hay conversaciones</p>
                    <p className="text-xs text-gray-500">Los mensajes inbound aparecerán aquí</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const badge = getBadgeInfo(conv);
                    return (
                      <div
                        key={conv.id}
                        onClick={() => loadFullConversation(conv.id)}
                        className={`p-2.5 rounded-lg cursor-pointer mb-1 transition-all ${
                          selectedConversation?.id === conv.id 
                            ? 'bg-blue-50 border border-blue-200 shadow-sm' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Avatar circular */}
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 shadow-sm">
                            {getInitials(conv.customer.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="font-medium text-sm text-gray-900 truncate">{conv.customer.name}</div>
                              <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${badge.color} flex-shrink-0 ml-1`}>
                                {badge.text}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 truncate mb-0.5">
                              {conv.customer.phoneNumber}
                            </div>
                            {conv.messages && conv.messages[0] && (
                              <div className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                                {conv.messages[0].text || '(Sin texto)'}
                              </div>
                            )}
                            <div className="text-[10px] text-gray-400 mt-1">
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

          {/* Columna Central: Vista de Chat */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {!selectedConversation.messages || selectedConversation.messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      No hay mensajes en esta conversación
                    </div>
                  ) : (
                    selectedConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-2 max-w-[75%] ${message.direction === 'OUTBOUND' ? 'flex-row-reverse' : ''}`}>
                          {message.direction === 'INBOUND' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0">
                              {getInitials(selectedConversation.customer.name)}
                            </div>
                          )}
                          <div
                            className={`p-2.5 rounded-lg ${
                              message.direction === 'OUTBOUND'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : 'bg-gray-100 text-gray-900 border border-gray-200'
                            }`}
                          >
                            <div className={`text-[11px] mb-1 ${message.direction === 'OUTBOUND' ? 'text-blue-700' : 'text-gray-600'}`}>
                              {message.direction === 'INBOUND' ? selectedConversation.customer.name : 'You'}
                            </div>
                            <p className="text-sm leading-relaxed">{message.text || '(Sin texto)'}</p>
                            <div className={`text-[10px] mt-1.5 ${message.direction === 'OUTBOUND' ? 'text-blue-600' : 'text-gray-500'}`}>
                              {getTimeAgo(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Panel de Respuesta Sugerida */}
                {replyText && (
                  <div className="p-3 border-t bg-white border-gray-200">
                    <Card className="mb-2 border border-gray-200 shadow-sm">
                      <CardContent className="p-3">
                        <div className="space-y-2.5">
                          <div className="flex gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                              {getInitials(selectedConversation.customer.name)}
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-gray-500 mb-1 font-medium">{selectedConversation.customer.name}</div>
                              <div className="bg-gray-50 p-2.5 rounded text-sm text-gray-700 border border-gray-200">{replyText}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button 
                              onClick={approveAndSend} 
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 h-auto"
                              disabled={sending}
                            >
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                              Approve & Send
                            </Button>
                            <Button 
                              onClick={() => setReplyText('')} 
                              variant="outline"
                              className="px-2.5 py-1.5 h-auto border-gray-300"
                              size="sm"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              onClick={() => {/* Escalate logic */}} 
                              variant="outline"
                              className="px-2.5 py-1.5 h-auto border-gray-300 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                              size="sm"
                            >
                              <ArrowUp className="w-3.5 h-3.5 mr-1" />
                              Escalate
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Input de respuesta */}
                <div className="p-3 border-t bg-white border-gray-200">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="p-1.5 h-auto w-auto hover:bg-gray-100">
                      <Paperclip className="w-4 h-4 text-gray-500" />
                    </Button>
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    />
                    <Button variant="ghost" size="sm" className="p-1.5 h-auto w-auto hover:bg-gray-100">
                      <Smile className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button 
                      onClick={sendMessage} 
                      disabled={sending || !replyText.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
                    >
                      Send
                    </Button>
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
            <div className="w-80 bg-white border-l flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-3 border-b bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-900">{selectedConversation.customer.name}</h3>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>

              {/* Perfil del Cliente */}
              <div className="p-4 border-b bg-white">
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-base mb-2.5 shadow-md">
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
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Status Summary */}
                <div>
                  <h4 className="font-semibold text-xs mb-2.5 text-gray-700 uppercase tracking-wide">Status</h4>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <div>{selectedConversation._count?.messages || 0} messages, {selectedConversation._count?.tickets || 0} tickets</div>
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h4 className="font-semibold text-xs mb-2.5 text-gray-700 uppercase tracking-wide">Details</h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600">{selectedConversation.customer.phoneNumber}</span>
                    </div>
                    {selectedConversation.customer.email && (
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-600">{selectedConversation.customer.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600">{selectedConversation._count?.messages || 0} conversations</span>
                    </div>
                  </div>
                </div>

                {/* Tickets */}
                {selectedConversation.tickets && selectedConversation.tickets.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-xs mb-2.5 text-gray-700 uppercase tracking-wide">Tickets</h4>
                    <div className="space-y-2">
                      {selectedConversation.tickets.map((ticket) => (
                        <div key={ticket.id} className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              ticket.status === 'CLOSED' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                            <div className="font-medium text-xs text-gray-900">{ticket.number}</div>
                          </div>
                          <div className="text-[10px] text-gray-500 mb-0.5">{ticket.category}</div>
                          <div className={`text-[10px] mt-1 font-medium ${
                            ticket.status === 'CLOSED' ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {ticket.status === 'CLOSED' ? 'Closed' : 'Open'} {ticket.category}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Call Sessions */}
                {selectedConversation.callSessions && selectedConversation.callSessions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-xs mb-2.5 text-gray-700 uppercase tracking-wide">Calls</h4>
                    <div className="space-y-2">
                      {selectedConversation.callSessions.map((call) => (
                        <div key={call.id} className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {new Date(call.startedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {call.duration && (
                            <div className="text-[10px] text-gray-500">
                              {Math.floor(call.duration / 60)} min
                            </div>
                          )}
                          {call.summary && (
                            <div className="text-[10px] text-gray-500 mt-1">{call.summary}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
