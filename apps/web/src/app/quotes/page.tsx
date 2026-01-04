'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/utils';

interface Quote {
  id: string;
  number: string;
  status: string;
  customer: { name: string };
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  createdAt: string;
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotes();
  }, []);

  async function loadQuotes() {
    try {
      const data = await apiRequest<Quote[]>('/quotes');
      setQuotes(data);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Cargando cotizaciones...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cotizaciones</h1>
          <p className="text-muted-foreground">Gestión de cotizaciones (MVP - Mock)</p>
        </div>
        <Link href="/quotes/new">
          <Button>Nueva Cotización</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {quotes.map((quote) => {
          const total = quote.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
          return (
            <Card key={quote.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{quote.number}</CardTitle>
                    <p className="text-sm text-muted-foreground">{quote.customer.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">${total.toFixed(2)}</div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {quote.status}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {quote.items.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      {item.description} - {item.quantity} x ${item.unitPrice.toFixed(2)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {quotes.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay cotizaciones
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
