'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/utils';
import { MessageSquare, Phone, Clock, Search, Check, X, ArrowUp } from 'lucide-react';

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
        const triage = await apiRequest(`/ai/triage`, {
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">Cargando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] gap-4">
        {/* Columna Izquierda: Lista de Conversaciones */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar inbox"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md"
              />
            </div>
            <div className="text-sm font-medium mb-2">Tickets</div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => loadFullConversation(conv.id)}
                className={`p-4 border-b cursor-pointer hover:bg-accent transition-colors ${
                  selectedConversation?.id === conv.id ? 'bg-accent border-l-4 border-l-primary' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {conv.primaryChannel === 'WHATSAPP' ? (
                      <MessageSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Phone className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{conv.customer.name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {conv.customer.phoneNumber}
                    </div>
                    {conv.messages[0] && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {conv.messages[0].text || '(Sin texto)'}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(conv.updatedAt).toLocaleTimeString()}
                      </span>
                      {conv._count.messages > 0 && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                          {conv._count.messages}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna Central: Vista de Chat */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header con filtros */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1 rounded text-sm ${
                        filter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      All {conversations.length}
                    </button>
                    <button
                      onClick={() => setFilter('unassigned')}
                      className={`px-3 py-1 rounded text-sm ${
                        filter === 'unassigned' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      Unassigned
                    </button>
                    <button
                      onClick={() => setFilter('urgent')}
                      className={`px-3 py-1 rounded text-sm ${
                        filter === 'urgent' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      Urgent
                    </button>
                    <button
                      onClick={() => setFilter('chats')}
                      className={`px-3 py-1 rounded text-sm ${
                        filter === 'chats' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      Chats {conversations.filter(c => c.primaryChannel === 'WHATSAPP').length}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <select className="text-sm border rounded px-2 py-1">
                    <option>Unread</option>
                  </select>
                </div>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex gap-2 max-w-[70%]">
                      {message.direction === 'INBOUND' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {selectedConversation.primaryChannel === 'WHATSAPP' ? (
                            <MessageSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Phone className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-lg ${
                          message.direction === 'OUTBOUND'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-sm mb-1">
                          {message.direction === 'INBOUND' ? selectedConversation.customer.name : 'Tú'}
                        </div>
                        <p className="text-sm">{message.text || '(Sin texto)'}</p>
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input de respuesta con panel de sugerencia */}
              <div className="p-4 border-t space-y-3">
                {replyText && (
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-sm font-medium mb-2">Respuesta Sugerida:</div>
                    <div className="text-sm mb-3">{replyText}</div>
                    <div className="flex gap-2">
                      <Button onClick={approveAndSend} size="sm" className="flex-1">
                        <Check className="w-4 h-4 mr-2" />
                        Approve & Send
                      </Button>
                      <Button onClick={() => setReplyText('')} variant="outline" size="sm">
                        <X className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => {/* Escalate logic */}} variant="outline" size="sm">
                        <ArrowUp className="w-4 h-4 mr-2" />
                        Escalate
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe tu respuesta..."
                    className="flex-1 px-4 py-2 border rounded-md"
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  />
                  <Button onClick={getSuggestedReply} variant="outline" size="sm">
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button onClick={sendMessage} disabled={sending || !replyText.trim()}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Enviar
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
          <div className="w-80 border-l flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{selectedConversation.customer.name}</h3>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {selectedConversation.primaryChannel === 'WHATSAPP' ? (
                    <MessageSquare className="w-6 h-6 text-primary" />
                  ) : (
                    <Phone className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <div className="font-medium">{selectedConversation.customer.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedConversation.customer.phoneNumber}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">VIP</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Frequent</span>
                {selectedConversation.priority === 'HIGH' && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Urgent</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Status Summary */}
              <div>
                <h4 className="font-medium text-sm mb-2">Status</h4>
                <div className="text-sm text-muted-foreground">
                  <div>{selectedConversation._count.messages} mensajes</div>
                  <div>{selectedConversation._count.tickets} tickets</div>
                </div>
              </div>

              {/* Details */}
              <div>
                <h4 className="font-medium text-sm mb-2">Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedConversation.customer.phoneNumber}</span>
                  </div>
                  {selectedConversation.customer.email && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedConversation.customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedConversation._count.messages} conversaciones</span>
                  </div>
                </div>
              </div>

              {/* Tickets */}
              {selectedConversation.tickets.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Tickets</h4>
                  <div className="space-y-2">
                    {selectedConversation.tickets.map((ticket) => (
                      <div key={ticket.id} className="p-2 border rounded text-sm">
                        <div className="font-medium">{ticket.number}</div>
                        <div className="text-xs text-muted-foreground">{ticket.category}</div>
                        <div className={`text-xs mt-1 ${
                          ticket.status === 'CLOSED' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {ticket.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Call Sessions */}
              {selectedConversation.callSessions.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Llamadas</h4>
                  <div className="space-y-2">
                    {selectedConversation.callSessions.map((call) => (
                      <div key={call.id} className="p-2 border rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{new Date(call.startedAt).toLocaleDateString()}</span>
                        </div>
                        {call.duration && (
                          <div className="text-xs text-muted-foreground">
                            {Math.floor(call.duration / 60)} min
                          </div>
                        )}
                        {call.summary && (
                          <div className="text-xs text-muted-foreground mt-1">{call.summary}</div>
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
