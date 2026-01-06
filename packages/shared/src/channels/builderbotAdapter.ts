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
    this.projectId = process.env.BUILDERBOT_PROJECT_ID;
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

      // Intentar diferentes formatos de autenticación
      // Formato 1: Bearer token (estándar)
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Formato 2: X-API-Key (alternativo)
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      // Project ID si está disponible
      if (this.projectId) {
        headers['X-Project-Id'] = this.projectId;
      }

      // Bot ID si está disponible
      if (this.botId) {
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
