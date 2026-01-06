import type { MessageDirection } from '../types';

export interface BuilderbotMessageOptions {
  buttons?: Array<{ id: string; title: string }>;
  metadata?: Record<string, unknown>;
}

export interface BuilderbotAdapter {
  sendText(
    toPhone: string,
    text: string,
    opts?: BuilderbotMessageOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendButtons(
    toPhone: string,
    text: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

class BuilderbotAdapterImpl implements BuilderbotAdapter {
  private apiUrl: string;
  private projectId: string;

  constructor() {
    this.apiUrl = process.env.BUILDERBOT_API_URL || 'https://api.builderbot.cloud';
    // BUILDERBOT_BOT_ID es el Project ID que se usa como token de autorización
    this.projectId = process.env.BUILDERBOT_BOT_ID || process.env.BUILDERBOT_PROJECT_ID || '';
  }

  async sendText(
    toPhone: string,
    text: string,
    opts?: BuilderbotMessageOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Verificar que BUILDERBOT_BOT_ID esté configurado (es el Project ID que se usa como token)
    if (!this.projectId || this.projectId === '') {
      console.log('[BUILDERBOT] BUILDERBOT_BOT_ID no configurado');
      return { 
        success: false, 
        error: 'BUILDERBOT_BOT_ID no está configurado. Verifica las variables de entorno en Railway.' 
      };
    }

    try {
      // Builderbot puede requerir el token en diferentes formatos
      // El error "Token is missing" sugiere que el middleware busca el token de forma específica
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Intentar múltiples formatos de Authorization:
      // 1. Token directo sin "Bearer" (algunos APIs lo requieren así)
      headers['Authorization'] = this.projectId;
      
      // 2. También intentar con Bearer (por si acaso)
      // headers['Authorization'] = `Bearer ${this.projectId}`;
      
      // 3. Headers adicionales que algunos APIs requieren
      headers['X-Project-Id'] = this.projectId;
      headers['X-Token'] = this.projectId;

      // Body - Incluir token en múltiples campos por si Builderbot lo busca en diferentes lugares
      const body: Record<string, unknown> = {
        to: toPhone,
        text,
        projectId: this.projectId,
        token: this.projectId, // Algunos APIs buscan "token" en lugar de "projectId"
      };

      if (opts?.buttons) {
        body.buttons = opts.buttons;
      }

      if (opts?.metadata) {
        body.metadata = opts.metadata;
      }

      // Logging detallado para debugging
      console.log('[BUILDERBOT] Enviando mensaje:', {
        url: `${this.apiUrl}/v1/messages`,
        projectId: this.projectId,
        projectIdLength: this.projectId?.length || 0,
        hasProjectId: !!this.projectId,
        headers: {
          'Content-Type': headers['Content-Type'],
          'Authorization': headers['Authorization']?.substring(0, 50) + '...' // Solo primeros 50 chars por seguridad
        },
        body: {
          to: toPhone,
          textLength: text.length,
          hasProjectId: !!body.projectId
        }
      });

      const response = await fetch(`${this.apiUrl}/v1/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('[BUILDERBOT] Error response:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });
        return { success: false, error: responseText };
      }

      let data: { messageId?: string; id?: string };
      try {
        data = JSON.parse(responseText) as { messageId?: string; id?: string };
      } catch {
        // Si no es JSON, usar el texto como messageId
        data = { messageId: responseText };
      }

      console.log('[BUILDERBOT] Mensaje enviado exitosamente:', data);
      return { success: true, messageId: data.messageId || data.id };
    } catch (error) {
      console.error('[BUILDERBOT] Error al enviar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendButtons(
    toPhone: string,
    text: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendText(toPhone, text, { buttons });
  }
}

export const builderbotAdapter = new BuilderbotAdapterImpl();
