# Socket.IO

Documentação dos eventos Socket.IO para comunicação em tempo real.

## Connection

```javascript
const socket = io('http://localhost:3037');
```

## Client Events

### join_conversation

Entrar em uma conversa específica.

```javascript
socket.emit('join_conversation', {
  userId: 'user-uuid',
  conversationId: 'conversation-uuid',
});
```

**Data:**

- `userId` (string): ID do usuário
- `conversationId` (string): ID da conversa

### send_message

Enviar uma mensagem na conversa atual.

```javascript
socket.emit('send_message', {
  content: 'Olá, preciso de ajuda!',
  messageType: 'text',
});
```

**Data:**

- `content` (string): Conteúdo da mensagem
- `messageType` (string, opcional): Tipo da mensagem (text, image, file, system)

### typing

Indicar que está digitando.

```javascript
socket.emit('typing', {
  isTyping: true,
});
```

**Data:**

- `isTyping` (boolean): Status de digitação

## Server Events

### new_message

Nova mensagem recebida na conversa.

```javascript
socket.on('new_message', (message) => {
  console.log('Nova mensagem:', message);
});
```

**Data:**

```json
{
  "id": "uuid",
  "content": "Conteúdo da mensagem",
  "senderId": "user-uuid",
  "messageType": "text",
  "isFromAI": false,
  "isEdited": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### internal_note (somente operadores)

Cria uma mensagem interna na conversa. Não é enviada para o cliente.

```javascript
socket.emit('internal_note', {
  conversationId: 'conversation-uuid',
  content: 'Aguardar retorno do time de billing',
});
```

### user_typing

Usuário está digitando.

```javascript
socket.on('user_typing', (data) => {
  console.log('Usuário digitando:', data);
});
```

**Data:**

```json
{
  "userId": "user-uuid",
  "isTyping": true
}
```

### error

Erro na operação.

```javascript
socket.on('error', (error) => {
  console.error('Erro:', error);
});
```

**Data:**

```json
{
  "message": "Descrição do erro"
}
```

## Connection States

### connect

Conexão estabelecida com sucesso.

```javascript
socket.on('connect', () => {
  console.log('Conectado ao servidor');
});
```

### disconnect

Conexão perdida.

```javascript
socket.on('disconnect', (reason) => {
  console.log('Desconectado:', reason);
});
```

## Error Handling

### Common Errors

- `Usuário não está em uma conversa`: Tentativa de enviar mensagem sem estar em uma conversa
- `Erro ao entrar na conversa`: Falha ao validar dados de entrada
- `Erro ao enviar mensagem`: Falha ao processar mensagem

### Error Recovery

```javascript
socket.on('error', (error) => {
  // Implementar lógica de recuperação
  if (error.message.includes('conversa')) {
    // Reentrar na conversa
    socket.emit('join_conversation', conversationData);
  }
});
```

## Best Practices

### Connection Management

- Reconectar automaticamente em caso de desconexão
- Verificar status da conexão antes de enviar eventos
- Implementar timeout para operações críticas

### Message Handling

- Validar dados antes de enviar
- Implementar retry para mensagens importantes
- Mostrar status de entrega quando possível

### Performance

- Evitar enviar eventos desnecessários
- Implementar debounce para eventos de digitação
- Limitar tamanho das mensagens
