'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/utils';

interface EventLog {
  id: string;
  source: string;
  type: string;
  status: string;
  error: string | null;
  retryCount: number;
  createdAt: string;
  processedAt: string | null;
}

export default function ObservabilityPage() {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: This endpoint doesn't exist yet in the API, but the structure is ready
    // For MVP, we'll show a placeholder
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Cargando eventos...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Observabilidad</h1>
        <p className="text-muted-foreground">Event log y auditoría</p>
      </div>

      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>La visualización de eventos estará disponible próximamente.</p>
          <p className="text-sm mt-2">Los eventos se registran en la base de datos (EventLog).</p>
        </CardContent>
      </Card>
    </div>
  );
}
