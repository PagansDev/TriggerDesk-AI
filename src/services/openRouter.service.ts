import axios from 'axios';
import type {
  OpenRouterMessage,
  OpenRouterResponse,
  OpenRouterRequest,
} from '../../@types/services/openRouter';
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
    } catch (error) {
      console.error('Erro ao gerar resposta da IA:', error);
      throw new Error('Falha na comunicação com o serviço');
    }
  }

  async generateSystemPrompt(
    context: string,
    supportContext?: {
      exchangeRates?: {
        BTC_USD: number | null;
        USD_BRL: number | null;
        lastUpdate: string | null;
      };
      dashboardData?: any;
    }
  ): Promise<string> {
    const basePrompt = PromptLoaderService.getSystemPrompt();

    const contextSection = `\n\nContexto da conversa: ${context}`;
    const supportContextSection = `\n\nContexto de suporte: ${this.buildSupportContextSection(
      supportContext
    )}`;

    return basePrompt + contextSection + supportContextSection;
  }

  // Exemplo de aplicação e implementação de contexto de suporte em projeto em andamento
  private buildSupportContextSection(supportContext?: {
    exchangeRates?: {
      BTC_USD: number | null;
      USD_BRL: number | null;
      lastUpdate: string | null;
    };
    dashboardData?: any;
  }): string {
    if (!supportContext) {
      return '';
    }

    let contextSection = '\n--- CONTEXTO DO USUÁRIO ---\n';

    if (supportContext.exchangeRates) {
      const rates = supportContext.exchangeRates;
      contextSection += '\nTAXAS DE CÂMBIO ATUAIS:\n';
      if (rates.BTC_USD) {
        contextSection += `- Preço do Bitcoin: $${rates.BTC_USD.toLocaleString(
          'en-US',
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )} USD\n`;
      }
      if (rates.USD_BRL) {
        contextSection += `- Dólar para Real: R$${rates.USD_BRL.toFixed(
          2
        )} BRL\n`;
      }
      if (rates.lastUpdate) {
        contextSection += `- Última atualização: ${rates.lastUpdate}\n`;
      }
    }

    if (supportContext.dashboardData) {
      const dashboard = supportContext.dashboardData;
      contextSection += '\nCONFIGURAÇÕES DA AUTOMAÇÃO DO USUÁRIO:\n';

      if (dashboard.license) {
        contextSection += `\nLicença:\n`;
        contextSection += `- Status: ${
          dashboard.license.valid ? 'Ativa' : 'Inválida'
        }\n`;
        contextSection += `- Plano: ${dashboard.license.plan}\n`;
        if (dashboard.license.message) {
          contextSection += `- Mensagem: ${dashboard.license.message}\n`;
        }
      }

      if (dashboard.user?.botSettings) {
        const settings = dashboard.user.botSettings;
        contextSection += `\nStatus da Automação: ${
          settings.active ? 'Ativa' : 'Inativa'
        }\n`;

        if (settings.marginProtection) {
          contextSection += `\nProteção de Margem:\n`;
          contextSection += `- Status: ${
            settings.marginProtection.enabled ? 'Ativa' : 'Inativa'
          }\n`;
          if (settings.marginProtection.enabled) {
            contextSection += `- Distância de ativação: ${settings.marginProtection.activationDistance}%\n`;
            contextSection += `- Nova distância de liquidação: ${settings.marginProtection.newLiquidationDistance}%\n`;
          }
        }

        if (settings.priceAlert) {
          contextSection += `\nAlerta de Preço:\n`;
          contextSection += `- Status: ${
            settings.priceAlert.enabled ? 'Ativo' : 'Inativo'
          }\n`;
          if (settings.priceAlert.enabled) {
            contextSection += `- Limite inferior: $${settings.priceAlert.lowerLimit}\n`;
            contextSection += `- Limite superior: $${settings.priceAlert.upperLimit}\n`;
            contextSection += `- Intervalo: ${settings.priceAlert.interval} minutos\n`;
          }
        }

        if (settings.takeprofitAutomation) {
          contextSection += `\nTake Profit:\n`;
          contextSection += `- Status: ${
            settings.takeprofitAutomation.enabled ? 'Ativo' : 'Inativo'
          }\n`;
          if (
            settings.takeprofitAutomation.enabled &&
            settings.takeprofitAutomation.profit
          ) {
            contextSection += `- Lucro alvo: $${settings.takeprofitAutomation.profit}\n`;
          }
        }

        if (settings.stopgainAutomation) {
          contextSection += `\nStop Gain:\n`;
          contextSection += `- Status: ${
            settings.stopgainAutomation.enabled ? 'Ativo' : 'Inativo'
          }\n`;
          if (settings.stopgainAutomation.enabled) {
            contextSection += `- TK: ${settings.stopgainAutomation.tk}\n`;
            contextSection += `- Intervalo: ${settings.stopgainAutomation.interval} minutos\n`;
          }
        }

        if (settings.entryAutomation) {
          contextSection += `\nAutomação de Entrada:\n`;
          contextSection += `- Status: ${
            settings.entryAutomation.enabled ? 'Ativa' : 'Inativa'
          }\n`;
          if (settings.entryAutomation.enabled) {
            contextSection += `- Lado: ${
              settings.entryAutomation.side === 'b'
                ? 'Long (Compra)'
                : 'Short (Venda)'
            }\n`;
            contextSection += `- Alavancagem: ${settings.entryAutomation.leverage}x\n`;
            contextSection += `- Número de ordens: ${settings.entryAutomation.numberOfOrders}\n`;
            contextSection += `- Valor total: $${settings.entryAutomation.totalAmount}\n`;
          }
        }
      }

      if (dashboard.botStartDate) {
        contextSection += `\nBot iniciado em: ${dashboard.botStartDate}\n`;
        if (dashboard.uptime) {
          contextSection += `Tempo ativo: ${Math.floor(
            dashboard.uptime / 3600
          )}h ${Math.floor((dashboard.uptime % 3600) / 60)}m\n`;
        }
      }
    }

    contextSection += '\n--- FIM DO CONTEXTO DE SUPORTE ---\n';
    contextSection +=
      '\nUse essas informações para fornecer suporte mais preciso e contextualizado ao usuário.\n';
    contextSection +=
      'Se o usuário mencionar problemas com configurações, você pode referenciar os valores atuais acima.\n';

    return contextSection;
  }
}

export default new OpenRouterService();
