'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/utils';

interface TicketEvent {
  id: string;
  type: string;
  data: unknown;
  createdAt: string;
}

interface Ticket {
  id: string;
  number: string;
  status: string;
  category: string;
  priority: string;
  title: string | null;
  summary: string | null;
  conversation: {
    id: string;
    customer: { name: string; phoneNumber: string | null };
    messages: Array<{ text: string | null; createdAt: string }>;
  } | null;
  assignedTo: { name: string } | null;
  events: TicketEvent[];
  createdAt: string;
}

export default function TicketPage() {
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTicket();
  }, [id]);

  async function loadTicket() {
    try {
      const data = await apiRequest<Ticket>(`/tickets/${id}`);
      setTicket(data);
    } catch (error) {
      console.error('Error loading ticket:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: string) {
    try {
      await apiRequest(`/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadTicket();
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  }

  if (loading) {
    return <div>Cargando ticket...</div>;
  }

  if (!ticket) {
    return <div>Ticket no encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{ticket.number}</h1>
        <p className="text-muted-foreground">{ticket.title || ticket.category}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-medium">Estado: </span>
              <span className={`px-2 py-1 rounded text-xs ${
                ticket.status === 'CLOSED' ? 'bg-green-100 text-green-800' :
                ticket.status === 'RESOLVED' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {ticket.status}
              </span>
            </div>
            <div>
              <span className="font-medium">Prioridad: </span>
              <span>{ticket.priority}</span>
            </div>
            <div>
              <span className="font-medium">Categoría: </span>
              <span>{ticket.category}</span>
            </div>
            {ticket.assignedTo && (
              <div>
                <span className="font-medium">Asignado a: </span>
                <span>{ticket.assignedTo.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={() => updateStatus('IN_PROGRESS')}
              disabled={ticket.status === 'IN_PROGRESS'}
              className="w-full"
            >
              Marcar en Progreso
            </Button>
            <Button
              onClick={() => updateStatus('RESOLVED')}
              disabled={ticket.status === 'RESOLVED'}
              variant="outline"
              className="w-full"
            >
              Resolver
            </Button>
            <Button
              onClick={() => updateStatus('CLOSED')}
              disabled={ticket.status === 'CLOSED'}
              variant="outline"
              className="w-full"
            >
              Cerrar
            </Button>
          </CardContent>
        </Card>
      </div>

      {ticket.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{ticket.summary}</p>
          </CardContent>
        </Card>
      )}

      {ticket.conversation && (
        <Card>
          <CardHeader>
            <CardTitle>Conversación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ticket.conversation.messages.map((msg, idx) => (
                <div key={idx} className="p-2 border rounded text-sm">
                  <p>{msg.text || '(Sin texto)'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ticket.events.map((event) => (
              <div key={event.id} className="p-2 border rounded text-sm">
                <div className="font-medium">{event.type}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
