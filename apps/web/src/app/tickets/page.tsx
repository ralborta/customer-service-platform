'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/utils';

interface Ticket {
  id: string;
  number: string;
  status: string;
  category: string;
  priority: string;
  title: string | null;
  conversation: { customer: { name: string } } | null;
  assignedTo: { name: string } | null;
  createdAt: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      const data = await apiRequest<Ticket[]>('/tickets');
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Cargando tickets...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Tickets</h1>
        <p className="text-muted-foreground">Gestión de casos y reclamos</p>
      </div>

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {ticket.number} - {ticket.title || ticket.category}
                    </CardTitle>
                    {ticket.conversation && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Cliente: {ticket.conversation.customer.name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      ticket.status === 'CLOSED' ? 'bg-green-100 text-green-800' :
                      ticket.status === 'RESOLVED' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {ticket.status}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      ticket.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                      ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Categoría: {ticket.category}</span>
                  {ticket.assignedTo && <span>Asignado a: {ticket.assignedTo.name}</span>}
                  <span>Creado: {new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {tickets.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay tickets
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
