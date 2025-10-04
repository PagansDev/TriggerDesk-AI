# Database

Estrutura do banco de dados e relacionamentos com MongoDB/Mongoose.

## Schema Overview

### Collections

- `users`
- `conversations`
- `messages` (inclui `isEdited`)
- `internal_messages` (visíveis apenas para equipe)
- `tickets`
- `ticket_subjects` (assuntos padrão com prioridade)

## Collection Details

### users

```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string",
  "avatar": "string?",
  "isOnline": "boolean",
  "lastSeen": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### conversations

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "title": "string",
  "status": "active|closed|archived",
  "lastMessageAt": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### messages

```json
{
  "_id": "ObjectId",
  "conversationId": "ObjectId",
  "senderId": "ObjectId",
  "content": "string",
  "messageType": "text|image|file|system",
  "isFromAI": "boolean",
  "isEdited": "boolean",
  "metadata": "object?",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### tickets

```json
{
  "_id": "ObjectId",
  "conversationId": "ObjectId",
  "assignedTo": "ObjectId?",
  "priority": "low|medium|high|urgent",
  "status": "open|in_progress|resolved|closed|reopened|archived",
  "subjectId": "ObjectId",
  "description": "string?",
  "tags": ["string"],
  "resolvedAt": "Date?",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### ticket_subjects

```json
{
  "_id": "ObjectId",
  "name": "string",
  "defaultPriority": "low|medium|high|urgent",
  "description": "string?",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Relationships

### One-to-Many

- User → Conversations
- Conversation → Messages
- Conversation → Ticket
- TicketSubject → Tickets

### References (ObjectId)

- `conversations.userId` → `users._id`
- `messages.conversationId` → `conversations._id`
- `messages.senderId` → `users._id`
- `tickets.conversationId` → `conversations._id`
- `tickets.assignedTo` → `users._id`
- `tickets.subjectId` → `ticket_subjects._id`

## Indexes

### Primary Indexes

- `_id` em todas as coleções

### Reference Indexes

- `conversations.userId`
- `messages.conversationId`
- `messages.senderId`
- `tickets.conversationId`
- `tickets.subjectId`

### Performance Indexes

- `conversations.lastMessageAt`
- `messages.createdAt`
- `tickets.status`
- `tickets.priority`

## Data Types

### ObjectId

IDs são `ObjectId` do MongoDB.

### Enums

- `conversation.status`: active, closed, archived
- `message.messageType`: text, image, file, system
- `ticket.priority`: low, medium, high, urgent
- `ticket.status`: open, in_progress, resolved, reopened, closed, archived

### Fields

- `messages.metadata`: Objeto livre com dados adicionais
- `tickets.tags`: Array de strings

## Migrations

Não há migrações formais; o schema é definido pelos modelos Mongoose.

## Seeding

Implemente seeds via scripts Node (ex.: `npm run seed`).

## Backup & Restore

Use ferramentas do MongoDB (`mongodump` e `mongorestore`).

## Performance

### Query Optimization

- Use indexes apropriados
- Evite SELECT \*
- Use LIMIT para listagens
- Implemente paginação

### Connection Pooling

Gerenciado pelo driver do MongoDB; configure via URI.

## Monitoring

### Slow Queries

```sql
SHOW VARIABLES LIKE 'slow_query_log';
SET GLOBAL slow_query_log = 'ON';
```

### Query Analysis

```sql
EXPLAIN SELECT * FROM messages WHERE conversationId = 'uuid';
```

## Security

### Data Protection

- Senhas hasheadas (quando implementadas)
- Dados sensíveis criptografados
- Logs de auditoria
- Backup regular

### Access Control

- Usuários com permissões mínimas
- Conexões SSL em produção
- Validação de entrada
- Sanitização de dados
