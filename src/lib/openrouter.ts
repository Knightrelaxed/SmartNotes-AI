import { aiProvidersConfig } from '@/config/app.config';

export interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      content: string;
      role: string;
    };
  }[];
  error?: {
    message: string;
    code: number;
    metadata?: any;
  };
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = aiProvidersConfig.openrouter.key;
    this.baseUrl = aiProvidersConfig.openrouter.baseUrl;
  }

  async generateContent(prompt: string, modelType: 'primary' | 'fallback' = 'primary'): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is not configured');
    }

    const modelId = modelType === 'primary' 
      ? aiProvidersConfig.openrouter.models.primary 
      : aiProvidersConfig.openrouter.models.fallback;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'SmartNotes AI',
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          // Keep it deterministic
          temperature: 0.3,
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) throw new Error('429'); // Rate limit
        if ([401, 402, 403, 404, 500, 502, 503, 504].includes(response.status)) throw new Error(response.status.toString()); // Server error / permission trigger
        const errText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
      }

      const data: OpenRouterResponse = await response.json();
      
      if (data.error) {
        throw new Error(`OpenRouter error: ${data.error.message}`);
      }

      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }
      
      throw new Error('No content in OpenRouter response');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('TimeoutError');
      }
      if (['429', '401', '402', '403', '404', '500', '502', '503', '504'].includes(error.message)) {
        throw error;
      }
      console.error(`OpenRouter Error (${modelId}):`, error);
      throw error;
    }
  }
}

export const openRouterClient = new OpenRouterClient();
