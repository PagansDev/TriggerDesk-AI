# PagansDev - LiveChat

Sistema de chat em tempo real com integração de IA especializada para atendimento ao cliente, desenvolvido com Node.js, TypeScript, Socket.IO e MongoDB.

## Características Principais

- **Chat em tempo real** com Socket.IO para comunicação instantânea
- **IA especializada** via OpenRouter com prompts modulares em arquivos Markdown
- **Respostas estruturadas em JSON** para trigger de ações no backend
- **Múltiplas conversas** e tickets por usuário
- **Sistema de usuários** com sincronização automática
- **Gerenciamento de conversas** com histórico persistente e contexto
- **Sistema de tickets** para suporte técnico especializado (N2)
- **Contexto de suporte** com dados em tempo real do usuário
- **API REST** completa para operações CRUD
- **TypeScript** para maior segurança de tipos
- **MongoDB** com Mongoose (ODM)

## Estrutura do Projeto

```
pagansdev-livechat/
├── src/                      # Código fonte da aplicação
│   ├── app.ts               # Inicialização do Express + Socket.IO
│   ├── config/
│   │   └── database.ts      # Configuração do MongoDB
│   ├── controllers/         # Controladores da aplicação
│   │   └── chat.controller.ts # Controlador do chat
│   ├── middlewares/         # Middlewares customizados
│   ├── models/              # Modelos Mongoose
│   │   ├── User.ts          # Modelo de usuário
│   │   ├── Conversation.ts  # Modelo de conversa
│   │   ├── Message.ts       # Modelo de mensagem
│   │   ├── InternalMessage.ts # Mensagens internas da equipe
│   │   ├── Ticket.ts        # Modelo de ticket
│   │   ├── TicketSubject.ts # Assuntos de tickets
│   │   └── index.ts         # Exportações dos modelos
│   ├── services/            # Serviços de negócio
│   │   ├── chat.service.ts  # Serviço principal do chat
│   │   ├── conversation.service.ts # Gerenciamento de conversas
│   │   ├── message.service.ts # Gerenciamento de mensagens
│   │   ├── openRouter.service.ts # Integração com OpenRouter
│   │   ├── promptLoader.service.ts # Carregamento de prompts
│   │   └── userSync.service.ts # Sincronização de usuários
│   ├── sockets/             # Lógica Socket.IO
│   │   └── chat.ts          # Eventos e handlers do chat
│   ├── routes/              # Rotas REST
│   ├── utils/               # Utilitários
│   └── types/               # Definições de tipos TypeScript
├── SYSTEM_PROMPTS/          # Prompts modulares em Markdown
│   ├── 00-important.md      # Considerações importantes
│   ├── 01-base-identity.md  # Identidade base da IA
│   ├── 02-response-format.md # Formato de resposta JSON
│   ├── 03-definitions.md    # Definições técnicas
│   ├── 04-business-flow-summary.md # Resumo dos fluxos de negócio
│   └── 05-behavioral-rules.md # Regras comportamentais
├── @types/                  # Definições de tipos customizados
├── docker-compose.yml       # Configuração dos serviços Docker
├── .env                     # Variáveis de ambiente
├── package.json             # Dependências e scripts
└── README.md               # Documentação do projeto
```

## Serviços Docker

O projeto utiliza os seguintes serviços containerizados:

- **MongoDB 6.0.18** - Banco de dados principal

  - Porta: 27017
  - Usuário: livechat / Senha: live123
  - Volume persistente para dados

- **Mongo Express** - Interface web para MongoDB
  - Porta: 8081
  - Acesso: http://localhost:8081
  - Sem autenticação adicional necessária

## Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **TypeScript** - Linguagem de programação com tipagem estática
- **Express.js** - Framework web para APIs REST
- **Socket.IO** - Comunicação em tempo real bidirecional
- **Mongoose** - ODM para MongoDB com validação de schemas
- **MongoDB** - Banco de dados documental NoSQL
- **OpenRouter** - Integração com modelos de IA via API
- **Docker & Docker Compose** - Containerização dos serviços
- **Mongo Express** - Interface web para administração do MongoDB
- **Axios** - Cliente HTTP para requisições à API da IA
- **UUID** - Geração de identificadores únicos

## Sistema de Prompts Modulares

O sistema utiliza prompts modulares organizados em arquivos Markdown para facilitar manutenção e versionamento:

### Estrutura dos Prompts

- **00-important.md** - Considerações importantes e correções pontuais
- **01-base-identity.md** - Identidade e propósito da IA
- **02-response-format.md** - Formato obrigatório de resposta JSON
- **03-definitions.md** - Definições técnicas e terminologia
- **04-business-flow-summary.md** - Manual completo de lógica de negócio
- **05-behavioral-rules.md** - Regras comportamentais da IA

### Características

- **Carregamento dinâmico** na inicialização da aplicação
- **Ordenação automática** por numeração nos nomes dos arquivos
- **Contexto contextual** combinado com dados do usuário
- **Versionamento** facilitado através de arquivos separados
- **Manutenção simplificada** sem necessidade de recompilação

## Configuração

### 1. Instalação das Dependências

```bash
npm install
```

### 2. Configuração do Banco de Dados com Docker

O projeto utiliza Docker Compose para facilitar a configuração do MongoDB e Mongo Express.

**Iniciar os serviços:**

```bash
docker compose up -d
```

**Verificar status dos containers:**

```bash
docker ps
```

**Acessar interface web do MongoDB:**

- Abra o navegador em: `http://localhost:8081`
- Interface web completa para gerenciar o banco de dados

### 3. Configuração das Variáveis de Ambiente

Configure as variáveis no arquivo `.env`:

```env
# MongoDB
MONGODB_URI=mongodb://livechat:live123@localhost:27017/pagansdev_livechat?authSource=admin

# Servidor
PORT=3037
NODE_ENV=development
FRONTEND_URL=http://localhost:{port}

# OpenRouter
OPENROUTER_API_KEY=sua_chave_api
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=x-ai/grok-4-fast

# Tickets
TICKET_AUTO_ASSIGN=true
TICKET_PRIORITY_DEFAULT=medium


#JWT SECRET (MESMO DO BACKEND do sistema a ser integrado)
JWT_SECRET=
```

### 4. Execução

```bash
# Desenvolvimento
tsc
npm run dev

# Produção
npm run build
npm start
```

### 5. Gerenciamento dos Serviços Docker

```bash
# Parar todos os serviços
docker compose down

# Parar e remover volumes (limpar dados)
docker compose down -v

# Ver logs dos serviços
docker logs <nome-mongodb>
docker logs <nome-mongo-express>

# Reiniciar apenas o MongoDB
docker compose restart mongodb
```

## Funcionalidades

### Chat em Tempo Real

- Mensagens instantâneas via Socket.IO
- Indicador de digitação
- Controle de presença online/offline
- Suporte a diferentes tipos de mensagem (texto, imagem, arquivo, sistema)
- Edição de mensagens com flag `isEdited`
- Mensagens internas para anotações de equipe (não visíveis ao cliente)

### Integração com IA Especializada

- **Respostas estruturadas em JSON** com campos obrigatórios (status, action, priority, reply)
- **Prompts modulares** carregados dinamicamente de arquivos Markdown
- **Contexto de suporte** com dados em tempo real definidos pela implementação do contexto de suporte
- **Especialização** com conhecimento técnico passado pelos arquivos .md que você definir
- **Trigger de ações** no backend baseado no campo "action" da resposta JSON
- **Configuração flexível** de modelos de IA via OpenRouter

### Gerenciamento de Usuários

- **Sincronização automática** de usuários externos
- Criação e busca de usuários com `externalUserId`
- Controle de status online/offline em tempo real
- Timestamp de última visualização
- Suporte a múltiplas conversas por usuário

### Sistema de Conversas

- **Criação automática** de conversas por usuário na primeira conexão
- Histórico completo de mensagens com contexto mantido
- **Múltiplas conversas** por usuário com títulos personalizados(em desenvolvimento)
- Ordenação por última mensagem
- Status de conversas (active, closed, archived)
- **Mensagens internas** separadas para anotações da equipe dentro das conversas

### Sistema de Tickets

- **Criação automática** de tickets via trigger de ações da IA
- Prioridades configuráveis (low, medium, high, urgent)
- **Assuntos pré-definidos** com prioridades padrão
- Status de tickets com workflow completo
- Filtros por status e prioridade
- **Integração com ações da IA** para criação automática quando necessário

## API Endpoints

### Usuários

- `GET /api/users/:id` - Buscar usuário por ID

### Conversas

- `GET /api/conversations/:id` - Buscar conversa com mensagens
- `GET /api/conversations/user/:userId` - Listar conversas do usuário

### Tickets

- `POST /api/tickets` - Criar ticket manualmente, caso seja necessário
- `GET /api/tickets` - Listar tickets (com filtros opcionais)

## Socket.IO Events

### Cliente → Servidor

- `send_message` - Enviar mensagem com contexto de suporte opcional
  ```javascript
  {
    content: "Mensagem do usuário",
    supportContext: {
      //informações do usuário, como histórico, configuraçoes e afins interceptadas do front-end alvo e cacheadas do indexed db
    }
  }
  ```

### Servidor → Cliente

- `connected` - Confirmação de conexão com histórico
- `new_message` - Nova mensagem recebida (usuário ou IA)
- `error` - Erro na operação

### Contexto de Suporte

- **Dados em tempo real** enviados com cada mensagem
- Configurações completas do usuário (configurações, histórico, licença, etc.)
- **Análise contextual** pela IA baseada nos dados fornecidos

### Respostas Estruturadas da IA

- **Formato JSON obrigatório** com campos:
  - `status`: Status da resposta (ex: "NEED_TICKET", "N1_OK")
  - `action`: Ação a ser executada (ex: "create_ticket", "close_conversation")
  - `priority`: Prioridade da ação (ex: "high", "medium", "low")
  - `reply`: Mensagem a ser enviada ao usuário

## Exemplo de Uso

### Conectar ao Socket.IO

```javascript
const socket = io('http://localhost:3037');

// A conexão é automática - o sistema cria conversa se necessário
socket.on('connected', (data) => {
  console.log('Conectado:', data);
  // data contém: userId, username, conversationId, history
});

// Enviar mensagem com contexto de suporte
socket.emit('send_message', {
  content: 'Olá, preciso de ajuda com minha configuração!',
  supportContext: {
    userConfig: {
      //...
      lastUpdate: '2024-01-15T10:30:00Z',
    },
    userHistory: {
      license: { valid: true, plan: 'premium' },
      //...etc
    },
  },
});

// Escutar novas mensagens (usuário e IA)
socket.on('new_message', (message) => {
  console.log('Nova mensagem:', message);
  // message contém: id, content, isFromAI, createdAt
});

// Escutar erros
socket.on('error', (error) => {
  console.error('Erro no chat:', error);
});
```

### Criação de Usuário via websocket

- O front-end envia junto a conexão de websocket dados como userId, ou cookie/token a ser decodificado
- O livechat possui uma cópia do secret do backend que é usado para validar e resgatar dados do token sem interação necessária com backend original
- Tendo o userId em mão, o sistema o trata como externalUserId a partir de então, e é criado um usuário com esse campo que serve como pivô entre os dois serviços.

## Scripts Disponíveis

- `npm run build` - Compila TypeScript para JavaScript
- `npm run build:watch` - Compila TypeScript em modo watch
- `npm run dev` - Executa em modo desenvolvimento com watch
- `npm start` - Executa versão compilada
- `npm test` - Executa testes (ainda não implementado)

## Estrutura do Banco de Dados

O sistema utiliza MongoDB com Mongoose e as seguintes coleções principais:

- `users` - Dados dos usuários com sincronização externa
- `conversations` - Conversas com status e múltiplas por usuário
- `messages` - Mensagens das conversas com contexto completo
- `internal_messages` - Mensagens internas da equipe (separadas das públicas)
- `tickets` - Tickets de suporte com prioridades e assuntos
- `ticketsubjects` - Assuntos pré-definidos de tickets com prioridades padrão

### Características Especiais

- **Índices otimizados** para consultas por usuário e status
- **Referências entre coleções** para integridade referencial
- **Timestamps automáticos** em todas as coleções
- **Criação automática** das coleções na primeira execução

## Funcionalidades Avançadas

### Sistema de LiveChat Inteligente com Triggers Automáticos

O Pagans LiveChat implementa um sistema de chat em tempo real que vai muito além de um simples chatbot, funcionando como um **assistente virtual especializado** que:

- **Analisa o contexto completo** do usuário em tempo real
- **Interpreta configurações** do usuário na plataforma alvo
- **Fornece respostas especializadas** baseadas no conhecimento técnico passado via .md
- **Dispara ações automáticas** no backend baseadas na análise da conversa

### Sistema de Triggers Inteligentes

A grande inovação está no **sistema de triggers automáticos** que funciona através de respostas JSON estruturadas:

```javascript
// Resposta da IA sempre em formato estruturado
{
  "status": "NEED_TICKET",           // Status da situação
  "action": "create_ticket",         // Ação a ser executada
  "priority": "high",                // Prioridade do ticket
  "reply": "Mensagem para o usuário" // Resposta amigável
}
```

**Ações Automáticas Disponíveis:**

- `create_ticket` - Cria ticket automaticamente
- `close_conversation` - Fecha conversa quando resolvida
- `flag_message` - adiciona ao contador de spam da conversa
- `ban_user` - bane o usuário do chat por quebra grave de politica ou spam por 24h

**Armazenamento em IndexedDB:**

- Dados persistidos localmente no navegador
- Cache inteligente de configurações do usuário
- Histórico de problemas e soluções
- Sincronização automática com o backend

### Economia Significativa em Suporte N1

O sistema reduz drasticamente a carga do suporte N1 através de:

**1. Resolução Automática de Problemas Comuns:**

- Configurações incorretas
- Dúvidas sobre funcionamento das features
- Orientação sobre problemas e suas soluções

**2. Análise Inteligente do Contexto:**

- A IA tem acesso completo às configurações do usuário
- Analisa histórico de problemas similares
- Fornece soluções específicas baseadas no perfil do usuário
- Evita escalações desnecessárias

**3. Triagem Automática:**

- Identifica problemas complexos que precisam de N2
- Cria tickets pré-classificados com contexto completo
- Direciona usuários para recursos específicos
- Reduz tempo de resolução

### Direcionamento Inteligente N1 → N2

O sistema implementa **escalação inteligente** baseada em análise de contexto:

**Critérios para Escalação Automática:**

- Problemas técnicos complexos
- Configurações que requerem intervenção manual
- Bugs reportados pelo usuário
- Solicitações de features específicas

**Benefícios da Escalação Inteligente:**

- Tickets chegam ao N2 com contexto completo em conversa com histórico
- Reduz tempo de triagem
- Melhora qualidade do atendimento
- Aumenta satisfação do usuário

### Arquitetura Similar ao Chatwoot

O sistema implementa funcionalidades avançadas similares ao Chatwoot:

**1. Multi-tenant com Contexto Específico:**

- Cada usuário tem seu contexto único
- Múltiplas conversas por usuário
- Histórico completo preservado
- Status de conversas (active, closed, archived)
- Atribuição de operador

**2. Sistema de Tickets Integrado:**

- Criação automática via triggers da IA
- Priorização inteligente baseada no contexto
- Assuntos definidos dinamicamente com categorização
- Workflow completo de resolução

**3. Mensagens Internas:**

- Anotações da equipe separadas das mensagens públicas
- Sistema de escalação com contexto
- Colaboração entre agentes N1 e N2

### Integração com Sistema Existente

O sistema foi projetado para **integração transparente** com o frontend existente:

**Implementação Simples:**

```typescript
// Conectar ao livechat
const socket = io('http://localhost:3037');

// Enviar mensagem com contexto automático
socket.emit('send_message', {
  content: userMessage,
  supportContext: getCurrentUserContext(), // Função que coleta dados atuais
});
```

#### Alterações no front-end

- O front end por sua vez precisa implementar os componentes de chat: ChatTrigger, ChatPopUp, ChatWindow, ChatMessage, tela para operadores de suporte
- O sistema de interceptação de requsições com informações importantes e relevantes ao contexto do suporte e cacheamento no indexed db
- Após definir a estrutura de dados das informações interceptadas pelo front-end, deverá ser criado no livechat o type de contexto de suporte que represente essa estrutura
- O handler que irá buscar esses dados em cache e mandar via conexão websocket no envio da mensagem
