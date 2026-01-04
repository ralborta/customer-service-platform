'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SurveysPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Encuestas</h1>
        <p className="text-muted-foreground">CSAT y NPS (MVP simple)</p>
      </div>

      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Las encuestas se generan automáticamente al cerrar tickets.</p>
          <p className="text-sm mt-2">Visualización de respuestas próximamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
