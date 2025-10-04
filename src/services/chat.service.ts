import { Types } from 'mongoose';
import openRouterService from './openRouter.service.js';
import messageService from './message.service.js';
import type { OpenRouterMessage } from '../../@types/services/openRouter.js';

//exemplo de contexto de suporte em integração de projeto em andamento
interface SupportContext {
  exchangeRates?: {
    BTC_USD: number | null;
    USD_BRL: number | null;
    lastUpdate: string | null;
  };
  dashboardData?: any;
}

export class ChatService {
  async generateResponse(
    userMessage: string,
    conversationId: Types.ObjectId,
    supportContext?: SupportContext
  ): Promise<string> {
    try {
      const recentMessages = await messageService.getRecentMessages(
        conversationId,
        10
      );

      const messages: OpenRouterMessage[] = recentMessages.map((msg: any) => ({
        role: msg.isFromAI ? 'assistant' : 'user',
        content: msg.content,
      }));

      messages.push({
        role: 'user',
        content: userMessage,
      });

      const systemPrompt = await openRouterService.generateSystemPrompt(
        'Atendimento ao cliente via chat',
        supportContext
      );

      console.log(
        `[ChatService] Tamanho do systemPrompt: ${systemPrompt.length} caracteres`
      );

      messages.unshift({
        role: 'system',
        content: systemPrompt,
      });

      const totalSize = messages.reduce(
        (acc, msg) => acc + msg.content.length,
        0
      );
      console.log(
        `[ChatService] Tamanho total das mensagens: ${totalSize} caracteres (${messages.length} mensagens)`
      );

      const rawResponse = await openRouterService.generateResponse(messages);
      const aiResponse = JSON.parse(rawResponse);

      console.log(
        `[ChatService] Resposta gerada: ${aiResponse.reply.substring(0, 50)}...`
      );
      console.log(
        '[ChatService] Status:',
        aiResponse.status,
        '| Action:',
        aiResponse.action,
        '| Priority:',
        aiResponse.priority
      );
      return aiResponse.reply;
    } catch (error) {
      console.error('❌ [ChatService] Erro ao gerar resposta:', error);
      return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
    }
  }
}

export default new ChatService();
