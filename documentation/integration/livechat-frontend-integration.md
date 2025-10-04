# Integração LiveChat - Frontend

## Checklist de Implementação

### 📦 Dependências

✅ `socket.io-client` - Já instalado (v4.7.4)

---

## 🎯 Componentes a Criar

### 1. **ChatButton.tsx**

Botão flutuante para abrir o chat

**Localização:** `src/components/livechat/ChatButton.tsx`

**Funcionalidades:**

- Botão fixo no canto inferior direito
- Badge com contador de mensagens não lidas
- Animação de pulso quando há mensagens novas
- Tooltip "Precisa de ajuda?"
- Toggle do popup de chat

**Props:**

```typescript
interface ChatButtonProps {
  unreadCount?: number;
  isOpen: boolean;
  onClick: () => void;
}
```

**Design:**

```
┌─────────────────┐
│                 │
│  💬 Chat        │  ← Badge com número
│                 │
└─────────────────┘
Fixed bottom-right
z-index: 9998
```

---

### 2. **ChatPopup.tsx**

Popup principal do chat

**Localização:** `src/components/livechat/ChatPopup.tsx`

**Funcionalidades:**

- Container do chat (400x600px)
- Header com título e botão de fechar
- Área de mensagens (scroll automático)
- Input de mensagem
- Indicador "Digitando..."
- Status de conexão
- Animação de entrada/saída

**Estrutura:**

```
┌─────────────────────────────────┐
│  LNBot Suporte           [X]    │ ← Header
├─────────────────────────────────┤
│                                 │
│  💬 Bot: Olá! Como posso...    │
│                                 │
│         Você: Preciso de ajuda │
│                                 │
│  💬 Bot digitando...            │ ← Typing indicator
│                                 │
├─────────────────────────────────┤
│  [Digite sua mensagem...]  [➤] │ ← Input
└─────────────────────────────────┘
Fixed bottom-right
z-index: 9999
```

**Props:**

```typescript
interface ChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
}
```

---

### 3. **ChatMessage.tsx**

Componente individual de mensagem

**Localização:** `src/components/livechat/ChatMessage.tsx`

**Funcionalidades:**

- Renderização de mensagem única
- Diferenciação visual (usuário vs bot)
- Timestamp
- Avatar
- Animação de entrada
- Suporte a markdown básico (negrito, itálico, links)

**Props:**

```typescript
interface ChatMessageProps {
  id: string;
  content: string;
  isFromAI: boolean;
  senderId: string;
  senderName?: string;
  createdAt: Date;
  messageType: 'text' | 'system' | 'image' | 'file';
}
```

**Variações:**

```
Bot (esquerda):
┌─────────────────────────┐
│ 🤖 Bot                  │
│ Mensagem aqui...        │
│ 14:32                   │
└─────────────────────────┘

Usuário (direita):
          ┌─────────────────────────┐
          │                Você 👤  │
          │        Minha mensagem   │
          │                   14:33 │
          └─────────────────────────┘
```

---

### 4. **ChatTypingIndicator.tsx**

Indicador visual de digitação

**Localização:** `src/components/livechat/ChatTypingIndicator.tsx`

**Funcionalidades:**

- Animação de três pontos
- Aparece quando bot está processando
- Desaparece quando mensagem chega

**Visual:**

```
💬 Bot está digitando ● ● ●
```

---

### 5. **ChatConnectionStatus.tsx**

Indicador de status de conexão

**Localização:** `src/components/livechat/ChatConnectionStatus.tsx`

**Funcionalidades:**

- Badge de status (conectado/desconectado/reconectando)
- Cores semafóricas
- Mensagem de erro amigável

**Estados:**

```typescript
type ConnectionStatus =
  | 'connected' // 🟢 Conectado
  | 'disconnected' // 🔴 Desconectado
  | 'connecting' // 🟡 Conectando...
  | 'error'; // 🔴 Erro
```

---

## 🔧 Serviços a Criar

### 6. **livechatService.ts**

Gerenciamento da conexão WebSocket

**Localização:** `src/services/livechat.service.ts`

**Responsabilidades:**

- Conectar ao WebSocket do livechat (porta 3037)
- Enviar/receber mensagens
- Gerenciar eventos
- Reconexão automática
- Sincronização de estado

**Métodos principais:**

```typescript
class LiveChatService {
  private socket: Socket | null = null;
  private conversationId: string | null = null;

  connect(userId: string, username: string): Promise<void>;
  disconnect(): void;
  sendMessage(content: string, type?: MessageType): Promise<void>;
  joinConversation(conversationId: string): Promise<void>;
  onNewMessage(callback: (message: Message) => void): void;
  onTyping(callback: (data: TypingData) => void): void;
  onError(callback: (error: Error) => void): void;
  setTyping(isTyping: boolean): void;
}

export const liveChatService = new LiveChatService();
```

**Conexão:**

```typescript
connect(userId: string, username: string) {
  this.socket = io('http://localhost:3037', {
    withCredentials: true,  // CRÍTICO: envia cookies
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  this.socket.on('connect', () => {
    console.log('✅ LiveChat conectado');
    this.setupEventHandlers();
  });

  this.socket.on('connect_error', (error) => {
    console.error('❌ Erro de conexão:', error);
  });
}
```

---

## 🎣 Hooks a Criar

### 7. **useLiveChat.ts**

Hook principal para gerenciar o chat

**Localização:** `src/hooks/useLiveChat.ts`

**Funcionalidades:**

- Estado do chat (aberto/fechado)
- Conexão automática quando autenticado
- Gerenciamento de mensagens
- Envio de mensagens
- Estado de digitação
- Contador de não lidas

**Interface:**

```typescript
interface UseLiveChatReturn {
  // Estado
  isOpen: boolean;
  isConnected: boolean;
  messages: Message[];
  unreadCount: number;
  isTyping: boolean;
  conversationId: string | null;

  // Ações
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: () => void;

  // Status
  connectionStatus: ConnectionStatus;
}

export const useLiveChat = (): UseLiveChatReturn => {
  // Implementação
};
```

**Uso:**

```typescript
// Em qualquer componente
const { isOpen, messages, unreadCount, openChat, sendMessage } = useLiveChat();
```

---

### 8. **useChatMessages.ts**

Hook para gerenciar histórico de mensagens

**Localização:** `src/hooks/useChatMessages.ts`

**Funcionalidades:**

- Armazenar mensagens em estado
- Adicionar novas mensagens
- Scroll automático para última mensagem
- Persistência local (opcional)

**Interface:**

```typescript
interface UseChatMessagesReturn {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  scrollToBottom: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}
```

---

## 📝 Types a Criar

### 9. **livechat.types.ts**

Tipos TypeScript para o livechat

**Localização:** `src/types/livechat.types.ts`

**Definições:**

```typescript
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  isFromAI: boolean;
  createdAt: Date;
  readAt?: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  status: 'active' | 'closed' | 'archived';
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TypingData {
  userId: string;
  isTyping: boolean;
}

export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error';

export type MessageType = 'text' | 'image' | 'file' | 'system';
```

---

## 🎨 Estilos

### 10. **Tailwind Classes Customizadas**

**Arquivo:** `src/index.css` (adicionar no final)

```css
/* LiveChat Styles */
@layer components {
  .chat-popup {
    @apply fixed bottom-20 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 
           rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700
           flex flex-col overflow-hidden z-[9999];
  }

  .chat-button {
    @apply fixed bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-700
           rounded-full shadow-lg flex items-center justify-center
           cursor-pointer transition-all duration-200 z-[9998]
           hover:scale-110 active:scale-95;
  }

  .chat-message-user {
    @apply ml-auto bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[80%]
           break-words;
  }

  .chat-message-bot {
    @apply mr-auto bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white
           rounded-lg px-4 py-2 max-w-[80%] break-words;
  }

  .chat-badge {
    @apply absolute -top-1 -right-1 bg-red-500 text-white text-xs
           rounded-full w-5 h-5 flex items-center justify-center
           font-bold animate-pulse;
  }
}

/* Animações */
@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100%);
    opacity: 0;
  }
}

.chat-popup-enter {
  animation: slideUp 0.3s ease-out;
}

.chat-popup-exit {
  animation: slideDown 0.3s ease-in;
}
```

---

## 🔌 Integração com App Principal

### 11. **Modificar App.tsx**

Adicionar o LiveChat na raiz da aplicação:

```typescript
import { ChatButton } from './components/livechat/ChatButton';
import { ChatPopup } from './components/livechat/ChatPopup';
import { useLiveChat } from './hooks/useLiveChat';

function App() {
  const { user, isAuthenticated } = useAuth();
  const { isOpen, unreadCount, toggleChat, closeChat } = useLiveChat();

  return (
    <Router>
      {/* Rotas existentes */}

      {/* LiveChat - Apenas para usuários autenticados */}
      {isAuthenticated && user && (
        <>
          <ChatButton
            unreadCount={unreadCount}
            isOpen={isOpen}
            onClick={toggleChat}
          />

          {isOpen && (
            <ChatPopup
              isOpen={isOpen}
              onClose={closeChat}
              userId={user.id}
              username={user.username}
            />
          )}
        </>
      )}
    </Router>
  );
}
```

---

## 🔐 Configuração

### 12. **Adicionar URL do LiveChat**

**Arquivo:** `src/config/env.config.ts`

```typescript
export const env = {
  // ... configurações existentes

  livechatUrl: import.meta.env.VITE_LIVECHAT_URL || 'http://localhost:3037',
} as const;
```

**Arquivo:** `.env` (raiz do frontend)

```env
VITE_API_URL=http://localhost:3030
VITE_LIVECHAT_URL=http://localhost:3037
```

---

## 📁 Estrutura Final de Pastas

```
src/
├── components/
│   └── livechat/
│       ├── ChatButton.tsx           ✨ NOVO
│       ├── ChatPopup.tsx            ✨ NOVO
│       ├── ChatMessage.tsx          ✨ NOVO
│       ├── ChatTypingIndicator.tsx  ✨ NOVO
│       └── ChatConnectionStatus.tsx ✨ NOVO
│
├── hooks/
│   ├── useLiveChat.ts               ✨ NOVO
│   └── useChatMessages.ts           ✨ NOVO
│
├── services/
│   └── livechat.service.ts          ✨ NOVO
│
├── types/
│   └── livechat.types.ts            ✨ NOVO
│
└── config/
    └── env.config.ts                ✏️ MODIFICAR
```

---

## 🔄 Fluxo de Integração Completo

### Passo 1: Usuário Clica no Botão

```
User → Click ChatButton → useLiveChat.openChat()
```

### Passo 2: Conexão WebSocket

```
useLiveChat → liveChatService.connect(userId, username)
            → Socket.IO conecta com cookies HTTPOnly
            → Livechat valida JWT
            → Emite 'join_conversation'
```

### Passo 3: Envio de Mensagem

```
User digita → ChatPopup.sendMessage()
            → liveChatService.sendMessage(content)
            → Socket emite 'send_message'
            → Backend persiste e processa IA
            → Socket recebe 'new_message' (user)
            → Socket recebe 'new_message' (bot)
```

### Passo 4: Recebimento de Resposta

```
Socket 'new_message' → useChatMessages.addMessage()
                     → State atualizado
                     → ChatPopup renderiza nova mensagem
                     → Scroll automático para baixo
```

---

## 🎯 Eventos Socket.IO

### Frontend → Backend

```typescript
// Entrar na conversa
socket.emit('join_conversation', {
  userId: string,
  conversationId: string,
});

// Enviar mensagem
socket.emit('send_message', {
  content: string,
  messageType: 'text' | 'image' | 'file',
});

// Indicar digitação
socket.emit('typing', {
  isTyping: boolean,
});
```

### Backend → Frontend

```typescript
// Nova mensagem (user ou bot)
socket.on(
  'new_message',
  (data: {
    id: string;
    content: string;
    senderId: string;
    messageType: MessageType;
    isFromAI: boolean;
    createdAt: Date;
  }) => {
    // Adicionar ao histórico
  }
);

// Usuário digitando
socket.on('user_typing', (data: { userId: string; isTyping: boolean }) => {
  // Mostrar indicador
});

// Erro
socket.on('error', (data: { message: string }) => {
  // Mostrar erro
});
```

---

## 🧪 Testes Manuais

### Cenário 1: Abertura do Chat

1. Login no sistema
2. Verificar botão flutuante aparece
3. Clicar no botão
4. Popup deve abrir com animação
5. Verificar conexão WebSocket estabelecida

### Cenário 2: Envio de Mensagem

1. Abrir chat
2. Digitar mensagem
3. Enviar (Enter ou botão)
4. Mensagem aparece do lado direito
5. Resposta do bot aparece do lado esquerdo

### Cenário 3: Reconexão

1. Abrir chat
2. Desligar backend do livechat
3. Verificar status "Desconectado"
4. Religar backend
5. Verificar reconexão automática

### Cenário 4: Notificações

1. Minimizar chat
2. Enviar mensagem de outro dispositivo
3. Badge deve aparecer no botão
4. Abrir chat
5. Badge deve desaparecer

---

## ⚡ Performance

### Otimizações Recomendadas

1. **Lazy Loading:**

   ```typescript
   const ChatPopup = lazy(() => import('./components/livechat/ChatPopup'));
   ```

2. **Memoização:**

   ```typescript
   const MemoizedChatMessage = React.memo(ChatMessage);
   ```

3. **Virtualização (para muitas mensagens):**

   ```bash
   npm install react-window
   ```

4. **Debounce no Typing Indicator:**
   ```typescript
   const debouncedSetTyping = debounce((isTyping) => {
     liveChatService.setTyping(isTyping);
   }, 300);
   ```

---

## 🐛 Troubleshooting

### Problema: Socket não conecta

**Verificar:**

- URL do livechat está correta (.env)
- `withCredentials: true` está definido
- Backend do livechat está rodando
- Cookies HTTPOnly estão presentes

**Console:**

```javascript
console.log('Cookies:', document.cookie);
console.log('Socket status:', socket?.connected);
```

### Problema: Mensagens não aparecem

**Verificar:**

- Eventos estão corretamente configurados
- `conversationId` foi recebido
- Estado está sendo atualizado corretamente

**Debug:**

```typescript
socket.on('new_message', (data) => {
  console.log('📩 Nova mensagem:', data);
  addMessage(data);
});
```

### Problema: Badge não atualiza

**Verificar:**

- Função `markAsRead()` é chamada ao abrir chat
- Estado `unreadCount` está sendo incrementado corretamente

---

## 📋 Ordem de Implementação Recomendada

1. ✅ Criar tipos (`livechat.types.ts`)
2. ✅ Criar serviço (`livechat.service.ts`)
3. ✅ Criar hook principal (`useLiveChat.ts`)
4. ✅ Criar componente base (`ChatPopup.tsx`)
5. ✅ Criar componente de mensagem (`ChatMessage.tsx`)
6. ✅ Criar botão flutuante (`ChatButton.tsx`)
7. ✅ Adicionar estilos
8. ✅ Integrar no App.tsx
9. ✅ Testar conexão
10. ✅ Testar envio/recebimento de mensagens
11. ✅ Adicionar indicadores (typing, status)
12. ✅ Polimento (animações, responsividade)

---

## 🎨 Mockup Visual

### Desktop

```
                                    ┌─────────────────────────────┐
                                    │ LNBot Suporte          [X]  │
                                    ├─────────────────────────────┤
App Normal                          │                             │
┌────────────────────────┐          │ 🤖 Olá! Como posso ajudar?  │
│  Dashboard             │          │ 14:30                       │
│                        │          │                             │
│  [Conteúdo]            │          │    Preciso de ajuda com     │
│                        │          │    meu bot 👤               │
│                        │          │                       14:31 │
│                        │          │                             │
└────────────────────────┘          │ 🤖 Claro! Me conte mais...  │
                                    │ 14:31                       │
                        💬          │                             │
                        (3)         ├─────────────────────────────┤
                                    │ [Digite aqui...]       [➤]  │
                                    └─────────────────────────────┘
```

### Mobile

```
┌──────────────────┐
│  App Content     │
│                  │
│                  │
│                  │
│                  │
│                  │
│                  │
│               💬 │  ← Botão fixo
│               (2)│
└──────────────────┘

Chat expande full-screen no mobile
```

---

## 🚀 Próximos Passos Após Implementação Básica

1. **Upload de Arquivos**

   - Anexar imagens/documentos
   - Preview de arquivos

2. **Histórico Persistente**

   - Salvar conversas no localStorage
   - Carregar histórico ao abrir

3. **Notificações Push**

   - Desktop notifications
   - Sound alerts

4. **Emojis**

   - Picker de emojis
   - Suporte a emoticons

5. **Multi-idioma**
   - i18n para mensagens do sistema

---

**Última atualização:** 30/09/2025  
**Versão:** 1.0  
**Autor:** LNBot Development Team
