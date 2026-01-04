'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/utils';

interface TrackingEvent {
  status: string;
  description: string | null;
  location: string | null;
  occurredAt: string;
}

interface TrackingStatus {
  trackingNumber: string;
  carrier: string | null;
  status: string;
  events: TrackingEvent[];
}

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState<TrackingStatus | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLookup() {
    if (!trackingNumber.trim()) return;

    setLoading(true);
    try {
      const data = await apiRequest<TrackingStatus>('/tracking/lookup', {
        method: 'POST',
        body: JSON.stringify({ trackingNumber, carrier: carrier || undefined }),
      });
      setTracking(data);
    } catch (error) {
      console.error('Error looking up tracking:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Track & Trace</h1>
        <p className="text-muted-foreground">Seguimiento de envíos</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Consultar Seguimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Número de tracking"
              className="flex-1 px-3 py-2 border rounded-md"
              onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
            />
            <input
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Transportista (opcional)"
              className="w-48 px-3 py-2 border rounded-md"
            />
            <Button onClick={handleLookup} disabled={loading || !trackingNumber.trim()}>
              {loading ? 'Consultando...' : 'Consultar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {tracking && (
        <Card>
          <CardHeader>
            <CardTitle>
              {tracking.trackingNumber}
              {tracking.carrier && ` - ${tracking.carrier}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <span className="font-medium">Estado: </span>
              <span className={`px-2 py-1 rounded text-xs ${
                tracking.status === 'delivered' ? 'bg-green-100 text-green-800' :
                tracking.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {tracking.status}
              </span>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium">Historial de eventos:</h3>
              {tracking.events.map((event, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <div className="font-medium">{event.status}</div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                    {event.location && (
                      <p className="text-xs text-muted-foreground">📍 {event.location}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(event.occurredAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
