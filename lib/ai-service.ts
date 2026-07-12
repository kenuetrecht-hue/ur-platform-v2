/**
 * AI Service Wrapper
 * Abstracts AI provider implementation (Manus, OpenAI, Anthropic)
 * Allows seamless provider switching via environment variables
 */

import { getAIService } from './server-config';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  success: boolean;
  message: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Abstract AI Service Interface
 */
export interface IAIProvider {
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;

  /**
   * Send a message to the AI and get a response
   */
  sendMessage(messages: AIMessage[]): Promise<AIResponse>;

  /**
   * Generate content for AI bots (wellness tips, fitness advice, etc.)
   */
  generateBotContent(botType: string, topic: string): Promise<AIResponse>;

  /**
   * Generate video tutorial content
   */
  generateTutorialContent(topic: string, level: 'beginner' | 'intermediate' | 'advanced'): Promise<AIResponse>;
}

/**
 * Manus AI Provider
 */
class ManusAIProvider implements IAIProvider {
  name = 'Manus';
  endpoint: string;
  apiKey: string;
  model = 'manus-ai';

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  async sendMessage(messages: AIMessage[]): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Manus API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.choices?.[0]?.message?.content || '',
        usage: data.usage,
      };
    } catch (error) {
      return {
        success: false,
        message: '',
        error: `Manus AI error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async generateBotContent(botType: string, topic: string): Promise<AIResponse> {
    const systemPrompt = this.getBotSystemPrompt(botType);
    const userMessage = `Generate helpful content about: ${topic}`;

    return this.sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);
  }

  async generateTutorialContent(
    topic: string,
    level: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<AIResponse> {
    const systemPrompt = `You are an expert tutorial creator. Create a structured tutorial for ${level} level learners.`;
    const userMessage = `Create a tutorial outline about: ${topic}`;

    return this.sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);
  }

  private getBotSystemPrompt(botType: string): string {
    const prompts: { [key: string]: string } = {
      wellness:
        'You are an AI Wellness Coach. Provide helpful, encouraging wellness tips and meditation guidance. Remember: This is for entertainment and educational purposes only, not professional medical advice.',
      fitness:
        'You are an AI Fitness Trainer. Provide workout routines and fitness tips. Remember: This is for entertainment and educational purposes only, not professional medical advice.',
      creative:
        'You are an AI Creative Mentor. Provide art tutorials and creative inspiration. Remember: This is for entertainment and educational purposes only.',
      music:
        'You are an AI Music Producer. Provide music theory lessons and production tips. Remember: This is for entertainment and educational purposes only.',
      life:
        'You are an AI Life Coach. Provide personal development advice and goal-setting guidance. Remember: This is for entertainment and educational purposes only, not professional advice.',
    };

    return prompts[botType] || prompts.wellness;
  }
}

/**
 * OpenAI Provider
 */
class OpenAIProvider implements IAIProvider {
  name = 'OpenAI';
  endpoint: string;
  apiKey: string;
  model = 'gpt-4';

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  async sendMessage(messages: AIMessage[]): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.choices?.[0]?.message?.content || '',
        usage: data.usage,
      };
    } catch (error) {
      return {
        success: false,
        message: '',
        error: `OpenAI error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async generateBotContent(botType: string, topic: string): Promise<AIResponse> {
    const systemPrompt = this.getBotSystemPrompt(botType);
    const userMessage = `Generate helpful content about: ${topic}`;

    return this.sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);
  }

  async generateTutorialContent(
    topic: string,
    level: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<AIResponse> {
    const systemPrompt = `You are an expert tutorial creator. Create a structured tutorial for ${level} level learners.`;
    const userMessage = `Create a tutorial outline about: ${topic}`;

    return this.sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);
  }

  private getBotSystemPrompt(botType: string): string {
    const prompts: { [key: string]: string } = {
      wellness:
        'You are an AI Wellness Coach. Provide helpful, encouraging wellness tips and meditation guidance. Remember: This is for entertainment and educational purposes only, not professional medical advice.',
      fitness:
        'You are an AI Fitness Trainer. Provide workout routines and fitness tips. Remember: This is for entertainment and educational purposes only, not professional medical advice.',
      creative:
        'You are an AI Creative Mentor. Provide art tutorials and creative inspiration. Remember: This is for entertainment and educational purposes only.',
      music:
        'You are an AI Music Producer. Provide music theory lessons and production tips. Remember: This is for entertainment and educational purposes only.',
      life:
        'You are an AI Life Coach. Provide personal development advice and goal-setting guidance. Remember: This is for entertainment and educational purposes only, not professional advice.',
    };

    return prompts[botType] || prompts.wellness;
  }
}

/**
 * Anthropic Provider
 */
class AnthropicProvider implements IAIProvider {
  name = 'Anthropic';
  endpoint: string;
  apiKey: string;
  model = 'claude-3-sonnet';

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  async sendMessage(messages: AIMessage[]): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.endpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1000,
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.content?.[0]?.text || '',
      };
    } catch (error) {
      return {
        success: false,
        message: '',
        error: `Anthropic error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async generateBotContent(botType: string, topic: string): Promise<AIResponse> {
    const systemPrompt = this.getBotSystemPrompt(botType);
    const userMessage = `Generate helpful content about: ${topic}`;

    return this.sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);
  }

  async generateTutorialContent(
    topic: string,
    level: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<AIResponse> {
    const systemPrompt = `You are an expert tutorial creator. Create a structured tutorial for ${level} level learners.`;
    const userMessage = `Create a tutorial outline about: ${topic}`;

    return this.sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);
  }

  private getBotSystemPrompt(botType: string): string {
    const prompts: { [key: string]: string } = {
      wellness:
        'You are an AI Wellness Coach. Provide helpful, encouraging wellness tips and meditation guidance. Remember: This is for entertainment and educational purposes only, not professional medical advice.',
      fitness:
        'You are an AI Fitness Trainer. Provide workout routines and fitness tips. Remember: This is for entertainment and educational purposes only, not professional medical advice.',
      creative:
        'You are an AI Creative Mentor. Provide art tutorials and creative inspiration. Remember: This is for entertainment and educational purposes only.',
      music:
        'You are an AI Music Producer. Provide music theory lessons and production tips. Remember: This is for entertainment and educational purposes only.',
      life:
        'You are an AI Life Coach. Provide personal development advice and goal-setting guidance. Remember: This is for entertainment and educational purposes only, not professional advice.',
    };

    return prompts[botType] || prompts.wellness;
  }
}

/**
 * AI Service Factory
 * Returns the appropriate AI provider based on configuration
 */
export function createAIService(): IAIProvider {
  const config = getAIService();

  switch (config.name) {
    case 'OpenAI':
      return new OpenAIProvider(config.endpoint, config.apiKey);

    case 'Anthropic':
      return new AnthropicProvider(config.endpoint, config.apiKey);

    case 'Manus':
    default:
      return new ManusAIProvider(config.endpoint, config.apiKey);
  }
}

/**
 * Singleton instance
 */
let aiService: IAIProvider | null = null;

export function getAIServiceInstance(): IAIProvider {
  if (!aiService) {
    aiService = createAIService();
  }
  return aiService;
}

export default getAIServiceInstance;
