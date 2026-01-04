'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-2xl font-bold">Algo salió mal</h2>
            <p className="text-muted-foreground">
              Error global. Por favor, intenta nuevamente.
            </p>
            <Button onClick={() => reset()}>Reintentar</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
