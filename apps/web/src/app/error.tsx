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
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-2xl font-bold">Ocurrió un error</h2>
        <p className="text-muted-foreground">
          Algo salió mal. Por favor, intenta nuevamente.
        </p>
        <Button onClick={() => reset()}>Reintentar</Button>
      </div>
    </div>
  );
}
