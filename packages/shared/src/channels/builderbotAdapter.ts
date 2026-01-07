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
    // CÓDIGO SIMPLIFICADO - EXACTAMENTE COMO FUNCIONABA
    this.apiUrl = 'https://app.builderbot.cloud';
    this.botId = process.env.BUILDERBOT_BOT_ID || '';
    this.apiKey = process.env.BUILDERBOT_API_KEY || '';
    
    console.log('[BUILDERBOT INIT] URL:', this.apiUrl);
    console.log('[BUILDERBOT INIT] botId configurado:', !!this.botId);
    console.log('[BUILDERBOT INIT] apiKey configurado:', !!this.apiKey);
  }

  async sendText(
    toPhone: string,
    text: string,
    opts?: BuilderbotMessageOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.botId) {
      return { success: false, error: 'BUILDERBOT_BOT_ID no configurado' };
    }
    if (!this.apiKey) {
      return { success: false, error: 'BUILDERBOT_API_KEY no configurado' };
    }

    try {
      // FORMATO EXACTO QUE FUNCIONABA
      const url = `${this.apiUrl}/api/v2/${this.botId}/messages`;
      
      const headers = {
        'Content-Type': 'application/json',
        'x-api-builderbot': this.apiKey,
      };

      const body = {
        messages: { content: text },
        number: toPhone,
        checkIfExists: false,
      };

      // Agregar mediaUrl si existe
      if (opts?.metadata && 'mediaUrl' in opts.metadata) {
        (body.messages as any).mediaUrl = opts.metadata.mediaUrl;
      }

      // Agregar buttons si existen
      if (opts?.buttons && opts.buttons.length > 0) {
        (body.messages as any).buttons = opts.buttons;
      }

      console.log('[BUILDERBOT] Enviando a:', url);
      console.log('[BUILDERBOT] Header x-api-builderbot:', this.apiKey.substring(0, 10) + '...');
      console.log('[BUILDERBOT] Body number:', toPhone);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('[BUILDERBOT ERROR]', response.status, responseText);
        return { success: false, error: responseText };
      }

      const data = JSON.parse(responseText);
      console.log('[BUILDERBOT OK]', data);
      return { success: true, messageId: data.messageId || data.id };
    } catch (error) {
      console.error('[BUILDERBOT EXCEPTION]', error);
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
// FORZAR REDEPLOY - Tue Jan  6 19:45:51 -03 2026
