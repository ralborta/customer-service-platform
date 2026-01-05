'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log detallado del error
    console.error('❌ Error Boundary capturado:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      name: error.name
    });
  }, [error]);

  // Extraer mensaje más útil
  const errorMessage = error.message || 'Error desconocido';
  const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('Network');
  const isApiError = errorMessage.includes('API') || errorMessage.includes('500') || errorMessage.includes('404');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md text-center space-y-4 bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-red-600">Ocurrió un error</h2>
        
        <div className="text-left space-y-2 bg-gray-100 p-4 rounded text-sm">
          <p className="font-semibold">Detalles del error:</p>
          <p className="text-red-600 break-words">{errorMessage}</p>
          
          {isNetworkError && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800">
                💡 Error de conexión. Verifica que NEXT_PUBLIC_API_URL esté configurado en Vercel.
              </p>
            </div>
          )}
          
          {isApiError && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800">
                💡 Error del API. Revisa los logs en Railway → API Service → Logs.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          <Button onClick={() => reset()} variant="default">
            Reintentar
          </Button>
          <Button 
            onClick={() => window.location.href = '/login'} 
            variant="outline"
          >
            Ir al Login
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          Abre la consola del navegador (F12) para más detalles técnicos.
        </p>
      </div>
    </div>
  );
}
