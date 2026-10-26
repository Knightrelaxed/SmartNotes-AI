import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiProvidersConfig, geminiConfig } from '@/config/app.config';
import { openRouterClient } from './openrouter';
import { useSettingsStore } from '@/store/settingsStore';

export type AIProviderId = 'gemini_primary' | 'gemini_secondary' | 'openrouter_primary' | 'openrouter_fallback';

export interface AIProviderStrategy {
  id: AIProviderId;
  generateContent: (prompt: string) => Promise<string>;
  generateContentStream?: (prompt: string) => Promise<any>;
}

export class AIManager {
  private providers: Map<AIProviderId, AIProviderStrategy> = new Map();

  constructor() {
    this.initProviders();
  }

  initProviders() {
    this.providers.clear();
    const userSettings = useSettingsStore.getState().ai;
    const primaryGeminiKey = userSettings.geminiApiKey?.trim() || aiProvidersConfig.gemini[0]?.key || geminiConfig.apiKey;
    const secondaryGeminiKey = aiProvidersConfig.gemini[1]?.key;
    const openrouterKey = userSettings.openrouterApiKey?.trim() || aiProvidersConfig.openrouter?.key;

    // 1. Primary Gemini
    if (primaryGeminiKey) {
      const genAI = new GoogleGenerativeAI(primaryGeminiKey);
      const model = genAI.getGenerativeModel({
        model: geminiConfig.model || 'gemini-2.0-flash',
        generationConfig: geminiConfig.generationConfig,
      });
      this.providers.set('gemini_primary', {
        id: 'gemini_primary',
        generateContent: async (prompt) => {
          const res = await model.generateContent(prompt);
          return res.response.text();
        },
        generateContentStream: async (prompt) => {
          return await model.generateContentStream(prompt);
        }
      });
    }

    // 2. Secondary Gemini
    if (secondaryGeminiKey) {
      const genAI = new GoogleGenerativeAI(secondaryGeminiKey);
      const model = genAI.getGenerativeModel({
        model: geminiConfig.model || 'gemini-2.0-flash',
        generationConfig: geminiConfig.generationConfig,
      });
      this.providers.set('gemini_secondary', {
        id: 'gemini_secondary',
        generateContent: async (prompt) => {
          const res = await model.generateContent(prompt);
          return res.response.text();
        },
        generateContentStream: async (prompt) => {
          return await model.generateContentStream(prompt);
        }
      });
    }

    // 3. OpenRouter Primary & Fallback
    if (openrouterKey) {
      this.providers.set('openrouter_primary', {
        id: 'openrouter_primary',
        generateContent: async (prompt) => openRouterClient.generateContent(prompt, 'primary', openrouterKey),
      });

      this.providers.set('openrouter_fallback', {
        id: 'openrouter_fallback',
        generateContent: async (prompt) => openRouterClient.generateContent(prompt, 'fallback', openrouterKey),
      });
    }
  }

  private getProviderOrder(): AIProviderId[] {
    const engine = useSettingsStore.getState().ai.engine;
    const order: AIProviderId[] = [];
    
    if (engine === 'auto' || engine === 'gemini') {
      if (this.providers.has('gemini_primary')) order.push('gemini_primary');
      if (this.providers.has('gemini_secondary')) order.push('gemini_secondary');
    }
    
    if (engine === 'auto' || engine === 'openrouter') {
      if (this.providers.has('openrouter_primary')) order.push('openrouter_primary');
      if (this.providers.has('openrouter_fallback')) order.push('openrouter_fallback');
    }
    
    return order;
  }

  private isFallbackEligibleError(error: any): boolean {
    if (!error) return false;
    const errorStr = (error.message || String(error)).toLowerCase();
    
    // We want to fallback if we hit rate limits, quota issues, or generic server timeouts/errors
    return (
      errorStr.includes('429') ||
      errorStr.includes('401') ||
      errorStr.includes('402') ||
      errorStr.includes('403') ||
      errorStr.includes('404') ||
      errorStr.includes('rate limit') ||
      errorStr.includes('too many requests') ||
      errorStr.includes('quota exceeded') ||
      errorStr.includes('resource exhausted') ||
      errorStr.includes('500') ||
      errorStr.includes('502') ||
      errorStr.includes('503') ||
      errorStr.includes('504') ||
      errorStr.includes('timeouterror') ||
      errorStr.includes('abort') ||
      errorStr.includes('fetch failed') ||
      errorStr.includes('network error')
    );
  }

  async generateContent(prompt: string, forceProvider?: AIProviderId): Promise<string> {
    this.initProviders();
    const order = forceProvider ? [forceProvider] : this.getProviderOrder();
    
    if (order.length === 0) {
      throw new Error('No AI providers are configured.');
    }

    const errors: string[] = [];

    for (const providerId of order) {
      const provider = this.providers.get(providerId);
      if (!provider) {
        console.warn(`[AIManager] Skipping ${providerId} (not initialized)`);
        continue;
      }

      try {
        console.log(`[AIManager] Attempting generation via ${providerId}...`);
        const result = await provider.generateContent(prompt);
        return result;
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        errors.push(`[${providerId}] failed: ${errorMsg}`);
        
        if (this.isFallbackEligibleError(error)) {
          console.warn(`[AIManager] ${providerId} failed gracefully, falling back to next...`, errorMsg);
          continue; // Move to the next provider
        }
        
        console.error(`[AIManager] Critical exception on ${providerId}:`, error);
        throw error; // If it's a real critical parsing error, throw it immediately
      }
    }

    throw new Error(`All AI providers exhausted. Trace:\n${errors.join('\n')}`);
  }

  // Helper method for stream proxying requests to Gemini Models specifically
  getProviderStream(providerId: AIProviderId) {
    return this.providers.get(providerId)?.generateContentStream;
  }
}

export const aiManager = new AIManager();
