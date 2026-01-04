import type { TrackingStatus, TrackingEvent } from '@customer-service/shared';

export interface TrackingProvider {
  getStatus(trackingNumber: string, carrier?: string): Promise<TrackingStatus>;
}

// Demo provider (simulated tracking)
class DemoTrackingProvider implements TrackingProvider {
  async getStatus(trackingNumber: string, carrier?: string): Promise<TrackingStatus> {
    // Simulate different statuses based on tracking number
    const statuses = ['pending', 'in_transit', 'out_for_delivery', 'delivered', 'exception'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    const now = new Date();
    const events: TrackingEvent[] = [
      {
        status: 'pending',
        description: 'Paquete registrado en el sistema',
        occurredAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        location: 'Centro de distribución'
      },
      {
        status: 'in_transit',
        description: 'En tránsito hacia destino',
        occurredAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        location: 'En ruta'
      }
    ];

    if (randomStatus === 'out_for_delivery' || randomStatus === 'delivered') {
      events.push({
        status: 'out_for_delivery',
        description: 'Fuera para entrega',
        occurredAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        location: 'Oficina local'
      });
    }

    if (randomStatus === 'delivered') {
      events.push({
        status: 'delivered',
        description: 'Entregado',
        occurredAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
        location: 'Dirección de destino'
      });
    }

    return {
      trackingNumber,
      carrier: carrier || 'Demo Carrier',
      status: randomStatus,
      events: events.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
    };
  }
}

// Real provider interface (for AfterShip, 17Track, etc.)
class RealTrackingProvider implements TrackingProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async getStatus(trackingNumber: string, carrier?: string): Promise<TrackingStatus> {
    // Implementation would call real API
    // This is a stub
    throw new Error('Real tracking provider not implemented yet');
  }
}

export function getTrackingProvider(): TrackingProvider {
  const providerType = process.env.TRACKING_PROVIDER || 'demo';
  
  if (providerType === 'demo') {
    return new DemoTrackingProvider();
  }
  
  // For real providers, initialize with API keys
  const apiKey = process.env.TRACKING_API_KEY || '';
  const baseUrl = process.env.TRACKING_API_URL || '';
  return new RealTrackingProvider(apiKey, baseUrl);
}
