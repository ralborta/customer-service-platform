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

  constructor() {
    this.apiUrl = process.env.BUILDERBOT_API_URL || 'https://api.builderbot.cloud';
    this.apiKey = process.env.BUILDERBOT_API_KEY || '';
    this.botId = process.env.BUILDERBOT_BOT_ID;
  }

  async sendText(
    toPhone: string,
    text: string,
    opts?: BuilderbotMessageOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // MVP: Mock implementation
    if (!this.apiKey || this.apiKey === '') {
      console.log('[BUILDERBOT MOCK] sendText:', { toPhone, text, opts });
      return { success: true, messageId: `mock_${Date.now()}` };
    }

    try {
      // Real implementation would call Builderbot API
      const response = await fetch(`${this.apiUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...(this.botId && { 'X-Bot-Id': this.botId })
        },
        body: JSON.stringify({
          to: toPhone,
          text,
          buttons: opts?.buttons,
          metadata: opts?.metadata
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = await response.json();
      return { success: true, messageId: data.messageId || data.id };
    } catch (error) {
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
