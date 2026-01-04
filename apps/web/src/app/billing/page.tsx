'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/utils';

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  customer: { name: string };
  createdAt: string;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    try {
      const data = await apiRequest<Invoice[]>('/billing/invoices');
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Cargando facturas...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Facturación</h1>
        <p className="text-muted-foreground">Gestión de facturas (MVP - Mock)</p>
      </div>

      <div className="space-y-4">
        {invoices.map((invoice) => (
          <Card key={invoice.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{invoice.number}</CardTitle>
                  <p className="text-sm text-muted-foreground">{invoice.customer.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {invoice.currency} {invoice.amount.toFixed(2)}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {invoice.dueDate && (
                <p className="text-sm text-muted-foreground">
                  Vence: {new Date(invoice.dueDate).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {invoices.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay facturas
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
