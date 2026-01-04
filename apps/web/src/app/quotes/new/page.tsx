'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
}

export default function NewQuotePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load customers (simplified - in real app, fetch from API)
    setCustomers([{ id: '1', name: 'Cliente Demo' }]);
  }, []);

  function addItem() {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: string | number) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return;

    setLoading(true);
    try {
      await apiRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          items: items.filter(item => item.description.trim() !== ''),
          notes: notes || undefined
        }),
      });
      router.push('/quotes');
    } catch (error) {
      console.error('Error creating quote:', error);
    } finally {
      setLoading(false);
    }
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Nueva Cotización</h1>
        <p className="text-muted-foreground">Crear cotización (MVP - Mock)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Cotización</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="customer" className="block text-sm font-medium mb-1">
                Cliente
              </label>
              <select
                id="customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Seleccionar cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Items</label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  Agregar Item
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-md"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Cantidad"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border rounded-md"
                      min="0"
                      step="0.01"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Precio unitario"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-2 border rounded-md"
                      min="0"
                      step="0.01"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-right font-bold">
                Total: ${total.toFixed(2)}
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notas
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-md min-h-[100px]"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Cotización'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
