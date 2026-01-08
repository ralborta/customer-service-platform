'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Verificar token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Si estamos en la página de login, permitir acceso
    if (pathname === '/login') {
      setIsAuthenticated(true);
      return;
    }

    // Si no hay token y no estamos en login, redirigir
    if (!token) {
      router.push('/login');
      return;
    }

    setIsAuthenticated(true);
  }, [pathname, router]);

  // Mostrar loading mientras verifica
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">Cargando...</div>
        </div>
      </div>
    );
  }

  // Si no está autenticado y no es login, no mostrar nada (ya redirigió)
  if (!isAuthenticated && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
