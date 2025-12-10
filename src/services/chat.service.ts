import { Types } from 'mongoose';
import openRouterService from './openRouter.service.js';
import messageService from './message.service.js';
import type { OpenRouterMessage } from '../../@types/services/openRouter.js';
import { ISupportContext } from '../../@types/controllers/chat.controller.d.js';
import { actionsService } from './actions.service.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

export class ChatService {
  async shouldAIRespond(conversationId: Types.ObjectId): Promise<{
    should: boolean;
    reason?: string;
  }> {
    try {
      const conversation = await Conversation.findById(conversationId)
        .populate('userId')
        .lean();

      if (!conversation) {
        return { should: false, reason: 'conversation_not_found' };
      }

      // Verificar needHumanAttention apenas se a conversa tiver ticket
      // Se não tiver ticket, pode ser uma conversa nova ou sem necessidade de bloqueio
      if (conversation.needHumanAttention && conversation.ticketId) {
        console.log(
          `[ChatService] IA não responderá: conversa precisa de atenção humana (needHumanAttention: true) e tem ticket`,
        );
        return { should: false, reason: 'need_human_attention' };
      }

      if (conversation.assignedTo) {
        console.log(
          `[ChatService] IA não responderá: conversa atribuída ao operador ${conversation.assignedTo}`,
        );
        return { should: false, reason: 'assigned_to_operator' };
      }

      if (
        conversation.status === 'closed' ||
        conversation.status === 'archived'
      ) {
        console.log(
          `[ChatService] IA não responderá: conversa com status ${conversation.status}`,
        );
        return { should: false, reason: 'conversation_closed' };
      }

      // Verificar se há mensagens de operadores (support/admin) no histórico
      const supportMessages = await Message.find({
        conversationId,
        isFromAI: false,
      })
        .populate('senderId')
        .lean();

      // Verificar se alguma mensagem é de operador (role: support ou admin)
      for (const message of supportMessages) {
        const sender = message.senderId as any;
        if (sender && (sender.role === 'support' || sender.role === 'admin')) {
          console.log(
            '[ChatService] IA não responderá: há mensagens de operador no histórico',
          );
          return { should: false, reason: 'has_support_messages' };
        }
      }

      return { should: true };
    } catch (error) {
      console.error(
        '[ChatService] Erro ao verificar se IA deve responder:',
        error,
      );
      return { should: false, reason: 'error' };
    }
  }

  async generateResponse(
    userMessage: { content: string; senderId: Types.ObjectId },
    conversationId: Types.ObjectId,
    supportContext?: ISupportContext,
  ): Promise<string | { reply: string; actionResult: any }> {
    try {
      const recentMessages = await messageService.getRecentMessages(
        conversationId,
        10,
      );

      const messages: OpenRouterMessage[] = recentMessages.map((msg: any) => ({
        role: msg.isFromAI ? 'assistant' : 'user',
        content: msg.content,
      }));

      messages.push({
        role: 'user',
        content: userMessage.content,
      });

      // Verificar se já foi enviada mensagem sobre BingX nesta conversa
      const hasBingXMessage = await messageService.hasBingXMessage(conversationId);

      // Verificar se já foram usadas frases repetitivas de empatia
      const hasEmpathyPhrases = await messageService.hasRepetitiveEmpathyPhrases(conversationId);

      const systemPrompt = await openRouterService.generateSystemPrompt(
        'Atendimento ao cliente via chat',
        supportContext,
        {
          skipBingXMessage: hasBingXMessage,
          skipEmpathyPhrases: hasEmpathyPhrases,
        }
      );

      console.log(
        `[ChatService] Tamanho do systemPrompt: ${systemPrompt.length} caracteres`,
      );

      messages.unshift({
        role: 'system',
        content: systemPrompt,
      });

      const totalSize = messages.reduce(
        (acc, msg) => acc + msg.content.length,
        0,
      );
      console.log(
        `[ChatService] Tamanho total das mensagens: ${totalSize} caracteres (${messages.length} mensagens)`,
      );

      const rawResponse = await openRouterService.generateResponse(messages);
      const aiResponse = JSON.parse(rawResponse);

      if (!aiResponse.reply || typeof aiResponse.reply !== 'string') {
        console.error('❌ [ChatService] Resposta da IA inválida:', aiResponse);
        return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
      }

      console.log(
        `[ChatService] Resposta gerada: ${aiResponse.reply.substring(
          0,
          50,
        )}...`,
      );
      console.log(
        '[ChatService] Status:',
        aiResponse.status,
        '| Action:',
        aiResponse.action,
        '| Priority:',
        aiResponse.priority,
      );

      let actionResult = null;
      if (aiResponse.action && aiResponse.action !== 'no_action') {
        if (!userMessage.senderId) {
          console.error(
            '❌ [ChatService] senderId ausente na mensagem do usuário',
          );
        } else {
          actionResult = await actionsService.executeAction(
            aiResponse.action,
            {
              conversationId: conversationId.toString(),
              userId: userMessage.senderId.toString(),
              priority: aiResponse.priority,
              status: aiResponse.status,
              reply: aiResponse.reply,
            },
          );

          if (actionResult.success) {
            console.log(
              `[ChatService] Ação executada: ${aiResponse.action} - ${
                actionResult.message || 'Sucesso'
              }`,
            );
          } else {
            console.error(
              `❌ [ChatService] Falha ao executar ação ${aiResponse.action}:`,
              actionResult.error,
            );
          }
        }
      }

      return { reply: aiResponse.reply, actionResult };
    } catch (error: any) {
      console.error('❌ [ChatService] Erro ao gerar resposta:', error);

      // Usar mensagem específica do erro se disponível (ex: HTTP 502)
      const errorMessage = error?.message || 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';

      return {
        reply: errorMessage,
        actionResult: null,
      };
    }
  }
  async generateConversationTitle(
    conversationId: Types.ObjectId,
  ): Promise<string | undefined> {
    try {
      const recentMessages = await messageService.getRecentMessages(
        conversationId,
        5,
      );

      // Só gerar título se houver poucas mensagens (até 3 mensagens)
      // Isso evita gerar título desnecessariamente em conversas antigas
      if (recentMessages.length > 3) {
        console.log('[Title] Conversa já tem muitas mensagens, não gerando título');
        return;
      }

      // Verificar se a conversa já tem um título definido (não é o padrão)
      const conversation = await Conversation.findById(conversationId).lean();
      if (conversation && conversation.title && conversation.title !== 'Chat de Suporte') {
        console.log('[Title] Conversa já tem título definido:', conversation.title);
        return;
      }

      const messages: OpenRouterMessage[] = recentMessages.map((msg: any) => ({
        role: msg.isFromAI ? 'assistant' : 'user',
        content: msg.content,
      }));

      const systemPrompt =
        'Você é um assistente que gera títulos para conversas de suporte. Baseado no histórico de mensagens fornecido, gere um título curto e descritivo (máximo 50 caracteres).\n\nIMPORTANTE: Você DEVE responder APENAS com um objeto JSON válido no seguinte formato:\n\n{"title": "Título da conversa aqui"}\n\nNão inclua texto adicional, explicações ou formatação markdown. Apenas o JSON puro. O título deve ser em português do Brasil e resumir o assunto principal da conversa.';

      messages.unshift({
        role: 'system',
        content: systemPrompt,
      });

      const rawResponse = await openRouterService.generateResponse(messages);

      try {
        // Tentar parsear como JSON primeiro
        const aiResponse = JSON.parse(rawResponse);

        if (aiResponse.title && typeof aiResponse.title === 'string') {
          console.log(`[Title] Título gerado: ${aiResponse.title}`);
          return aiResponse.title;
        }
      } catch (parseError) {
        // Se não for JSON válido, tentar extrair o título de outras formas
        console.warn(
          '[Title] Resposta não é JSON válido, tentando extrair título...',
          rawResponse.substring(0, 100),
        );
      }

      // Tentar extrair título de diferentes formatos
      // Formato 1: "title": "Título aqui"
      const titleMatch1 = rawResponse.match(/["']title["']:\s*["']([^"']+)["']/i);
      if (titleMatch1 && titleMatch1[1]) {
        console.log(`[Title] Título extraído (formato 1): ${titleMatch1[1]}`);
        return titleMatch1[1].trim();
      }

      // Formato 2: JSON com chave title mas com problemas de escape
      const titleMatch2 = rawResponse.match(/"title"\s*:\s*"([^"]+)"/i);
      if (titleMatch2 && titleMatch2[1]) {
        console.log(`[Title] Título extraído (formato 2): ${titleMatch2[1]}`);
        return titleMatch2[1].trim();
      }

      // Formato 3: Título direto sem JSON (primeira linha ou primeira frase entre aspas)
      const titleMatch3 = rawResponse.match(/^["']([^"']{5,100})["']/);
      if (titleMatch3 && titleMatch3[1]) {
        console.log(`[Title] Título extraído (formato 3): ${titleMatch3[1]}`);
        return titleMatch3[1].trim();
      }

      // Formato 4: Primeira linha sem aspas (máximo 100 caracteres)
      if (rawResponse) {
        const firstLine = rawResponse.split('\n')[0]?.trim();
        if (firstLine && firstLine.length > 5 && firstLine.length <= 100 && !firstLine.includes('{')) {
          console.log(`[Title] Título extraído (formato 4 - primeira linha): ${firstLine}`);
          return firstLine;
        }
      }

      // Se não conseguir extrair, retornar undefined
      console.warn('[Title] Não foi possível extrair título da resposta:', rawResponse?.substring(0, 200) || 'Resposta vazia');
      return undefined;
    } catch (error) {
      console.error(
        '❌ [ChatService] Erro ao gerar título da conversa:',
        error,
      );
      return undefined;
    }
  }
}

export default new ChatService();
