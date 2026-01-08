'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from './dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/utils';
import { Ticket, Clock, AlertTriangle, Package, FileText, TrendingUp, ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  tickets: {
    open: number;
    inRisk: number;
    avgFirstResponse: number;
  };
  trackings: {
    withIncident: number;
  };
  invoices: {
    disputed: number;
    pending: number;
  };
  csat?: number;
}

interface UrgentTicket {
  id: string;
  number: string;
  category: string;
  customer: { name: string; phoneNumber: string | null };
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  slaStatus?: 'ok' | 'risk' | 'overdue';
  channel: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [urgentTickets, setUrgentTickets] = useState<UrgentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      
      // Cargar estadísticas (por ahora mock, luego implementar endpoint)
      const ticketsData = await apiRequest<any[]>('/tickets');
      const conversationsData = await apiRequest<any[]>('/conversations');
      
      // Calcular stats básicos
      const openTickets = ticketsData.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
      const urgentTicketsList = ticketsData
        .filter(t => t.priority === 'URGENT' && (t.status === 'OPEN' || t.status === 'IN_PROGRESS'))
        .slice(0, 10)
        .map(t => ({
          id: t.id,
          number: t.number || `#${t.id.substring(0, 8)}`,
          category: t.category || 'General',
          customer: t.customer || { name: 'Cliente', phoneNumber: null },
          status: t.status,
          priority: t.priority,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          channel: t.channel || 'WHATSAPP'
        }));

      setStats({
        tickets: {
          open: openTickets,
          inRisk: 0, // TODO: calcular basado en SLA
          avgFirstResponse: 0 // TODO: calcular desde mensajes
        },
        trackings: {
          withIncident: 0 // TODO: implementar
        },
        invoices: {
          disputed: 0, // TODO: implementar
          pending: 0 // TODO: implementar
        }
      });
      
      setUrgentTickets(urgentTicketsList);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="text-center">Cargando dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Vista general de la operación</p>
        </div>

        {/* Buscador global */}
        <div className="mb-6">
          <div className="relative max-w-2xl">
            <input
              type="text"
              placeholder="Buscar por guía / pedido / factura / ticket / teléfono..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
          <div className="flex gap-2 mt-3">
            <button className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Hoy
            </button>
            <button className="px-4 py-1.5 text-sm bg-white text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
              7 días
            </button>
            <button className="px-4 py-1.5 text-sm bg-white text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
              Este mes
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Reclamos Abiertos</CardTitle>
              <Ticket className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats?.tickets.open || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Activos en este momento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">En Riesgo SLA</CardTitle>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats?.tickets.inRisk || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Requieren atención urgente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tiempo Medio Respuesta</CardTitle>
              <Clock className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {stats?.tickets.avgFirstResponse ? `${stats.tickets.avgFirstResponse}m` : '--'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Primera respuesta</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Trackings con Incidencia</CardTitle>
              <Package className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats?.trackings.withIncident || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Requieren seguimiento</p>
            </CardContent>
          </Card>
        </div>

        {/* Cola de trabajo */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">Cola de Trabajo - Urgentes Ahora</CardTitle>
              <Link href="/tickets" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Ver todos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {urgentTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay reclamos urgentes en este momento
              </div>
            ) : (
              <div className="space-y-3">
                {urgentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-gray-900">{ticket.number}</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                          {ticket.priority}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          {ticket.category}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {ticket.customer.name} • {ticket.customer.phoneNumber || 'Sin teléfono'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Canal: {ticket.channel} • Actualizado hace {getTimeAgo(ticket.updatedAt)}
                      </div>
                    </div>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Tomar
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Top 5 Motivos de Reclamo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 text-sm">
                Próximamente: Análisis de motivos más frecuentes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Productos/Zonas con Problemas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 text-sm">
                Próximamente: Análisis de productos y zonas
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/tickets/new"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Crear Reclamo
            </Link>
            <Link
              href="/tracking"
              className="px-4 py-2 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Buscar Tracking
            </Link>
            <Link
              href="/quotes"
              className="px-4 py-2 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Buscar Factura
            </Link>
            <Link
              href="/knowledge"
              className="px-4 py-2 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Enviar Info
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}
