# Fluxo de Atendimento - LNBot LiveChat

Documentação detalhada do fluxo de atendimento ao cliente com IA integrada.

## Visão Geral

O sistema implementa um fluxo inteligente de atendimento que combina respostas automáticas da IA com escalação para atendimento humano quando necessário.

## 1. Inicialização do Chat

### 1.1 Acesso do Cliente

```
Frontend (Popup) → Socket.IO → Backend
```

**Processo:**

1. Cliente acessa popup do livechat no frontend
2. Frontend estabelece conexão websocket
3. Envia `external_user_id` e `username`
4. Sistema valida/ cria usuário automaticamente

### 1.2 Validação de Usuário

```javascript
// Fluxo de validação
if (usuario_existe) {
  buscar_conversation_ativa();
  if (!conversation_ativa) {
    criar_nova_conversation();
  }
} else {
  criar_usuario();
  criar_conversation();
}
```

## 2. Processamento de Mensagens

### 2.1 Recebimento de Mensagem

```
Cliente → Socket.IO → Validação → Persistência → IA Processing
```

**Eventos Socket.IO:**

- `send_message`: Cliente envia mensagem
- `new_message`: Sistema envia mensagem para todos os participantes
- `ai_response`: Resposta da IA para o cliente

### 2.2 Persistência de Dados

```javascript
// Estrutura da mensagem
{
git  conversationId: ObjectId,
  senderId: ObjectId,
  content: String,
  messageType: 'text' | 'image' | 'file' | 'system',
  isFromAI: Boolean,
  isEdited: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 3. Processamento com IA

### 3.1 Análise da Mensagem

O OpenRouter recebe:

- **Mensagem do usuário**
- **Histórico da conversation** (últimas 10 mensagens)
- **System prompt** (instruções + FAQ)
- **Contexto da conversation**

### 3.2 Tipos de Resposta da IA

#### 3.2.1 Resposta de FAQ (N1)

```
Mensagem → IA → FAQ Match → Resposta Automática
```

- IA identifica pergunta comum
- Retorna resposta do FAQ
- Aguarda confirmação do usuário
- Se confirmada: fecha conversation
- Se não confirmada: mantém aberta

#### 3.2.2 Mensagem Ambígua

```
Mensagem → IA → Ambiguidade → Pedido de Esclarecimento
```

- IA não consegue entender a mensagem
- Solicita mais informações
- Mantém conversation em status `active`

#### 3.2.3 Necessidade de Atendimento Humano

```
Mensagem → IA → Sem FAQ → Criação de Ticket
```

- IA entende mas não tem resposta no FAQ
- Cria ticket automaticamente
- Atribui prioridade baseada no conteúdo
- Notifica operadores disponíveis

## 4. Sistema de Tickets

### 4.1 Criação Automática

```javascript
// Fluxo de criação de ticket
const ticket = await Ticket.create({
  title: `Atendimento - ${user.username}`,
  status: 'open',
  priority: determinePriority(message),
  subjectId: getDefaultSubjectId(message),
  externalUserId: user._id,
  conversationId: conversation._id,
});
```

### 4.2 Priorização

- **urgent**: Palavras-chave críticas (bug, erro, falha)
- **high**: Problemas técnicos complexos
- **medium**: Dúvidas gerais (padrão)
- **low**: Solicitações simples

### 4.3 Notificação de Operadores

```
Ticket Criado → Socket.IO → Interface Operadores
```

- Lista de tickets atualizada em tempo real
- Notificação visual para operadores
- Agrupamento por prioridade

## 5. Interface de Operadores

### 5.1 Dashboard de Atendimento

```
┌─────────────────────────────────────────┐
│ Conversations (por prioridade)          │
│ ├─ open (3)                            │
│ ├─ in_progress (5)                     │
│ └─ closed (12)                         │
├─────────────────────────────────────────┤
│ Tickets Abertos                         │
│ ├─ urgent (1)                          │
│ ├─ high (2)                            │
│ └─ medium (4)                          │
└─────────────────────────────────────────┘
```

### 5.2 Funcionalidades

- **Filtros**: Status, prioridade, usuário
- **Busca**: Por usuário, conteúdo, ticket
- **Histórico**: Todas as conversations do usuário
- **Métricas**: Tempo de resposta, resolução

## 6. Estados do Sistema

### 6.1 Status de Conversations

| Status     | Descrição            | Ações Disponíveis              |
| ---------- | -------------------- | ------------------------------ |
| `active`   | Conversation ativa   | Receber mensagens, IA responde |
| `closed`   | Fechada pelo sistema | Reabrir se necessário          |
| `archived` | Arquivada            | Consulta apenas                |

### 6.2 Status de Tickets

| Status        | Descrição               | Transições           |
| ------------- | ----------------------- | -------------------- |
| `open`        | Criado, aguardando      | → in_progress        |
| `in_progress` | Em atendimento          | → resolved, reopened |
| `resolved`    | Resolvido               | → reopened, closed   |
| `reopened`    | Reaberto                | → in_progress        |
| `closed`      | Fechado definitivamente | -                    |
| `archived`    | Arquivado               | -                    |

## 7. Integração com FAQ

### 7.1 Base de Conhecimento

```javascript
// Estrutura do FAQ
{
    question: "Como resetar senha?",
    answer: "Para resetar sua senha...",
    keywords: ["senha", "reset", "esqueci"],
    category: "autenticacao",
    priority: "high"
}
```

### 7.2 System Prompt

```javascript
const systemPrompt = `
Você é um assistente de atendimento ao cliente.
Base de conhecimento disponível:
${faqContent}

Instruções:
1. Se a pergunta está no FAQ, use a resposta exata
2. Se não está no FAQ, crie um ticket
3. Seja sempre educado e profissional
4. Peça mais informações se necessário
`;
```

## 8. Métricas e Monitoramento

### 8.1 KPIs do Sistema

- **Tempo de resposta da IA**: < 3 segundos
- **Taxa de resolução N1**: % de perguntas resolvidas pelo FAQ
- **Tempo médio de atendimento**: Por operador
- **Satisfação do cliente**: Avaliação pós-atendimento

### 8.2 Logs de Auditoria

```javascript
// Estrutura do log
{
    timestamp: Date,
    userId: ObjectId,
    action: 'message_sent' | 'ticket_created' | 'conversation_closed',
    details: Object,
    ipAddress: String,
    userAgent: String
}
```

## 9. Configurações Avançadas

### 9.1 Rate Limiting

```javascript
// Configurações de limite
const rateLimits = {
  messagesPerMinute: 10,
  ticketsPerHour: 5,
  aiRequestsPerMinute: 60,
};
```

### 9.2 Horário de Funcionamento

```javascript
// Configuração de horário
const businessHours = {
  start: '09:00',
  end: '18:00',
  timezone: 'America/Sao_Paulo',
  weekendSupport: false,
};
```

## 10. Fluxo de Escalação

### 10.1 Escalação Automática

```
FAQ → IA → Ticket → Operador → Supervisor
```

### 10.2 Critérios de Escalação

- **Tempo**: Ticket aberto há mais de 30 minutos
- **Prioridade**: Tickets urgent mantidos abertos
- **Complexidade**: Múltiplas tentativas de resolução
- **Feedback**: Cliente insatisfeito com resposta

## 11. Exemplos Práticos

### 11.1 Pergunta Simples (FAQ)

```
Cliente: "Como altero minha senha?"
IA: "Para alterar sua senha, acesse..."
Cliente: "Funcionou, obrigado!"
Sistema: Conversation fechada automaticamente
```

### 11.2 Pergunta Complexa (Ticket)

```
Cliente: "Meu bot parou de funcionar após atualização"
IA: "Entendo que você está com problema técnico. Vou criar um ticket para nosso suporte técnico."
Sistema: Ticket criado com prioridade 'high'
Operador: Recebe notificação e assume atendimento
```

### 11.3 Mensagem Ambígua

```
Cliente: "Não funciona"
IA: "Poderia me dar mais detalhes sobre o que não está funcionando? Assim posso ajudá-lo melhor."
Cliente: "O bot não responde aos comandos"
IA: [Processa com mais contexto]
```

## 12. Troubleshooting

### 12.1 Problemas Comuns

- **IA não responde**: Verificar API key do OpenRouter
- **Tickets não criados**: Verificar conexão com MongoDB
- **Conversations não fecham**: Verificar lógica de confirmação
- **Operadores não recebem notificações**: Verificar Socket.IO

### 12.2 Logs de Debug

```bash
# Habilitar logs detalhados
DEBUG=lnbot:* npm run dev

# Verificar conexões ativas
DEBUG=socket.io* npm run dev
```

## 13. Próximos Passos

## 14. Mensagens Internas (Internal Messages)

Mensagens internas são anotações de equipe associadas a uma `conversation`, visíveis apenas para operadores e não enviadas ao usuário final.

```javascript
// Estrutura da mensagem interna
{
  conversationId: ObjectId,
  authorId: ObjectId,
  content: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 13.1 Melhorias Planejadas

- [ ] Chatbot com múltiplas linguagens
- [ ] Análise de sentimento das mensagens
- [ ] Relatórios avançados de atendimento
- [ ] Integração com WhatsApp/Telegram

### 13.2 Otimizações

- [ ] Cache de respostas frequentes
- [ ] Compressão de mensagens
- [ ] Load balancing horizontal
