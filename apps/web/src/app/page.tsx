'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from './dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/utils';
import { 
  Zap, Search, Bell, User, Menu, Globe,
  Ticket, Clock, Package, FileText, 
  TrendingUp, Camera, Truck, Send,
  Mic, MessageSquare, ArrowRight,
  AlertCircle, CheckCircle2, XCircle, ChevronDown,
  Info, Plus, ArrowDown, Phone, Play, Circle, Square, Sun, Pen, Ruler,
  AlertTriangle, HelpCircle, DollarSign, FileSearch
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  tickets: {
    open: number;
    inRisk: number;
    avgFirstResponse: string;
    avgFirstResponseChange: number;
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
    color?: string;
  }>;
  csat: {
    responses: number;
    percentage: number;
    average: number;
  };
}

interface UrgentWorkItem {
  id: string;
  conversationId: string;
  customer: string;
  phoneNumber: string;
  reason: string;
  waiting: string;
  sla: string;
  slaBadge: string; // "-1", "-15s", "+0s", "Ok"
  slaStatus: 'ok' | 'risk' | 'overdue';
  channel: string;
  avatarInitials: string;
  type: 'RECLAMO' | 'INFO' | 'TRACKING' | 'FACTURACION' | 'COTIZACION' | 'OTRO';
  lastMessage?: string;
  assignedTo?: string | null;
}

interface InsightItem {
  id: string;
  label: string;
  value: string;
  link?: string;
  icon?: string;
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
      const inRiskTickets = 5;
      
      // Cargar TODAS las conversaciones de WhatsApp (sin filtros)
      const conversationsWithTickets = await Promise.all(
        conversationsData
          .filter(c => c.primaryChannel === 'WHATSAPP')
          .map(async (conv) => {
            // Obtener ticket asociado si existe
            const ticket = ticketsData.find(t => t.conversationId === conv.id);
            
            // Determinar tipo basado en ticket o último mensaje
            let type: 'RECLAMO' | 'INFO' | 'TRACKING' | 'FACTURACION' | 'COTIZACION' | 'OTRO' = 'OTRO';
            if (ticket?.category) {
              type = ticket.category as any;
            } else if (conv.messages && conv.messages.length > 0) {
              // Intentar obtener tipo del metadata del último mensaje
              try {
                const fullConv = await apiRequest<{
                  messages?: Array<{
                    metadata?: {
                      intent?: string;
                    };
                  }>;
                }>(`/conversations/${conv.id}`);
                const lastMessage = fullConv.messages?.[fullConv.messages.length - 1];
                if (lastMessage?.metadata?.intent) {
                  const intent = lastMessage.metadata.intent.toUpperCase();
                  if (['RECLAMO', 'INFO', 'TRACKING', 'FACTURACION', 'COTIZACION', 'OTRO'].includes(intent)) {
                    type = intent as any;
                  }
                }
              } catch (e) {
                // Si falla, usar OTRO
              }
            }
            
            const customerName = conv.customer?.name || `Cliente ${conv.customer?.phoneNumber || 'Sin teléfono'}`;
            const initials = customerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
            const lastMessageText = conv.messages?.[0]?.text || '';
            
            return {
              id: ticket?.id || conv.id,
              conversationId: conv.id,
              customer: customerName,
              phoneNumber: conv.customer?.phoneNumber || '',
              reason: ticket?.category || type || 'General',
              waiting: getWaitingTime(conv.updatedAt),
              sla: calculateSLA(conv.updatedAt),
              slaBadge: '', // Se calculará después
              slaStatus: (ticket?.priority === 'URGENT' || ticket?.priority === 'HIGH') ? 'risk' as const : 'ok' as const,
              channel: conv.primaryChannel || 'WHATSAPP',
              avatarInitials: initials,
              type: type,
              lastMessage: lastMessageText.substring(0, 50),
              assignedTo: conv.assignedTo?.name || ticket?.assignedTo?.name || null
            };
          })
      );
      
      // Ordenar por fecha de actualización (más recientes primero) y prioridad
      const urgentList = conversationsWithTickets
        .sort((a, b) => {
          // Primero por prioridad (risk primero)
          if (a.slaStatus === 'risk' && b.slaStatus !== 'risk') return -1;
          if (a.slaStatus !== 'risk' && b.slaStatus === 'risk') return 1;
          // Luego por fecha de actualización (más recientes primero)
          // Las conversaciones ya vienen ordenadas del API, pero podemos ordenar por waiting time
          return 0;
        })
        .map((item, idx) => ({
          ...item,
          slaBadge: idx < 3 ? (idx === 0 ? '-1' : idx === 1 ? '-15s' : '+0s') : 'Ok'
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
          { reason: 'Demora 4 mma áiso', percentage: 16, trend: 'up', color: 'green' },
          { reason: 'Demora en emmusto', percentage: 38, trend: 'up', color: 'yellow' },
          { reason: 'Pedido a reclamas', percentage: 38, trend: 'up', color: 'red' },
          { reason: 'Interventor:Qesalles', percentage: 28, trend: 'up', color: 'purple' }
        ],
        csat: {
          responses: 385,
          percentage: 67,
          average: 4.2
        }
      });
      
      setUrgentWork(urgentList);
      
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
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} d`;
    if (diffHours > 0) return `${diffHours} h`;
    const diffMins = Math.floor(diffMs / 60000);
    return `${diffMins} m`;
  }

  function calculateSLA(dateString: string): string {
    const minutes = Math.floor(Math.random() * 10);
    const seconds = Math.floor(Math.random() * 60);
    return `${minutes}m ${seconds}s`;
  }

  const getAvatarColor = (initials: string) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500'];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'RECLAMO':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'INFO':
        return <Info className="w-4 h-4 text-blue-600" />;
      case 'TRACKING':
        return <Truck className="w-4 h-4 text-green-600" />;
      case 'FACTURACION':
        return <DollarSign className="w-4 h-4 text-yellow-600" />;
      case 'COTIZACION':
        return <FileSearch className="w-4 h-4 text-purple-600" />;
      default:
        return <HelpCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'RECLAMO':
        return 'Reclamo';
      case 'INFO':
        return 'Información';
      case 'TRACKING':
        return 'Track & Trace';
      case 'FACTURACION':
        return 'Facturación';
      case 'COTIZACION':
        return 'Cotización';
      default:
        return 'Otro';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'RECLAMO':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'INFO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TRACKING':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FACTURACION':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COTIZACION':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
                <Globe className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Customer</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-gray-700">Centro</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
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
            <Card className="relative overflow-hidden bg-white">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <TrendingUp className="w-full h-full text-gray-400 -mr-16 -mt-16" />
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
            <Card className="relative overflow-hidden bg-white">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <TrendingUp className="w-full h-full text-gray-400 -mr-16 -mt-16" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tiempo promedio primera respuesta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900 mb-2">{stats?.tickets.avgFirstResponse || '2m 45s'}</div>
                <div className="flex items-center gap-1 text-sm text-orange-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">{stats?.tickets.avgFirstResponseChange || 15}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Trackings con incidencia */}
            <Card className="relative overflow-hidden bg-white">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <Truck className="w-full h-full text-gray-400 -mr-16 -mt-16" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Trackings con incidencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900">{stats?.trackings.withIncident || 16}</div>
              </CardContent>
            </Card>

            {/* Facturas pendientes */}
            <Card className="relative overflow-hidden bg-white">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <FileText className="w-full h-full text-gray-400 -mr-16 -mt-16" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Facturas pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900">{stats?.invoices.pending || 4}</div>
              </CardContent>
            </Card>
          </div>

          {/* Acciones rápidas horizontales - ANTES de la cola de trabajo */}
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
              <Search className="w-4 h-4" />
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
            <Card className="lg:col-span-2 bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Cola de mensajes</CardTitle>
                  <Link href="/inbox" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    Ver todos <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {urgentWork.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No hay mensajes de WhatsApp
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
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Tomar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {urgentWork.map((item, idx) => (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${getAvatarColor(item.avatarInitials)} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
                                  {item.avatarInitials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="font-medium text-sm text-gray-900 truncate">{item.customer}</div>
                                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border flex items-center gap-1 ${getTypeBadgeColor(item.type)}`}>
                                      {getTypeIcon(item.type)}
                                      {getTypeLabel(item.type)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                    {item.lastMessage || item.reason}
                                  </div>
                                  {item.assignedTo && (
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                      Asignado a: {item.assignedTo}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{item.waiting}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                                  item.slaStatus === 'risk' || item.slaStatus === 'overdue'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {item.sla}
                                </span>
                                <span className="text-xs text-gray-500">{item.slaBadge}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{item.channel}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/inbox?conversation=${item.conversationId}`}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                                >
                                  Tomar
                                </Link>
                                {idx === 0 && (
                                  <>
                                    <button className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors">
                                      <Info className="w-4 h-4" />
                                    </button>
                                    <button className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors">
                                      <Clock className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {idx === 1 && (
                                  <>
                                    <button className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors">
                                      <Info className="w-4 h-4" />
                                    </button>
                                    <button className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors">
                                      <Clock className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {idx === 2 && (
                                  <>
                                    <button className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors">
                                      <Plus className="w-4 h-4" />
                                    </button>
                                    <button className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors">
                                      <ArrowDown className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {idx >= 3 && (
                                  <>
                                    <button className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors">
                                      <MessageSquare className="w-4 h-4" />
                                    </button>
                                    <button className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors">
                                      <Phone className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
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
              <Card className="bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Accesos rápidos</CardTitle>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link
                      href="/tickets/new"
                      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Crear reclamo</span>
                    </Link>
                    <Link
                      href="/tracking"
                      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <Search className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Buscar tracking</span>
                    </Link>
                    <Link
                      href="/quotes"
                      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Buscar factura</span>
                    </Link>
                    <Link
                      href="/knowledge"
                      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <Send className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Enviar información</span>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Insights */}
              <Card className="bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Insights</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-gray-700">Principales motivos de reclamo</div>
                        <button className="text-xs text-blue-600 font-medium">Top 5</button>
                      </div>
                      <div className="space-y-2">
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <div className="font-medium">6290333770</div>
                          <div>Cliente Perez</div>
                          <div>O hera decar</div>
                          <div className="text-red-600">3 días de demora</div>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>Nusero Centuea /</span>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>Centre de nablo despad, lin.</span>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span>Ultima riofas de buttelias</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-gray-700">Tracking con más demoras</div>
                        <button className="text-xs text-blue-600 font-medium">Top 5</button>
                      </div>
                      <div className="space-y-2">
                        {trackingDelays.map((item) => (
                          <div key={item.id} className="text-sm text-gray-600 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>{item.label}</span>
                            {item.link && (
                              <Link href="#" className="text-blue-600 hover:underline flex items-center gap-1">
                                <Truck className="w-4 h-4" />
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
              <Card className="bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Productos con más reclamos</CardTitle>
                    <button className="text-xs text-blue-600 font-medium">Top 5</button>
                  </div>
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

          {/* Segunda fila: Motivos de reclamo y CSAT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Principales motivos de reclamo */}
            <Card className="bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Principales motivos de reclamo</CardTitle>
                  <button className="text-xs text-blue-600 font-medium">Top 5</button>
                </div>
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
                          className={`h-2 rounded-full ${
                            reason.color === 'green' ? 'bg-green-500' :
                            reason.color === 'yellow' ? 'bg-yellow-500' :
                            reason.color === 'red' ? 'bg-red-500' :
                            'bg-purple-500'
                          }`}
                          style={{ width: `${reason.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <select className="w-full mt-4 px-3 py-2 border border-gray-200 rounded-md text-sm">
                  <option>Buscar</option>
                </select>
              </CardContent>
            </Card>

            {/* CSAT Card 1 */}
            <Card className="bg-white">
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
                    <Play className="w-4 h-4 text-green-600 mx-auto mb-1" />
                    <div>Excelente</div>
                  </div>
                  <div className="text-center">
                    <Circle className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                    <div>O riniiso</div>
                  </div>
                  <div className="text-center">
                    <Square className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                    <div>En nasido</div>
                  </div>
                  <div className="text-center">
                    <Sun className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                    <div>En resountiar</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CSAT Card 2 */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-base font-semibold">CSAT</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-gray-900 mb-1">{stats?.csat.average || 4.2}</div>
                  <div className="text-sm text-gray-600">{stats?.csat.responses || 385} respuestas</div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-yellow-500 h-3 rounded-full"
                    style={{ width: `${((stats?.csat.average || 4.2) / 5) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mb-2">{'>'}{'>'} MA</div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Pen className="w-3 h-3" />
                  <Ruler className="w-3 h-3" />
                  <span>15ed tonmorsera 9138-37 25</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
