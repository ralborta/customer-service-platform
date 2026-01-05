import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Obtener API_URL con validación
function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  // Validar que la URL sea válida
  if (typeof window !== 'undefined') {
    try {
      new URL(url);
    } catch (e) {
      console.error('❌ NEXT_PUBLIC_API_URL no es una URL válida:', url);
      console.error('💡 Configura NEXT_PUBLIC_API_URL en Vercel con la URL completa del API (ej: https://tu-api.railway.app)');
    }
  }
  
  // Asegurar que termine sin slash
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export const API_URL = getApiUrl();

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // Construir URL completa
  const url = `${API_URL}${endpoint}`;
  
  // Log para debug (siempre en desarrollo, o si hay error)
  if (typeof window !== 'undefined') {
    console.log('🌐 API Request:', {
      url,
      endpoint,
      apiUrl: API_URL,
      hasToken: !!token,
      env: process.env.NODE_ENV
    });
    
    // Advertencia si API_URL es localhost en producción
    if (API_URL.includes('localhost') && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      console.error('⚠️ ADVERTENCIA: NEXT_PUBLIC_API_URL apunta a localhost pero estás en producción');
      console.error('💡 Configura NEXT_PUBLIC_API_URL en Vercel con la URL de Railway');
    }
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      
      // Log detallado del error
      console.error('❌ API Error:', {
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    // Mejorar mensajes de error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ Network Error:', {
        url,
        apiUrl: API_URL,
        message: 'No se pudo conectar al API. Verifica que NEXT_PUBLIC_API_URL esté configurado correctamente.'
      });
      throw new Error(`No se pudo conectar al API. Verifica que NEXT_PUBLIC_API_URL esté configurado en Vercel. URL actual: ${API_URL}`);
    }
    throw error;
  }
}
