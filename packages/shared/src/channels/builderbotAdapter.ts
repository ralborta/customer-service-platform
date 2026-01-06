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
  private apiKey: string;
  private botId?: string;
  private projectId?: string;

  constructor() {
    this.apiUrl = process.env.BUILDERBOT_API_URL || 'https://api.builderbot.cloud';
    this.apiKey = process.env.BUILDERBOT_API_KEY || '';
    this.botId = process.env.BUILDERBOT_BOT_ID;
    // Project ID puede venir de BUILDERBOT_PROJECT_ID o BUILDERBOT_BOT_ID (compatibilidad)
    this.projectId = process.env.BUILDERBOT_PROJECT_ID || process.env.BUILDERBOT_BOT_ID;
  }

  async sendText(
    toPhone: string,
    text: string,
    opts?: BuilderbotMessageOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Verificar que API key esté configurado
    if (!this.apiKey || this.apiKey === '') {
      console.log('[BUILDERBOT] API Key no configurado, usando mock');
      return { 
        success: false, 
        error: 'BUILDERBOT_API_KEY no está configurado. Verifica las variables de entorno en Railway.' 
      };
    }

    try {
      // Preparar headers - Builderbot puede requerir diferentes formatos
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Builderbot requiere Project ID como token de autorización
      // El error "Access Project Middleware: Unauthorized: Token is missing" indica que el Authorization debe ser el projectId
      if (this.projectId) {
        // Project ID como Bearer token (requerido por Builderbot)
        headers['Authorization'] = `Bearer ${this.projectId}`;
        // También como header X-Project-Id (por si acaso)
        headers['X-Project-Id'] = this.projectId;
      } else if (this.apiKey) {
        // Fallback: usar API key si no hay projectId
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // API Key como header adicional (si está disponible y diferente del projectId)
      if (this.apiKey && this.apiKey !== this.projectId) {
        headers['X-API-Key'] = this.apiKey;
      }

      // Bot ID si está disponible (separado del projectId)
      if (this.botId && this.botId !== this.projectId) {
        headers['X-Bot-Id'] = this.botId;
      }

      // Preparar body
      const body: Record<string, unknown> = {
        to: toPhone,
        text,
      };

      // Agregar projectId al body si está disponible (algunos APIs lo requieren así)
      if (this.projectId) {
        body.projectId = this.projectId;
      }

      if (opts?.buttons) {
        body.buttons = opts.buttons;
      }

      if (opts?.metadata) {
        body.metadata = opts.metadata;
      }

      console.log('[BUILDERBOT] Enviando mensaje:', {
        url: `${this.apiUrl}/v1/messages`,
        headers: Object.keys(headers),
        hasApiKey: !!this.apiKey,
        hasProjectId: !!this.projectId,
        hasBotId: !!this.botId,
        to: toPhone,
        textLength: text.length
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
          headers: Object.fromEntries(response.headers.entries()),
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
