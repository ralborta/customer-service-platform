export interface ElevenLabsCallOptions {
  agentId?: string;
  metadata?: Record<string, unknown>;
}

export interface ElevenLabsAdapter {
  triggerCall(
    toPhone: string,
    agentId: string,
    payload?: Record<string, unknown>
  ): Promise<{ success: boolean; callId?: string; error?: string }>;
}

class ElevenLabsAdapterImpl implements ElevenLabsAdapter {
  private apiKey: string;
  private agentId: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.agentId = process.env.ELEVENLABS_AGENT_ID || '';
  }

  async triggerCall(
    toPhone: string,
    agentId: string,
    payload?: Record<string, unknown>
  ): Promise<{ success: boolean; callId?: string; error?: string }> {
    // MVP: Stub implementation
    if (!this.apiKey || this.apiKey === '') {
      console.log('[ELEVENLABS STUB] triggerCall:', { toPhone, agentId, payload });
      return { success: true, callId: `stub_${Date.now()}` };
    }

    try {
      // Real implementation would call ElevenLabs API
      const response = await fetch('https://api.elevenlabs.io/v1/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          phone_number: toPhone,
          agent_id: agentId || this.agentId,
          ...payload
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = await response.json();
      return { success: true, callId: data.call_id || data.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const elevenlabsAdapter = new ElevenLabsAdapterImpl();
