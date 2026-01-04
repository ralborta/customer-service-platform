'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotificationsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Notificaciones Proactivas</h1>
        <p className="text-muted-foreground">Scheduling stub (MVP - sin envío real aún)</p>
      </div>

      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>El sistema de notificaciones proactivas está en desarrollo.</p>
          <p className="text-sm mt-2">El worker procesa jobs de notificaciones programadas (stub mode).</p>
        </CardContent>
      </Card>
    </div>
  );
}
