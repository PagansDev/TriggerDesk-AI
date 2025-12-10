import axios from 'axios';
import type {
  OpenRouterMessage,
  OpenRouterResponse,
  OpenRouterRequest,
} from '../../@types/services/openRouter';
import { ISupportContext } from '../../@types/controllers/chat.controller.d.js';
import PromptLoaderService from './promptLoader.service.js';

class OpenRouterService {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor() {
    this.apiKey = process.env['OPENROUTER_API_KEY'] || '';
    this.baseURL =
      process.env['OPENROUTER_BASE_URL'] || 'https://openrouter.ai/api/v1';
    this.model = process.env['OPENROUTER_MODEL'] || 'openai/gpt-3.5-turbo';
  }

  async generateResponse(messages: OpenRouterMessage[]): Promise<string> {
    try {
      const response = await axios.post<OpenRouterResponse>(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: messages,
          max_tokens: 2500,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return (
        response.data.choices[0]?.message?.content ||
        'Desculpe, não consegui processar sua mensagem.'
      );
    } catch (error: any) {
      console.error('Erro ao gerar resposta da IA:', error);

      // Tratamento específico para erro HTTP 502
      if (error.response?.status === 502) {
        console.error('❌ [OpenRouter] Erro HTTP 502 - Bad Gateway');
        throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.');
      }

      // Tratamento para outros erros de rede/timeout
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.error('❌ [OpenRouter] Erro de conexão/timeout');
        throw new Error('Erro de conexão com o serviço. Verifique sua conexão e tente novamente.');
      }

      throw new Error('Falha na comunicação com o serviço');
    }
  }

  async generateSystemPrompt(
    context: string,
    supportContext?: ISupportContext,
  ): Promise<string> {
    let basePrompt = PromptLoaderService.getSystemPrompt();

    const contextSection = `\n\nContexto da conversa: ${context}`;
    const supportContextSection = `\n\nContexto de suporte: ${this.buildSupportContextSection(
      supportContext
    )}`;

    return basePrompt + contextSection + supportContextSection;
  }

  private buildSupportContextSection(supportContext?: ISupportContext): string {
    if (!supportContext) {
      return '';
    }

    let contextSection = '\n--- CONTEXTO DE SUPORTE ---\n' + JSON.stringify(supportContext);

    return contextSection;
  }
}

export default new OpenRouterService();
