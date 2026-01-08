'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from './dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/utils';
import { 
  Zap, Search, Bell, User, Menu, 
  Ticket, Clock, Package, FileText, 
  TrendingUp, Camera, Truck, Send,
  Mic, MessageSquare, ArrowRight,
  AlertCircle, CheckCircle2, XCircle, ChevronDown
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  tickets: {
    open: number;
    inRisk: number;
    avgFirstResponse: string; // "2m 45s"
    avgFirstResponseChange: number; // +15%
  };
  trackings: {
    withIncident: number;
  };
  invoices: {
    pending: number;
  };
  topReasons: Array<{
    reason: string;
    percentage: number;
    trend: 'up' | 'down';
  }>;
  csat: {
    responses: number;
    percentage: number;
    average: number;
  };
}

interface UrgentWorkItem {
  id: string;
  customer: string;
  phoneNumber: string;
  reason: string;
  waiting: string; // "2 h", "12 h", etc.
  sla: string; // "9m 27s"
  slaStatus: 'ok' | 'risk' | 'overdue';
  channel: string;
}

interface InsightItem {
  id: string;
  label: string;
  value: string;
  link?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [urgentWork, setUrgentWork] = useState<UrgentWorkItem[]>([]);
  const [trackingDelays, setTrackingDelays] = useState<InsightItem[]>([]);
  const [topProducts, setTopProducts] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month'>('today');

  useEffect(() => {
    loadDashboardData();
  }, [dateFilter]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      
      const ticketsData = await apiRequest<any[]>('/tickets');
      const conversationsData = await apiRequest<any[]>('/conversations');
      
      const openTickets = ticketsData.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
      const inRiskTickets = 5; // TODO: calcular basado en SLA real
      
      // Urgentes para cola de trabajo
      const urgentList = ticketsData
        .filter(t => t.priority === 'URGENT' && (t.status === 'OPEN' || t.status === 'IN_PROGRESS'))
        .slice(0, 10)
        .map((t, idx) => ({
          id: t.id,
          customer: t.customer?.name || `Cliente ${t.customer?.phoneNumber || 'Sin teléfono'}`,
          phoneNumber: t.customer?.phoneNumber || '',
          reason: t.category || 'General',
          waiting: getWaitingTime(t.createdAt),
          sla: calculateSLA(t.createdAt),
          slaStatus: idx < 2 ? 'risk' as const : 'ok' as const,
          channel: t.channel || 'WHATSAPP'
        }));

      setStats({
        tickets: {
          open: openTickets || 28,
          inRisk: inRiskTickets,
          avgFirstResponse: '2m 45s',
          avgFirstResponseChange: 15
        },
        trackings: {
          withIncident: 16
        },
        invoices: {
          pending: 4
        },
        topReasons: [
          { reason: 'Demora en envío', percentage: 38, trend: 'up' },
          { reason: 'Pedido incorrecto', percentage: 38, trend: 'up' },
          { reason: 'Producto dañado', percentage: 28, trend: 'up' },
          { reason: 'Demora en entrega', percentage: 16, trend: 'up' }
        ],
        csat: {
          responses: 385,
          percentage: 67,
          average: 4.2
        }
      });
      
      setUrgentWork(urgentList);
      
      // Mock data para insights
      setTrackingDelays([
        { id: '1', label: '6290333770', value: 'It ensFlex', link: 'TransFlex' },
        { id: '2', label: 'Distribución Central', value: 'TransFlex' }
      ]);
      
      setTopProducts([
        { id: '1', label: 'Garnsuing Gurraan Lisssa', value: '' }
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  function getWaitingTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / 3600000);
    return `${diffHours} h`;
  }

  function calculateSLA(dateString: string): string {
    // Mock SLA calculation
    const minutes = Math.floor(Math.random() * 10);
    const seconds = Math.floor(Math.random() * 60);
    return `${minutes}m ${seconds}s`;
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
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Top Bar */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">Home</span>
            </div>
            
            {/* Buscador central */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar guía, pedido, factura, ticket o cliente..."
                  className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-lg text-base bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Right side icons */}
            <div className="flex items-center gap-4">
              <Bell className="w-5 h-5 text-gray-600 cursor-pointer hover:text-gray-900" />
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                  C
                </div>
                <span className="text-sm font-medium text-gray-700">Customer</span>
              </div>
              <span className="text-sm font-medium text-gray-700">Centro</span>
              <button className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                +1
              </button>
              <Menu className="w-5 h-5 text-gray-600 cursor-pointer hover:text-gray-900" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Filtros de fecha */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateFilter === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateFilter === '7days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${
                dateFilter === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Este mes
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* KPIs Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Reclamos abiertos */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <div className="w-full h-full bg-blue-600 rounded-full -mr-16 -mt-16"></div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Reclamos abiertos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900 mb-2">{stats?.tickets.open || 28}</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-orange-600 font-medium">
                    {stats?.tickets.inRisk || 5} en riesgo de SLA
                  </span>
                  <Link href="/tickets" className="text-blue-600 hover:text-blue-700">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Tiempo promedio primera respuesta */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <TrendingUp className="w-full h-full text-blue-600 -mr-16 -mt-16" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tiempo promedio primera respuesta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900 mb-2">{stats?.tickets.avgFirstResponse || '2m 45s'}</div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">+{stats?.tickets.avgFirstResponseChange || 15}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Trackings con incidencia */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <Truck className="w-full h-full text-blue-600 -mr-16 -mt-16" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Trackings con incidencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900">{stats?.trackings.withIncident || 16}</div>
              </CardContent>
            </Card>

            {/* Facturas pendientes */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <FileText className="w-full h-full text-blue-600 -mr-16 -mt-16" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Facturas pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900">{stats?.invoices.pending || 4}</div>
              </CardContent>
            </Card>
          </div>

          {/* Segunda fila de cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Principales motivos de reclamo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Principales motivos de reclamo (Top 5)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.topReasons.map((reason, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{reason.reason}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-gray-900">{reason.percentage}%</span>
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${reason.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CSAT Card 1 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">CSAT</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.csat.percentage || 67}%</div>
                  <div className="text-sm text-gray-600">{stats?.csat.responses || 385} respuestas</div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{ width: `${stats?.csat.percentage || 67}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto mb-1" />
                    <div>Excelente</div>
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 mx-auto mb-1"></div>
                    <div>Bueno</div>
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 mx-auto mb-1"></div>
                    <div>Regular</div>
                  </div>
                  <div className="text-center">
                    <XCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
                    <div>Malo</div>
                  </div>
                </div>
                <select className="w-full mt-4 px-3 py-2 border border-gray-200 rounded-md text-sm">
                  <option>Buscar</option>
                </select>
              </CardContent>
            </Card>

            {/* CSAT Card 2 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">CSAT</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-gray-900 mb-1">{stats?.csat.average || 4.2}</div>
                  <div className="text-sm text-gray-600">{stats?.csat.responses || 385} respuestas</div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{ width: `${((stats?.csat.average || 4.2) / 5) * 100}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  <span className="ml-2">15ed tonmorsera 9138-3725</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Acciones rápidas horizontales */}
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/tickets/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              <Camera className="w-4 h-4" />
              Crear reclamo
            </Link>
            <Link
              href="/tracking"
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              <Truck className="w-4 h-4" />
              Buscar tracking
            </Link>
            <Link
              href="/quotes"
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Buscar factura
            </Link>
            <Link
              href="/knowledge"
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              <Send className="w-4 h-4" />
              Enviar
            </Link>
          </div>

          {/* Bottom section: Cola de trabajo + Accesos rápidos + Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cola de trabajo */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Cola de trabajo</CardTitle>
                  <Link href="/tickets" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    Urgentes ahora <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {urgentWork.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No hay reclamos urgentes
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Cliente & Motivo</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Esperando</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">SLA</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Canal</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {urgentWork.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900">{item.customer}</div>
                              <div className="text-sm text-gray-600">{item.reason}</div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{item.waiting}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                                item.slaStatus === 'risk' || item.slaStatus === 'overdue'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {item.sla}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{item.channel}</td>
                            <td className="py-3 px-4">
                              <Link
                                href={`/tickets/${item.id}`}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                Tomar
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Accesos rápidos + Insights */}
            <div className="space-y-6">
              {/* Accesos rápidos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Accesos rápidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link
                      href="/tickets/new"
                      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <Mic className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Crear reclamo</span>
                    </Link>
                    <Link
                      href="/tracking"
                      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <Search className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Buscar tracking</span>
                    </Link>
                    <Link
                      href="/quotes"
                      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Buscar factura</span>
                    </Link>
                    <Link
                      href="/knowledge"
                      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <Send className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Enviar información</span>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-2">Principales motivos de reclamo (Top 5)</div>
                      <div className="space-y-2">
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <div className="font-medium">6290333770</div>
                          <div>Cliente Perez</div>
                          <div>O hera decar</div>
                          <div className="text-red-600">3 días de demora</div>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>Nusero Centuea</span>
                        </div>
                        <div className="text-sm text-gray-600">Centre de nablo despad, lin.</div>
                        <div className="text-sm text-gray-600">Ultima riofas de buttelias</div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-sm font-semibold text-gray-700 mb-2">Tracking con más demoras (Top 5)</div>
                      <div className="space-y-2">
                        {trackingDelays.map((item) => (
                          <div key={item.id} className="text-sm text-gray-600 flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            <span>{item.label}</span>
                            {item.link && (
                              <Link href="#" className="text-blue-600 hover:underline">
                                {item.link}
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Productos con más reclamos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Productos con más reclamos (Top 5)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topProducts.map((product) => (
                      <div key={product.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <Package className="w-4 h-4 text-gray-500" />
                        <span>{product.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
