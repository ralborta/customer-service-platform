// CÓDIGO EXACTO DEL PROYECTO QUE FUNCIONA (empliados-support-desk)
// Replicado exactamente para garantizar compatibilidad
import axios from 'axios';

const BUILDERBOT_BASE_URL =
  process.env.BUILDERBOT_BASE_URL || 'https://app.builderbot.cloud';

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
  async sendText(
    toPhone: string,
    text: string,
    opts?: BuilderbotMessageOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const BOT_ID = process.env.BUILDERBOT_BOT_ID || '';
    const API_KEY = process.env.BUILDERBOT_API_KEY || '';

    if (!BOT_ID || !API_KEY) {
      const error = 'BuilderBot no configurado: define BUILDERBOT_BOT_ID y BUILDERBOT_API_KEY';
      console.error('[BuilderBot] ❌', error);
      return { success: false, error };
    }

    const url = `${BUILDERBOT_BASE_URL}/api/v2/${BOT_ID}/messages`;

    const body: Record<string, any> = {
      messages: {
        content: text,
      },
      number: toPhone,
      checkIfExists: false,
    };

    if (opts?.metadata && 'mediaUrl' in opts.metadata) {
      body.messages.mediaUrl = opts.metadata.mediaUrl;
    }

    if (opts?.buttons && opts.buttons.length > 0) {
      body.messages.buttons = opts.buttons;
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-builderbot': API_KEY,
    };

    console.log('[BuilderBot] Enviando mensaje:', {
      url,
      number: toPhone,
      messageLength: text.length,
      hasMediaUrl: !!(opts?.metadata && 'mediaUrl' in opts.metadata),
    });

    try {
      const response = await axios.post(url, body, { headers, timeout: 30000 });
      console.log('[BuilderBot] ✅ Mensaje enviado exitosamente');
      return { success: true, messageId: response.data.messageId || response.data.id };
    } catch (error: any) {
      console.error('[BuilderBot] ❌ Error al enviar mensaje:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return {
        success: false,
        error: error.response?.data ? JSON.stringify(error.response.data) : error.message,
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
