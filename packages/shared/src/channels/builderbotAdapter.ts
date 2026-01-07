// CÓDIGO EXACTO DEL PROYECTO QUE FUNCIONA (empliados-support-desk)
// Replicado exactamente para garantizar compatibilidad

const BUILDERBOT_BASE_URL =
  process.env.BUILDERBOT_BASE_URL || process.env.BUILDERBOT_API_URL || 'https://app.builderbot.cloud';

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
      console.error('[BuilderBot]', error);
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
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('[BuilderBot] ❌ Error al enviar mensaje:', {
          status: response.status,
          statusText: response.statusText,
          data: responseText,
        });
        return { success: false, error: responseText };
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { messageId: responseText };
      }

      console.log('[BuilderBot] ✅ Mensaje enviado exitosamente');
      return { success: true, messageId: data.messageId || data.id };
    } catch (error: any) {
      console.error('[BuilderBot] ❌ Error al enviar mensaje:', {
        message: error.message,
        error: error,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
