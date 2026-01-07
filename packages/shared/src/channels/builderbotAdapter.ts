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
    // DEBUG: Verificar variables de entorno ANTES de usarlas
    const BOT_ID = process.env.BUILDERBOT_BOT_ID || '';
    const API_KEY = process.env.BUILDERBOT_API_KEY || '';

    console.log('[BuilderBot DEBUG] Variables de entorno:', {
      hasBOT_ID: !!BOT_ID,
      BOT_ID_length: BOT_ID.length,
      BOT_ID_preview: BOT_ID ? BOT_ID.substring(0, 10) + '...' : 'EMPTY',
      hasAPI_KEY: !!API_KEY,
      API_KEY_length: API_KEY.length,
      API_KEY_preview: API_KEY ? API_KEY.substring(0, 10) + '...' : 'EMPTY',
      BUILDERBOT_BASE_URL: BUILDERBOT_BASE_URL,
    });

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

    // DEBUG: Log exacto de lo que se envía
    console.log('[BuilderBot] Enviando mensaje:', {
      url,
      number: toPhone,
      messageLength: text.length,
      hasMediaUrl: !!(opts?.metadata && 'mediaUrl' in opts.metadata),
    });

    console.log('[BuilderBot DEBUG] Headers que se envían:', {
      'Content-Type': headers['Content-Type'],
      'x-api-builderbot': headers['x-api-builderbot'] ? headers['x-api-builderbot'].substring(0, 15) + '...' : 'MISSING',
      'x-api-builderbot_length': headers['x-api-builderbot']?.length || 0,
    });

    console.log('[BuilderBot DEBUG] Body que se envía:', JSON.stringify(body, null, 2));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const responseText = await response.text();

      // DEBUG: Log de respuesta completa
      console.log('[BuilderBot DEBUG] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText.substring(0, 500), // Primeros 500 chars
      });

      if (!response.ok) {
        console.error('[BuilderBot] ❌ Error al enviar mensaje:', {
          status: response.status,
          statusText: response.statusText,
          data: responseText,
          requestUrl: url,
          requestHeaders: headers,
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
