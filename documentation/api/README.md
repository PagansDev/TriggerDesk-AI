# API REST

Documentação completa dos endpoints da API REST.

## Base URL

```
http://localhost:3037/api
```

## Authentication

Atualmente não implementada. Todos os endpoints são públicos.

## Endpoints

### Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Users

#### Create User

```http
POST /api/users
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@exemplo.com"
}
```

**Response:**

```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "isOnline": false,
  "lastSeen": "2024-01-01T00:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get User

```http
GET /api/users/:id
```

**Response:** Mesmo formato do create user.

### Conversations

#### Create Conversation

```http
POST /api/conversations
Content-Type: application/json

{
  "userId": "user-uuid",
  "title": "Conversa de Suporte"
}
```

#### Get Conversation

```http
GET /api/conversations/:id
```

**Response:**

```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "title": "Conversa de Suporte",
  "status": "active",
  "lastMessageAt": "2024-01-01T00:00:00.000Z",
  "messages": [
    {
      "id": "uuid",
      "content": "Olá!",
      "senderId": "user-uuid",
      "messageType": "text",
      "isFromAI": false,
      "isEdited": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### List User Conversations

```http
GET /api/conversations/user/:userId
```

### Tickets

#### Create Ticket

```http
POST /api/tickets
Content-Type: application/json

{
  "conversationId": "conversation-uuid",
  "subjectId": "ticket-subject-uuid",
  "description": "Não consigo fazer login",
  "priority": "medium"
}
```

#### List Tickets

```http
GET /api/tickets?status=open&priority=high
```

**Query Parameters:**

- `status`: open, in_progress, resolved, closed
- `priority`: low, medium, high, urgent

### Internal Messages

Mensagens internas são anotações de equipe visíveis apenas para operadores e não retornam em respostas para o usuário final.

#### Create Internal Message

```http
POST /api/internal-messages
Content-Type: application/json

{
  "conversationId": "conversation-uuid",
  "authorId": "user-uuid",
  "content": "Ligar para o cliente amanhã às 10h"
}
```

#### List Internal Messages (somente operadores)

```http
GET /api/internal-messages?conversationId=conversation-uuid
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Validation Error",
  "message": "Email é obrigatório"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Usuário não encontrado"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "Erro interno do servidor"
}
```

## Rate Limiting

Não implementado atualmente.

## CORS

Configurado para aceitar requisições de qualquer origem em desenvolvimento.
