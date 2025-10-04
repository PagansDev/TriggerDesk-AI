# Início Rápido

Guia para começar a usar o LNBot LiveChat rapidamente.

## 📋 Pré-requisitos

- Node.js 18+
- MongoDB 6.0+
- npm ou yarn
- Conta no OpenRouter (para IA)

## ⚡ Instalação Rápida

### 1. Clone o repositório

```bash
git clone https://github.com/lnbot-app/lnbot-livechat.git
cd lnbot-livechat
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o ambiente

Copie o arquivo de exemplo e configure suas variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Servidor
PORT=3037
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/lnbot_livechat
MONGODB_DB_NAME=lnbot_livechat

# OpenRouter (IA)
OPENROUTER_API_KEY=sua_chave_api
OPENROUTER_MODEL=openai/gpt-3.5-turbo
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Sistema de Tickets
TICKET_AUTO_ASSIGN=true
TICKET_PRIORITY_DEFAULT=medium
```

### 4. Execute o projeto

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 🎯 Primeiro Uso

### 1. Verificar se está funcionando

Acesse: `http://localhost:3037/api/health`

Deve retornar:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Conectar ao chat

```bash
curl -X POST http://localhost:3037/api/chat/connect \
  -H "Content-Type: application/json" \
  -d '{
    "externalUserId": "user-123",
    "username": "João Silva"
  }'
```

### 3. Conectar via Socket.IO

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3037');

socket.on('connect', () => {
  console.log('Conectado!');

  // Entrar em uma conversa
  socket.emit('join_conversation', {
    userId: 'user-uuid',
    conversationId: 'conversation-uuid',
  });

  // Enviar mensagem
  socket.emit('send_message', {
    content: 'Olá, preciso de ajuda',
    messageType: 'text',
  });
});
```

## 🔧 Configuração Básica

### Banco de Dados

O Mongoose criará automaticamente as coleções na primeira execução. Certifique-se de que:

1. O MongoDB está rodando
2. O banco de dados existe
3. A string de conexão está correta no `.env`

### OpenRouter (IA)

1. Crie uma conta em [OpenRouter](https://openrouter.ai)
2. Gere uma API key
3. Configure no arquivo `.env`

## 📱 Exemplo Completo

### Frontend (HTML + JavaScript)

```html
<!DOCTYPE html>
<html>
  <head>
    <title>LNBot LiveChat</title>
    <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
  </head>
  <body>
    <div id="messages"></div>
    <input type="text" id="messageInput" placeholder="Digite sua mensagem..." />
    <button onclick="sendMessage()">Enviar</button>

    <script>
      const socket = io('http://localhost:3037');

      socket.on('connect', () => {
        console.log('Conectado ao servidor');
      });

      socket.on('new_message', (message) => {
        const div = document.createElement('div');
        div.textContent = `${message.senderId}: ${message.content}`;
        document.getElementById('messages').appendChild(div);
      });

      function sendMessage() {
        const input = document.getElementById('messageInput');
        socket.emit('send_message', {
          content: input.value,
          messageType: 'text',
        });
        input.value = '';
      }
    </script>
  </body>
</html>
```

## ⚠️ Problemas Comuns

### Erro de conexão com banco

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solução**: Verifique se o MongoDB está rodando e a string de conexão está correta.

### Erro de API do OpenRouter

```
Error: Invalid API key
```

**Solução**: Verifique se a chave da API está correta no arquivo `.env`.

### Porta já em uso

```
Error: listen EADDRINUSE :::3037
```

**Solução**: Mude a porta no arquivo `.env` ou pare o processo que está usando a porta.

## 🎉 Próximos Passos

Agora que você tem o sistema funcionando:

1. Leia a [documentação da API](./api-rest.md)
2. Explore os [eventos do Socket.IO](./socket-io.md)
3. Configure a [integração com IA](./integracao-ia.md)
4. Consulte a [documentação de desenvolvimento](./desenvolvimento.md)

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do console
2. Consulte a documentação específica
3. Abra uma [issue](../../issues) no GitHub
