'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/utils';
import { MessageSquare, Phone, Send } from 'lucide-react';

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
  customer: { name: string; phoneNumber: string | null };
  messages: Message[];
  tickets: Array<{ id: string; number: string; status: string; category: string }>;
  callSessions: Array<{ id: string; startedAt: string; duration: number | null; summary: string | null }>;
}

export default function ConversationPage() {
  const params = useParams();
  const id = params.id as string;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadConversation();
  }, [id]);

  async function loadConversation() {
    try {
      const data = await apiRequest<Conversation>(`/conversations/${id}`);
      setConversation(data);
      
      // Check for suggested reply in last message
      const lastMessage = data.messages[data.messages.length - 1];
      if (lastMessage?.metadata?.suggestedReply) {
        setReplyText(lastMessage.metadata.suggestedReply as string);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!replyText.trim()) return;
    
    setSending(true);
    try {
      await apiRequest(`/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: replyText, direction: 'OUTBOUND' }),
      });
      setReplyText('');
      await loadConversation();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div>Cargando conversación...</div>;
  }

  if (!conversation) {
    return <div>Conversación no encontrada</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{conversation.customer.name}</h1>
        <p className="text-muted-foreground">{conversation.customer.phoneNumber}</p>
      </div>

      {/* Tickets */}
      {conversation.tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conversation.tickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{ticket.number}</span>
                    <span className="ml-2 text-sm text-muted-foreground">{ticket.category}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    ticket.status === 'CLOSED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Sessions */}
      {conversation.callSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Llamadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conversation.callSessions.map((call) => (
                <div key={call.id} className="p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">
                      {new Date(call.startedAt).toLocaleString()}
                      {call.duration && ` • ${Math.floor(call.duration / 60)} min`}
                    </span>
                  </div>
                  {call.summary && (
                    <p className="mt-2 text-sm text-muted-foreground">{call.summary}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Mensajes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {conversation.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.direction === 'OUTBOUND'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.channel === 'WHATSAPP' ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : (
                      <Phone className="w-4 h-4" />
                    )}
                    <span className="text-xs opacity-70">
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p>{message.text || '(Sin texto)'}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reply Section */}
      <Card>
        <CardHeader>
          <CardTitle>Responder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className="w-full p-3 border rounded-md min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button onClick={sendMessage} disabled={sending || !replyText.trim()}>
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Enviando...' : 'Enviar'}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  // Trigger triage
                  try {
                    const lastMessage = conversation.messages[conversation.messages.length - 1];
                    if (lastMessage) {
                      const triage = await apiRequest(`/ai/triage`, {
                        method: 'POST',
                        body: JSON.stringify({
                          conversationId: id,
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
                }}
              >
                Sugerir Respuesta (IA)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
