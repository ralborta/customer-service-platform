import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // Construir URL completa
  const url = `${API_URL}${endpoint}`;
  
  // Log para debug (solo en desarrollo)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('🌐 API Request:', {
      url,
      endpoint,
      apiUrl: API_URL,
      hasToken: !!token
    });
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
