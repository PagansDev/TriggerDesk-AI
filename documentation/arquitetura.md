# Arquitetura do Sistema

Visão geral da arquitetura e design do LNBot LiveChat.

## Visão Geral

O LNBot LiveChat é um sistema de atendimento ao cliente com IA integrada, construído com arquitetura modular para suporte escalável e inteligente.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Banco de      │
│   (Popup Chat)  │◄──►│   (Node.js)     │◄──►│   Dados (MongoDB)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   OpenRouter    │
                       │   (IA Externa)  │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Sistema de    │
                       │   Tickets       │
                       └─────────────────┘
```

## Componentes Principais

### 1. Servidor Express

- **Responsabilidade**: API REST e middleware
- **Tecnologia**: Express.js
- **Porta**: 3037 (configurável)

### 2. Socket.IO Server

- **Responsabilidade**: Comunicação em tempo real
- **Tecnologia**: Socket.IO
- **Funcionalidades**: Chat, notificações, presença

### 3. Mongoose ODM

- **Responsabilidade**: Abstração do banco de dados
- **Tecnologia**: Mongoose + MongoDB
- **Funcionalidades**: Modelos, validações, queries

### 4. OpenRouter Integration

- **Responsabilidade**: Processamento de IA
- **Tecnologia**: HTTP API
- **Funcionalidades**: Respostas automáticas, contexto, FAQ

### 5. Sistema de Tickets

- **Responsabilidade**: Gestão de tickets de suporte
- **Tecnologia**: Mongoose + MongoDB
- **Funcionalidades**: Criação automática, atribuição, histórico

## 📁 Estrutura do Projeto

```
lnbot-livechat/
├── src/                    # Código fonte
│   ├── app.ts             # Ponto de entrada
│   ├── config/            # Configurações
│   ├── models/            # Modelos de dados
│   ├── services/          # Serviços externos
│   ├── sockets/           # Lógica Socket.IO
│   └── routes/            # Rotas REST
├── @types/                # Definições TypeScript
├── documentation/         # Documentação
└── dist/                  # Código compilado
```

## 🔄 Fluxo de Dados

### 1. Inicialização do Chat

```
Frontend → Socket.IO → Validação de Usuário → MongoDB
        ← Confirmação ←                    ← Dados do Usuário
```

### 2. Processamento de Mensagem

```
Cliente → Socket.IO → Validação → Persistência → OpenRouter
       ← Confirmação ←          ← MongoDB    ← IA Processing
       ← Resposta IA ←                        ← Resposta
```

### 3. Fluxo de IA e Tickets

```
Mensagem → OpenRouter → Análise → Decisão
         ← Resposta ←           ← FAQ/Erro/Ticket
         ← Broadcast ←          ← Clientes/Operadores
```

### 4. Criação de Ticket

```
IA Decision → Ticket Service → MongoDB → Operadores
           ← Confirmação ←            ← Notificação
           ← Protocolo ←              ← Interface
```

## 🎯 Padrões Arquiteturais

### 1. MVC (Model-View-Controller)

- **Models**: Definições de dados (Mongoose)
- **Views**: Respostas JSON (API REST)
- **Controllers**: Lógica de negócio (Services)

### 2. Repository Pattern

- **Abstração**: Acesso aos dados
- **Implementação**: Modelos Mongoose
- **Benefício**: Facilita testes e mudanças

### 3. Service Layer

- **Responsabilidade**: Lógica de negócio
- **Exemplo**: `openRouterService.ts`
- **Benefício**: Reutilização e manutenção

### 4. Event-Driven Architecture

- **Socket.IO**: Eventos em tempo real
- **Benefício**: Desacoplamento e escalabilidade

## 🔧 Configuração e Ambiente

### Variáveis de Ambiente

```env
# Servidor
NODE_ENV=development|production
PORT=3037

# MongoDB
MONGODB_URI=mongodb://localhost:27017/lnbot_livechat
MONGODB_DB_NAME=lnbot_livechat

# OpenRouter
OPENROUTER_API_KEY=chave
OPENROUTER_MODEL=openai/gpt-3.5-turbo
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Sistema de Tickets
TICKET_AUTO_ASSIGN=true
TICKET_PRIORITY_DEFAULT=medium
```

### Configuração por Ambiente

| Ambiente    | NODE_ENV    | Logs       | Debug    |
| ----------- | ----------- | ---------- | -------- |
| Development | development | Detalhados | Ativo    |
| Production  | production  | Essenciais | Desativo |

## 📊 Modelos de Dados

### Relacionamentos

```
User (1) ──→ (N) Conversation
                │
                └──→ (N) Message
                │
                └──→ (0..1) Ticket
                │
                └──→ (0..1) FAQ/System Prompt
```

### Entidades Principais

1. **User**: Usuários do sistema com external_user_id
2. **Conversation**: Conversas com status (active/closed/archived)
3. **Message**: Mensagens individuais com tipo e origem (IA/Human)
4. **Ticket**: Tickets de suporte com prioridade e status
5. **FAQ**: Base de conhecimento para respostas automáticas

## 🔒 Segurança

### 1. Validação de Dados

- **Input**: Validação de entrada
- **Sanitização**: Limpeza de dados
- **TypeScript**: Verificação de tipos

### 2. Rate Limiting

- **Socket.IO**: Limite de eventos
- **API**: Limite de requisições
- **IA**: Limite de chamadas

### 3. Logs de Auditoria

- **Ações**: Registro de operações
- **Erros**: Log de falhas
- **Performance**: Métricas de uso

## 🚀 Escalabilidade

### 1. Horizontal Scaling

- **Load Balancer**: Distribuição de carga
- **Múltiplas instâncias**: Servidores paralelos
- **Sticky Sessions**: Socket.IO clustering

### 2. Vertical Scaling

- **Recursos**: CPU e memória
- **Otimização**: Queries e cache
- **Monitoramento**: Métricas de performance

### 3. Database Scaling

- **Read Replicas**: Leitura distribuída
- **Connection Pooling**: Pool de conexões
- **Indexing**: Otimização de queries

## 📈 Monitoramento

### 1. Métricas de Sistema

- **CPU**: Uso de processamento
- **Memória**: Consumo de RAM
- **Disco**: Espaço em disco
- **Rede**: Tráfego de dados

### 2. Métricas de Aplicação

- **Usuários**: Usuários conectados
- **Mensagens**: Taxa de mensagens
- **IA**: Chamadas para OpenRouter
- **Erros**: Taxa de erro

### 3. Logs Estruturados

- **Nível**: DEBUG, INFO, WARN, ERROR
- **Formato**: JSON estruturado
- **Rotação**: Logs por data/tamanho

## 🔄 Ciclo de Vida

### 1. Desenvolvimento

- **Local**: Ambiente de desenvolvimento
- **Testes**: Testes unitários e integração
- **Code Review**: Revisão de código

### 2. Deploy

- **Build**: Compilação TypeScript
- **Testes**: Validação automática
- **Deploy**: Implantação em produção

### 3. Manutenção

- **Monitoramento**: Acompanhamento contínuo
- **Updates**: Atualizações de segurança
- **Backup**: Backup regular dos dados

## 🎯 Próximos Passos

Para entender melhor cada componente:

1. [Desenvolvimento](./desenvolvimento.md) - Configuração e convenções
2. [API REST](./api-rest.md) - Endpoints e exemplos
3. [Socket.IO](./socket-io.md) - Eventos em tempo real
4. [Banco de Dados](./banco-dados.md) - Estrutura e relacionamentos
