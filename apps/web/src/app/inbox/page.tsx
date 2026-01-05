'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/utils';
import { MessageSquare, Phone, Clock, Search, Check, X, ArrowUp, ChevronDown, Paperclip, Smile, User } from 'lucide-react';
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
  tickets: Array<{ id: string; number: string; status: string; category: string }>;
  callSessions: Array<{ id: string; startedAt: string; duration: number | null; summary: string | null }>;
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
      setSelectedConversation(data);
      
      // Check for suggested reply in last message
      const lastMessage = data.messages[data.messages.length - 1];
      if (lastMessage?.metadata?.suggestedReply) {
        setReplyText(lastMessage.metadata.suggestedReply as string);
      } else {
        setReplyText('');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
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
    } finally {
      setSending(false);
    }
  }

  async function approveAndSend() {
    if (!replyText.trim()) return;
    await sendMessage();
  }

  async function getSuggestedReply() {
    if (!selectedConversation) return;
    
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

  // Get badge color based on status/priority
  const getBadgeColor = (conv: Conversation) => {
    if (conv.priority === 'URGENT' || conv.priority === 'HIGH') return 'bg-red-100 text-red-800';
    if (conv.status === 'OPEN') return 'bg-green-100 text-green-800';
    if (conv._count.messages > 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
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
      <div className="flex h-screen">
        {/* Columna Izquierda: Lista de Conversaciones */}
        <div className="w-80 border-r bg-white flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Inbox</h2>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Customer</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search inbox"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md text-sm"
              />
            </div>
          </div>
          
          {/* Lista de conversaciones */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-2">Tickets</div>
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadFullConversation(conv.id)}
                  className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                    selectedConversation?.id === conv.id 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar circular */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {getInitials(conv.customer.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-sm truncate">{conv.customer.name}</div>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getBadgeColor(conv)}`}>
                          {conv._count.messages > 0 ? conv._count.messages : conv.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate mb-1">
                        {conv.customer.phoneNumber}
                      </div>
                      {conv.messages[0] && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {conv.messages[0].text || '(Sin texto)'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna Central: Vista de Chat */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConversation ? (
            <>
              {/* Header con filtros */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        filter === 'all' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All {conversations.length}
                    </button>
                    <button
                      onClick={() => setFilter('unassigned')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        filter === 'unassigned' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Unassigned
                    </button>
                    <button
                      onClick={() => setFilter('urgent')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        filter === 'urgent' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Urgent
                    </button>
                    <button
                      onClick={() => setFilter('chats')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        filter === 'chats' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Chats {conversations.filter(c => c.primaryChannel === 'WHATSAPP').length}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search"
                        className="pl-10 pr-4 py-1.5 border rounded-md text-sm w-48"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {selectedConversation.messages.map((message, idx) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[70%] ${message.direction === 'OUTBOUND' ? 'flex-row-reverse' : ''}`}>
                      {message.direction === 'INBOUND' && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {getInitials(selectedConversation.customer.name)}
                        </div>
                      )}
                      <div
                        className={`p-4 rounded-2xl ${
                          message.direction === 'OUTBOUND'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border shadow-sm'
                        }`}
                      >
                        <div className={`text-sm mb-1 ${message.direction === 'OUTBOUND' ? 'text-blue-100' : 'text-gray-500'}`}>
                          {message.direction === 'INBOUND' ? selectedConversation.customer.name : 'You'}
                        </div>
                        <p className="text-sm">{message.text || '(Sin texto)'}</p>
                        <div className={`text-xs mt-2 ${message.direction === 'OUTBOUND' ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Panel de Respuesta Sugerida */}
              {replyText && (
                <div className="p-4 border-t bg-white">
                  <Card className="mb-3">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {getInitials(selectedConversation.customer.name)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-500 mb-1">Isabel</div>
                            <div className="bg-gray-100 p-3 rounded-lg text-sm">{replyText}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={approveAndSend} 
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            disabled={sending}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Approve & Send
                          </Button>
                          <Button 
                            onClick={() => setReplyText('')} 
                            variant="outline"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={() => {/* Escalate logic */}} 
                            variant="outline"
                          >
                            <ArrowUp className="w-4 h-4 mr-2" />
                            Escalate
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Input de respuesta */}
              <div className="p-4 border-t bg-white">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border rounded-lg text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  />
                  <Button variant="ghost" size="sm">
                    <Smile className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={sendMessage} 
                    disabled={sending || !replyText.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Selecciona una conversación
            </div>
          )}
        </div>

        {/* Columna Derecha: Detalles del Cliente */}
        {selectedConversation && (
          <div className="w-80 border-l bg-white flex flex-col">
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selectedConversation.customer.name}</h3>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Perfil del Cliente */}
            <div className="p-4 border-b">
              <div className="flex flex-col items-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg mb-3">
                  {getInitials(selectedConversation.customer.name)}
                </div>
                <div className="text-center">
                  <div className="font-semibold mb-1">{selectedConversation.customer.name}</div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {selectedConversation.customer.phoneNumber}
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">VIP</span>
                    <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded-full font-medium">Open</span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">Frequent</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Status Summary */}
              <div>
                <h4 className="font-semibold text-sm mb-3 text-gray-700">STATUS</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>{selectedConversation._count.messages} messages, {selectedConversation._count.tickets} tickets</div>
                </div>
              </div>

              {/* Details */}
              <div>
                <h4 className="font-semibold text-sm mb-3 text-gray-700">DETAILS</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{selectedConversation.customer.phoneNumber}</span>
                  </div>
                  {selectedConversation.customer.email && (
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{selectedConversation.customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{selectedConversation._count.messages} conversations</span>
                  </div>
                </div>
              </div>

              {/* Tickets */}
              {selectedConversation.tickets.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3 text-gray-700">TICKETS</h4>
                  <div className="space-y-2">
                    {selectedConversation.tickets.map((ticket) => (
                      <div key={ticket.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${
                            ticket.status === 'CLOSED' ? 'bg-green-500' : 'bg-yellow-500'
                          }`} />
                          <div className="font-medium text-sm">{ticket.number}</div>
                        </div>
                        <div className="text-xs text-gray-500">{ticket.category}</div>
                        <div className={`text-xs mt-1 font-medium ${
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
              {selectedConversation.callSessions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3 text-gray-700">CALLS</h4>
                  <div className="space-y-2">
                    {selectedConversation.callSessions.map((call) => (
                      <div key={call.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {new Date(call.startedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {call.duration && (
                          <div className="text-xs text-gray-500">
                            {Math.floor(call.duration / 60)} min
                          </div>
                        )}
                        {call.summary && (
                          <div className="text-xs text-gray-500 mt-1">{call.summary}</div>
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
    </DashboardLayout>
  );
}
