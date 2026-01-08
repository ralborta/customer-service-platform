'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiRequest<{ token: string; user: unknown }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('token', response.token);
      router.push('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesión';
      console.error('❌ Login error:', err);
      
      // Mensaje más específico según el error
      if (errorMessage.includes('405') || errorMessage.includes('Method Not Allowed')) {
        setError('Error 405: La URL del API está mal configurada. Verifica NEXT_PUBLIC_API_URL en Vercel.');
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        setError('Error 404: El API no está accesible. Verifica que el API esté corriendo en Railway.');
      } else if (errorMessage.includes('No se pudo conectar')) {
        setError('No se puede conectar al API. Verifica NEXT_PUBLIC_API_URL en Vercel.');
      } else if (errorMessage.includes('401') || errorMessage.includes('Invalid credentials')) {
        setError('Credenciales incorrectas. Usa: agent@demo.com / admin123');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Iniciar Sesión</CardTitle>
          <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Demo: agent@demo.com / admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
