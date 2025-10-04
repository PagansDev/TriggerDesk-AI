# Requisitos Funcionais - LNBot LiveChat

## 1. Fluxo Principal de Atendimento

### 1.1 Inicialização do Chat

- Usuário acessa o livechat através de popup no front-end
- Front-end envia conexão via websocket contendo `user_id` e `message_content`
- Sistema estabelece conexão em tempo real

### 1.2 Processamento de Usuário

O sistema recebe o payload e executa:

1. **Busca de Usuário**: Procura o `user_id` na tabela de usuários como `external_user_id`
2. **Criação de Usuário** (se não encontrado):
   - Cria novo usuário com `id` e `external_user_id`
   - Cria nova `conversation`
   - Insere mensagem no histórico
   - Retorna confirmação
3. **Usuário Existente** (se encontrado):
   - Insere mensagem no histórico da conversation
   - Atualiza status se necessário
   - Prossegue com processamento

## 2. Fluxo de Mensagens com IA

### 2.1 Processamento de Mensagem

1. Cliente envia mensagem (`user_id`, `message_content`)
2. Sistema valida persistência conforme fluxo acima
3. Altera status da conversation para `open`
4. Envia `message_content` para `openRouterService` com:
   - `system_prompt` (instruções e FAQ)
   - `conversation_id`
   - `conversation_context`

### 2.2 Respostas da IA

O `openRouterService` retorna diferentes tipos de resposta:

#### 2.2.1 Mensagem Ambígua/Inapropriada

- Exibe mensagem de erro
- Solicita mais informações do usuário
- Mantém conversation em status `open`

#### 2.2.2 Mensagem Entendida + Resposta N1 Disponível

- Retorna mensagem com trecho do FAQ ou instruções
- Aguarda confirmação de solução do usuário
- Se confirmada: fecha conversation
- Se não confirmada: mantém aberta

#### 2.2.3 Mensagem Entendida + Sem Resposta N1

- Abre ticket automaticamente
- Disponibiliza protocolo de atendimento
- Conecta com operador humano
- Status: `ticket_created`

## 3. Fluxo de Suporte Humano

### 3.1 Interface de Operadores

Operadores de suporte acessam tela contendo:

1. **Lista de Conversations**:

   - Agrupadas por prioridade e status
   - Ordem: `open` > `closed` > `archived`
   - Filtros por status, prioridade e busca por usuários

2. **Gestão de Tickets**:

   - Tickets abertos agrupados por usuário
   - Histórico completo de atendimentos
   - Status de cada ticket (open, in_progress, resolved, etc.)

3. **Ferramentas de Atendimento**:
   - Filtros avançados
   - Busca por usuários
   - Histórico de conversations
   - Métricas de atendimento

## 4. Estados do Sistema

### 4.1 Status de Conversations

- `active`: Conversation ativa e aberta
- `closed`: Conversation fechada pelo sistema ou usuário
- `archived`: Conversation arquivada para histórico

### 4.2 Status de Tickets

- `open`: Ticket criado, aguardando atendimento
- `in_progress`: Ticket em atendimento por operador
- `resolved`: Ticket resolvido
- `reopened`: Ticket reaberto após resolução
- `archived`: Ticket arquivado
- `closed`: Ticket fechado definitivamente

### 4.3 Prioridades

- `urgent`: Crítica, atendimento imediato
- `high`: Alta prioridade
- `medium`: Prioridade média (padrão)
- `low`: Baixa prioridade

## 5. Integração com IA

### 5.1 System Prompt

O sistema utiliza prompts contextuais incluindo:

- Instruções de atendimento
- Base de conhecimento (FAQ)
- Políticas da empresa
- Tom de voz padronizado

### 5.2 Contexto da Conversation

- Histórico das últimas 10 mensagens
- Informações do usuário
- Status da conversation
- Tickets relacionados

## 6. Requisitos Técnicos

### 6.1 Performance

- Resposta da IA < 3 segundos
- Mensagens em tempo real < 100ms
- Disponibilidade 99.9%

### 6.2 Segurança

- Validação de entrada
- Rate limiting
- Logs de auditoria
- Criptografia de dados sensíveis

### 6.3 Escalabilidade

- Suporte a múltiplos usuários simultâneos
- Pool de conexões de banco
- Cache de respostas frequentes
- Load balancing horizontal
