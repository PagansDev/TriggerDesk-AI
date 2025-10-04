# Autenticação Compartilhada - Sistema de Aproveitamento de Credenciais

## Visão Geral

O LNBot LiveChat utiliza um sistema de **autenticação compartilhada** que aproveita as credenciais do backend principal (`lnbot-backend`) sem necessidade de login adicional ou interação direta entre os serviços.

Este documento detalha como o sistema funciona, garantindo segurança e escalabilidade.

---

## Arquitetura de Autenticação

### Serviços Envolvidos

```
┌─────────────────────┐
│  lnbot-backend      │
│  (Porta: 3030)      │
│                     │
│  - Gera JWT tokens  │
│  - HTTPOnly cookies │
│  - JWT_SECRET       │
└──────────┬──────────┘
           │
           │ Cookie: accessToken
           │ (HTTPOnly, Secure)
           ↓
┌─────────────────────┐
│  lnbot-frontend-v2  │
│  (React/Vite)       │
│                     │
│  - Recebe cookies   │
│  - Armazena userId  │
└──────────┬──────────┘
           │
           │ WebSocket + Cookies
           │
           ↓
┌─────────────────────┐
│  lnbot-livechat     │
│  (Porta: 3037)      │
│                     │
│  - Valida JWT       │
│  - Extrai userId    │
│  - Mapeia User      │
└─────────────────────┘
```

---

## Fluxo de Autenticação

### 1. Login no Backend Principal

```javascript
// Usuario faz login no frontend
POST http://localhost:3030/api/users/login
{
  username: "usuario",
  password: "senha123",
  deviceFingerprint: "abc123..."
}

// Backend gera tokens JWT
Response:
- Set-Cookie: accessToken=eyJhbGc... (HTTPOnly, Secure)
- Set-Cookie: refreshToken=eyJhbGc... (HTTPOnly, Secure)
- Body: { success: true, userId: "123", username: "usuario", ... }
```

### 2. Estrutura do JWT Token

O backend gera tokens com o seguinte payload:

```javascript
{
  userId: "43cbdaf3-f125-42c5-a4f9-b91f3043c71b",
  username: "pagansdev",
  email: "user@example.com",
  role: "user",
  type: "access",                    // ou "refresh"
  iat: 1234567890,                   // issued at
  exp: 1234571490                    // expires at
}
```

**Algoritmo:** `HS512`  
**Secret:** Compartilhado entre backend e livechat via `JWT_SECRET`

### 3. Conexão WebSocket no LiveChat

Quando o usuário abre o chat, o frontend estabelece conexão WebSocket:

```javascript
// Frontend (socket.io-client)
const socket = io('http://localhost:3037', {
  withCredentials: true, // CRÍTICO: envia cookies
  transports: ['websocket', 'polling'],
});
```

Os cookies HTTPOnly são **automaticamente enviados** pelo navegador na conexão.

### 4. Validação no LiveChat

```javascript
// Middleware Socket.IO (livechat)
io.use(async (socket, next) => {
  try {
    // 1. Extrai cookie da requisição
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const accessToken = cookies.accessToken;

    if (!accessToken) {
      return next(new Error('Autenticação necessária'));
    }

    // 2. Valida JWT localmente (SEM chamar backend)
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, {
      algorithms: ['HS512'],
    });

    // 3. Verifica tipo e expiração
    if (decoded.type !== 'access') {
      return next(new Error('Token inválido'));
    }

    // 4. Extrai dados do usuário
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    socket.userRole = decoded.role;

    // 5. Sincroniza com MongoDB
    const user = await findOrCreateUser({
      externalUserId: decoded.userId,
      username: decoded.username,
    });

    socket.livechatUserId = user._id;

    next(); // Autoriza conexão
  } catch (error) {
    next(new Error('Token inválido ou expirado'));
  }
});
```

---

## Sincronização de Usuários

### Modelo User no MongoDB

```javascript
{
  _id: ObjectId("..."),              // ID interno do livechat
  externalUserId: "43cbdaf3-...",    // userId do backend
  username: "pagansdev",
  isOnline: true,
  lastSeen: Date("2025-09-30T..."),
  createdAt: Date("..."),
  updatedAt: Date("...")
}
```

### Fluxo de Sincronização

```javascript
async function findOrCreateUser({ externalUserId, username }) {
  // 1. Busca usuário existente
  let user = await User.findOne({ externalUserId });

  if (user) {
    // 2. Atualiza status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();
    return user;
  }

  // 3. Cria novo usuário
  user = await User.create({
    externalUserId,
    username,
    isOnline: true,
    lastSeen: new Date(),
  });

  return user;
}
```

O `externalUserId` funciona como **chave estrangeira** entre os sistemas:

- **MySQL (backend):** `users.id`
- **MongoDB (livechat):** `users.externalUserId`

---

## Configuração Necessária

### 1. Variáveis de Ambiente

#### lnbot-backend (.env)

```env
JWT_SECRET=0P3KuRWXqadfUWprIJJRG+7zAhk8tz06...
PORT=3030
NODE_ENV=development
```

#### lnbot-livechat (.env)

```env
# CRÍTICO: Mesmo secret do backend
JWT_SECRET=0P3KuRWXqadfUWprIJJRG+7zAhk8tz06...

PORT=3037
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://livechat:live123@localhost:27017/lnbot_livechat
```

⚠️ **IMPORTANTE:** O `JWT_SECRET` deve ser **exatamente o mesmo** em ambos os serviços.

### 2. Dependências

```bash
npm install jsonwebtoken cookie
```

### 3. CORS e Socket.IO

```javascript
// app.ts
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true, // Permite cookies
  },
});
```

---

## Segurança

### Pontos Fortes

✅ **HTTPOnly Cookies:** JavaScript não pode acessar os tokens  
✅ **Secure Flag:** Cookies transmitidos apenas via HTTPS (produção)  
✅ **SameSite:** Protege contra CSRF  
✅ **Validação Local:** Sem overhead de rede  
✅ **JWT Assinado:** Impossível falsificar sem o secret  
✅ **Expiração Automática:** Tokens têm tempo de vida limitado

### Pontos de Atenção

⚠️ **Secret Compartilhado:** Se vazar, ambos sistemas são comprometidos  
⚠️ **Sem Revogação Imediata:** Tokens revogados no backend não são detectados instantaneamente  
⚠️ **Sincronização Manual:** Mudanças no usuário (backend) não refletem automaticamente no livechat

### Mitigações

1. **JWT_SECRET Seguro:**

   - Mínimo 64 caracteres
   - Gerado aleatoriamente
   - Armazenado apenas em .env (nunca no código)

2. **Tokens de Curta Duração:**

   - Access Token: 5min (dev) / 1h (prod)
   - Refresh Token: 15min (dev) / 6h (prod)

3. **Rate Limiting:**

   ```javascript
   // Limite de conexões por usuário
   const connectionLimit = new Map();
   ```

4. **Logs de Auditoria:**
   ```javascript
   console.log(`[AUTH] User ${userId} connected from ${ip}`);
   ```

---

## Vantagens da Abordagem

### Performance

- **Zero Latência Extra:** Sem chamadas HTTP ao backend
- **Escalabilidade:** Livechat totalmente independente
- **Cache Natural:** Token validado uma vez na conexão

### Simplicidade

- **Menos Código:** Sem cliente HTTP, sem endpoints extras
- **Menos Dependências:** Um serviço a menos na cadeia
- **Falhas Isoladas:** Backend offline não afeta validação de tokens ativos

### Experiência do Usuário

- **Transparente:** Usuário não percebe o processo
- **Sem Re-login:** Credenciais aproveitadas automaticamente
- **Rápido:** Conexão estabelecida instantaneamente

---

## Comparação com Alternativas

### Opção 1: Validação Local (ATUAL)

```
Frontend → [Cookie] → LiveChat → jwt.verify() → ✅
                                  (10-20ms)
```

**Prós:** Rápido, simples, escalável  
**Contras:** Revogação não imediata

### Opção 2: Validação via Backend

```
Frontend → [Cookie] → LiveChat → HTTP → Backend → ✅
                                (100-300ms)
```

**Prós:** Revogação imediata, fonte única de verdade  
**Contras:** Lento, dependência, mais complexo

### Opção 3: OAuth2 / SSO

```
Frontend → [OAuth] → Provider → Token → LiveChat → ✅
                                (300-1000ms)
```

**Prós:** Padrão da indústria, muito seguro  
**Contras:** Overhead massivo, complexidade alta

---

## Testes de Validação

### Cenário 1: Usuário Autenticado

```bash
# Terminal 1: Backend rodando (porta 3030)
# Terminal 2: LiveChat rodando (porta 3037)

# Test
curl -X POST http://localhost:3030/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"pagansdev","password":"senha123"}' \
  -c cookies.txt

# Resultado esperado
✅ Cookie accessToken salvo
✅ WebSocket conecta automaticamente
✅ User criado/atualizado no MongoDB
```

### Cenário 2: Token Expirado

```bash
# Aguardar 6 minutos (dev) ou 2 horas (prod)
# Tentar conectar no chat

# Resultado esperado
❌ Conexão recusada
❌ Frontend detecta e tenta refresh
✅ Novo token obtido
✅ Reconexão automática
```

### Cenário 3: Token Inválido

```bash
# Modificar cookie manualmente
document.cookie = "accessToken=token_falso"

# Resultado esperado
❌ jwt.verify() lança erro
❌ Conexão recusada
❌ Usuário redirecionado para login
```

---

## Monitoramento

### Logs Importantes

```javascript
// Sucesso
[AUTH] ✅ User 43cbdaf3-f125... authenticated (socket: abc123)

// Falha
[AUTH] ❌ Invalid token from IP 192.168.1.100
[AUTH] ⏰ Expired token for user 43cbdaf3-f125...
[AUTH] 🚫 Missing credentials from IP 192.168.1.100
```

### Métricas Recomendadas

- **Taxa de Autenticação:** sucesso / total
- **Latência de Conexão:** tempo até socket estabelecido
- **Tokens Expirados:** contador de validações falhadas
- **Usuários Simultâneos:** conexões ativas

---

## Troubleshooting

### Problema: "Autenticação necessária"

**Causa:** Cookie não está sendo enviado  
**Solução:**

```javascript
// Frontend: verificar withCredentials
const socket = io(url, { withCredentials: true });

// Backend: verificar CORS credentials
cors: {
  credentials: true;
}
```

### Problema: "Token inválido"

**Causa:** JWT_SECRET diferente entre serviços  
**Solução:**

```bash
# Comparar secrets
grep JWT_SECRET lnbot-backend/.env
grep JWT_SECRET lnbot-livechat/.env

# Devem ser idênticos!
```

### Problema: "jwt malformed"

**Causa:** Cookie corrompido ou formato errado  
**Solução:**

```javascript
// Verificar parsing de cookies
console.log('Raw cookie:', socket.handshake.headers.cookie);
console.log('Parsed token:', cookies.accessToken);
```

---

## Próximos Passos

### Melhorias Futuras

1. **Cache de Tokens Revogados**

   - Redis com lista de tokens bloqueados
   - TTL igual à expiração do token

2. **Refresh Automático**

   - Detectar token próximo da expiração
   - Solicitar refresh via evento Socket.IO

3. **Multi-device**

   - Suportar múltiplas conexões simultâneas
   - Sincronizar estado entre dispositivos

4. **Auditoria Avançada**
   - Log de todas as ações do usuário
   - Rastreamento de sessões suspeitas

---

## Referências

- [JWT.io - Introdução a JSON Web Tokens](https://jwt.io/introduction)
- [Socket.IO - Autenticação](https://socket.io/docs/v4/middlewares/)
- [OWASP - JWT Security](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)

---

**Última atualização:** 30/09/2025  
**Versão:** 1.0  
**Autor:** LNBot Development Team
