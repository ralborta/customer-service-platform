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
  private botId: string;
  private apiKey: string;

  constructor() {
    // Builderbot API v2 usa app.builderbot.cloud, no api.builderbot.cloud
    this.apiUrl = process.env.BUILDERBOT_API_URL || process.env.BUILDERBOT_BASE_URL || 'https://app.builderbot.cloud';
    this.botId = process.env.BUILDERBOT_BOT_ID || '';
    this.apiKey = process.env.BUILDERBOT_API_KEY || '';
  }

  async sendText(
    toPhone: string,
    text: string,
    opts?: BuilderbotMessageOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Verificar que BUILDERBOT_BOT_ID y BUILDERBOT_API_KEY estén configurados
    if (!this.botId || this.botId === '') {
      console.log('[BUILDERBOT] BUILDERBOT_BOT_ID no configurado');
      return { 
        success: false, 
        error: 'BUILDERBOT_BOT_ID no está configurado. Verifica las variables de entorno en Railway.' 
      };
    }

    if (!this.apiKey || this.apiKey === '') {
      console.log('[BUILDERBOT] BUILDERBOT_API_KEY no configurado');
      return { 
        success: false, 
        error: 'BUILDERBOT_API_KEY no está configurado. Verifica las variables de entorno en Railway.' 
      };
    }

    try {
      // Builderbot API v2 usa este formato (basado en el proyecto que funciona)
      // URL: https://app.builderbot.cloud/api/v2/{BOT_ID}/messages
      // Header: x-api-builderbot: {API_KEY}
      // Body: { messages: { content: text }, number: phone, checkIfExists: false }
      
      const url = `${this.apiUrl}/api/v2/${this.botId}/messages`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-builderbot': this.apiKey, // Este es el header correcto para Builderbot API v2
      };

      // Formato del body según Builderbot API v2
      const body: Record<string, unknown> = {
        messages: {
          content: text,
        },
        number: toPhone, // Número en formato internacional (ej: 5491112345678)
        checkIfExists: false,
      };

      // Agregar mediaUrl si se proporciona en metadata
      if (opts?.metadata && 'mediaUrl' in opts.metadata) {
        (body.messages as Record<string, unknown>).mediaUrl = opts.metadata.mediaUrl;
      }

      // Agregar buttons si se proporcionan
      if (opts?.buttons && opts.buttons.length > 0) {
        (body.messages as Record<string, unknown>).buttons = opts.buttons;
      }

      // Logging detallado para debugging - VERSIÓN API v2
      console.log('========================================');
      console.log('[BUILDERBOT API v2] NUEVA VERSIÓN - Enviando mensaje');
      console.log('========================================');
      console.log('[BUILDERBOT API v2] URL:', url);
      console.log('[BUILDERBOT API v2] botId:', this.botId.substring(0, 20) + '...');
      console.log('[BUILDERBOT API v2] hasApiKey:', !!this.apiKey);
      console.log('[BUILDERBOT API v2] number:', toPhone);
      console.log('[BUILDERBOT API v2] textLength:', text.length);
      console.log('[BUILDERBOT API v2] headers:', JSON.stringify({
        'Content-Type': 'application/json',
        'x-api-builderbot': this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'MISSING'
      }));
      console.log('[BUILDERBOT API v2] body:', JSON.stringify({
        messages: { content: text.substring(0, 50) + '...' },
        number: toPhone,
        checkIfExists: false
      }));

      const response = await fetch(url, {
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

      let data: { messageId?: string; id?: string; [key: string]: unknown };
      try {
        data = JSON.parse(responseText) as { messageId?: string; id?: string; [key: string]: unknown };
      } catch {
        // Si no es JSON, usar el texto como messageId
        data = { messageId: responseText };
      }

      console.log('[BUILDERBOT] ✅ Mensaje enviado exitosamente:', data);
      return { success: true, messageId: data.messageId || data.id };
    } catch (error) {
      console.error('[BUILDERBOT] ❌ Error al enviar:', error);
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
