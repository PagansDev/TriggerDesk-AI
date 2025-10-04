# TypeScript Types

Definições de tipos TypeScript organizadas por contexto.

## Structure

```
@types/
├── models/           # Model data types
├── sockets/          # Socket.IO types
├── services/         # External service types
├── global.d.ts       # Global definitions
└── index.d.ts        # Centralized exports
```

## Model Types

### User Types

```typescript
interface UserAttributes {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Message Types

````typescript
type MessageType = 'text' | 'image' | 'file' | 'system';

interface MessageAttributes {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  isFromAI: boolean;
  isEdited: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
### InternalMessage Types

```typescript
interface InternalMessageAttributes {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
````

Mensagens internas são anotações visíveis apenas para a equipe de suporte e não são exibidas ao usuário final.

````

### Ticket Types

```typescript
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface TicketAttributes {
  id: string;
  conversationId: string;
  assignedTo?: string;
  priority: TicketPriority;
  status: TicketStatus;
  subjectId: string;
  description?: string;
  tags?: string[];
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
````

## Socket Types

### Chat Socket

```typescript
interface ChatSocket extends Socket {
  userId?: string;
  conversationId?: string;
}
```

### Event Data

```typescript
interface JoinConversationData {
  userId: string;
  conversationId: string;
}

interface SendMessageData {
  conversationId: string;
  content: string;
  messageType?: MessageType;
}
```

## Service Types

### OpenRouter Types

```typescript
type OpenRouterRole = 'system' | 'user' | 'assistant';

interface OpenRouterMessage {
  role: OpenRouterRole;
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
```

## Global Types

### Environment Variables

```typescript
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      MONGODB_URI: string;
      MONGODB_DB_NAME: string;
      OPENROUTER_API_KEY: string;
      OPENROUTER_MODEL: string;
    }
  }
}
```

## Usage

### Import Types

```typescript
import type { UserAttributes, TicketPriority } from '../../@types/models/user';
import type { ChatSocket } from '../../@types/sockets/chat';
import type { OpenRouterMessage } from '../../@types/services/openRouter';
```

### Type Guards

```typescript
function isMessageType(value: string): value is MessageType {
  return ['text', 'image', 'file', 'system'].includes(value);
}
```

## Best Practices

### Type Organization

- Agrupar por contexto funcional
- Usar interfaces para objetos
- Usar types para unions
- Exportar via index.d.ts

### Naming Conventions

- Interfaces: PascalCase
- Types: PascalCase
- Enums: PascalCase
- Generic types: T, K, V

### Documentation

- JSDoc para interfaces públicas
- Exemplos de uso
- Validações de tipo
- Changelog de mudanças
