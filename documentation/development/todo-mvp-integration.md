# TODO: MVP LiveChat - Integração Inicial

## 🎯 Objetivo

Criar sistema básico de chat funcional com autenticação compartilhada e resposta "pong" para validação.

---

## 📋 FASE 1: Recursos Visuais (Frontend)

### 1.1 Tipos Base

**Arquivo:** `src/types/livechat.types.ts`

- [ ] Criar interface `Message`
  - id, content, isFromAI, createdAt
- [ ] Criar interface `ConnectionStatus`
  - 'connected' | 'disconnected' | 'connecting' | 'error'
- [ ] Criar interface `ChatState`
  - isOpen, messages, isConnected

**Código:**

```typescript
export interface Message {
  id: string;
  content: string;
  isFromAI: boolean;
  createdAt: Date;
}

export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error';

export interface ChatState {
  isOpen: boolean;
  messages: Message[];
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
}
```

---

### 1.2 Componente: ChatButton

**Arquivo:** `src/components/livechat/ChatButton.tsx`

- [ ] Criar componente funcional
- [ ] Adicionar props (isOpen, onClick)
- [ ] Estilizar botão flutuante (Tailwind)
  - Fixed bottom-right
  - Ícone de chat (MessageCircle do lucide-react)
  - Background azul
  - Hover effects
- [ ] Adicionar animação de pulso

**Código:**

```typescript
import { MessageCircle } from 'lucide-react';

interface ChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export const ChatButton = ({ isOpen, onClick }: ChatButtonProps) => {
  if (isOpen) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-700 
                 rounded-full shadow-lg flex items-center justify-center
                 cursor-pointer transition-all duration-200 z-[9998]
                 hover:scale-110 active:scale-95"
      aria-label="Abrir chat"
    >
      <MessageCircle className="w-8 h-8 text-white" />
    </button>
  );
};
```

**Teste Manual:**

- [ ] Botão aparece no canto inferior direito
- [ ] Hover muda cor e escala
- [ ] Click funciona

---

### 1.3 Componente: ChatMessage

**Arquivo:** `src/components/livechat/ChatMessage.tsx`

- [ ] Criar componente funcional
- [ ] Receber props (content, isFromAI, createdAt)
- [ ] Renderizar mensagem do bot (esquerda, cinza)
- [ ] Renderizar mensagem do usuário (direita, azul)
- [ ] Mostrar timestamp formatado

**Código:**

```typescript
import { Bot, User } from 'lucide-react';
import type { Message } from '../../types/livechat.types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const time = new Date(message.createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex gap-2 mb-4 ${
        message.isFromAI ? 'justify-start' : 'justify-end'
      }`}
    >
      {message.isFromAI && (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </div>
      )}

      <div className="flex flex-col max-w-[75%]">
        <div
          className={`px-4 py-2 rounded-lg ${
            message.isFromAI
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          <p className="text-sm break-words">{message.content}</p>
        </div>
        <span
          className={`text-xs text-gray-500 mt-1 ${
            message.isFromAI ? 'text-left' : 'text-right'
          }`}
        >
          {time}
        </span>
      </div>

      {!message.isFromAI && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
};
```

**Teste Manual:**

- [ ] Mensagem do bot alinhada à esquerda com ícone de robô
- [ ] Mensagem do usuário alinhada à direita com ícone de pessoa
- [ ] Timestamp aparece corretamente

---

### 1.4 Componente: ChatPopup

**Arquivo:** `src/components/livechat/ChatPopup.tsx`

- [ ] Criar estrutura básica (Header, Messages, Input)
- [ ] Header com título e botão fechar
- [ ] Área de mensagens com scroll automático
- [ ] Input com botão enviar
- [ ] Estado local para input
- [ ] Props: isOpen, onClose, messages, onSendMessage

**Código:**

```typescript
import { X, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import type { Message } from '../../types/livechat.types';

interface ChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onSendMessage: (content: string) => void;
  isConnected: boolean;
}

export const ChatPopup = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isConnected,
}: ChatPopupProps) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !isConnected) return;

    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 
                    rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700
                    flex flex-col overflow-hidden z-[9999]"
    >
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">BitDesk Suporte</h3>
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}
          />
        </div>
        <button
          onClick={onClose}
          className="hover:bg-blue-700 p-1 rounded transition-colors"
          aria-label="Fechar chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-center">Olá! Como posso ajudar você hoje?</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isConnected ? 'Digite sua mensagem...' : 'Conectando...'
            }
            disabled={!isConnected}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || !isConnected}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center"
            aria-label="Enviar mensagem"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
```

**Teste Manual:**

- [ ] Popup abre no canto inferior direito
- [ ] Header com título e indicador de conexão
- [ ] Botão X fecha o popup
- [ ] Input aceita texto
- [ ] Enter envia mensagem
- [ ] Botão enviar funciona
- [ ] Mensagens aparecem na área de chat
- [ ] Scroll automático funciona

---

### 1.5 Configuração

**Arquivo:** `src/config/env.config.ts`

- [ ] Adicionar `livechatUrl`

**Código:**

```typescript
export const env = {
  // ... existentes
  livechatUrl: import.meta.env.VITE_LIVECHAT_URL || 'http://localhost:3037',
} as const;
```

**Arquivo:** `.env`

- [ ] Adicionar variável de ambiente

```env
VITE_LIVECHAT_URL=http://localhost:3037
```

---

## 📋 FASE 2: Autenticação Compartilhada (Backend LiveChat)

### 2.1 Dependências

**Arquivo:** `lnbot-livechat/package.json`

- [ ] Verificar `jsonwebtoken` instalado
- [ ] Verificar `cookie` instalado
- [ ] Se não, instalar: `npm install jsonwebtoken cookie @types/jsonwebtoken @types/cookie`

---

### 2.2 Variáveis de Ambiente

**Arquivo:** `lnbot-livechat/.env`

- [ ] Adicionar `JWT_SECRET` (mesmo do backend principal)

```env
JWT_SECRET=0P3KuRWXqadfUWprIJJRG+7zAhk8tz06SIEiVOzoAulb4hduJKZ4+s/+Do94GRaTOQNWn6GOg/Vjeh6QiOZE0A==
```

**⚠️ IMPORTANTE:** Copiar exatamente do `lnbot-backend/.env`

---

### 2.3 Utilitário de Cookies

**Arquivo:** `src/utils/cookieParser.ts`

- [ ] Criar função para parsear cookies

**Código:**

```typescript
export const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
    return cookies;
  }, {} as Record<string, string>);
};
```

**Teste Manual:**

- [ ] Função parseia cookies corretamente

---

### 2.4 Middleware de Autenticação Socket

**Arquivo:** `src/middlewares/socketAuthMiddleware.ts`

- [ ] Criar middleware para validar JWT no handshake
- [ ] Extrair cookie `accessToken`
- [ ] Validar com `jwt.verify()`
- [ ] Extrair `userId` do payload
- [ ] Anexar dados ao socket
- [ ] Rejeitar se inválido

**Código:**

```typescript
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { parseCookies } from '../utils/cookieParser';

interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  type: string;
  iat: number;
  exp: number;
}

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) {
      console.log('❌ [Auth] Sem cookies na requisição');
      return next(new Error('Autenticação necessária'));
    }

    const cookies = parseCookies(cookieHeader);
    const accessToken = cookies.accessToken;

    if (!accessToken) {
      console.log('❌ [Auth] Token de acesso não encontrado');
      return next(new Error('Token de acesso não encontrado'));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ [Auth] JWT_SECRET não configurado');
      return next(new Error('Configuração inválida do servidor'));
    }

    const decoded = jwt.verify(accessToken, secret, {
      algorithms: ['HS512'],
    }) as JWTPayload;

    if (decoded.type !== 'access') {
      console.log('❌ [Auth] Tipo de token inválido:', decoded.type);
      return next(new Error('Tipo de token inválido'));
    }

    (socket as any).userId = decoded.userId;
    (socket as any).username = decoded.username;
    (socket as any).userEmail = decoded.email;
    (socket as any).userRole = decoded.role;

    console.log(
      `✅ [Auth] Usuário autenticado: ${decoded.username} (${decoded.userId})`
    );

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('❌ [Auth] Token expirado');
      return next(new Error('Token expirado'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      console.log('❌ [Auth] Token inválido:', error.message);
      return next(new Error('Token inválido'));
    }
    console.error('❌ [Auth] Erro na autenticação:', error);
    return next(new Error('Erro na autenticação'));
  }
};
```

**Teste Manual:**

- [ ] Log de sucesso aparece com username correto
- [ ] Conexões sem token são rejeitadas
- [ ] Tokens inválidos são rejeitados
- [ ] Tokens expirados são rejeitados

---

### 2.5 Aplicar Middleware no Socket

**Arquivo:** `src/app.ts`

- [ ] Importar middleware
- [ ] Aplicar com `io.use()`

**Código:**

```typescript
import { socketAuthMiddleware } from './middlewares/socketAuthMiddleware';

// ... código existente

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true, // CRÍTICO
  },
});

// Aplicar middleware de autenticação
io.use(socketAuthMiddleware);

// Então inicializar sockets
chatSocket(io);
```

**Teste Manual:**

- [ ] Servidor inicia sem erros
- [ ] Middleware é aplicado antes dos handlers

---

## 📋 FASE 3: Persistência de Dados

### 3.1 Serviço de Sincronização de Usuários

**Arquivo:** `src/services/userSyncService.ts`

- [ ] Criar função `findOrCreateUser`
- [ ] Buscar por `externalUserId`
- [ ] Criar se não existir
- [ ] Atualizar `isOnline` e `lastSeen`
- [ ] Retornar usuário

**Código:**

```typescript
import User from '../models/User';

export interface UserSyncData {
  externalUserId: string;
  username: string;
}

export const findOrCreateUser = async (data: UserSyncData) => {
  try {
    let user = await User.findOne({ externalUserId: data.externalUserId });

    if (user) {
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();
      console.log(
        `✅ [UserSync] Usuário existente atualizado: ${user.username}`
      );
      return user;
    }

    user = await User.create({
      externalUserId: data.externalUserId,
      username: data.username,
      isOnline: true,
      lastSeen: new Date(),
    });

    console.log(`✅ [UserSync] Novo usuário criado: ${user.username}`);
    return user;
  } catch (error) {
    console.error('❌ [UserSync] Erro ao sincronizar usuário:', error);
    throw error;
  }
};
```

**Teste Manual:**

- [ ] Usuário é criado na primeira conexão
- [ ] Usuário existente é atualizado nas próximas conexões
- [ ] Logs aparecem corretamente

---

### 3.2 Modelo de Conversa (Simplificado)

**Arquivo:** `src/models/Conversation.ts`

- [ ] Verificar se já existe
- [ ] Se não, criar modelo básico

**Código (se não existir):**

```typescript
import mongoose, { Schema } from 'mongoose';

export interface IConversation {
  userId: mongoose.Types.ObjectId;
  status: 'active' | 'closed' | 'archived';
  lastMessageAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'archived'],
      default: 'active',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

const Conversation = mongoose.model<IConversation>(
  'Conversation',
  ConversationSchema
);
export default Conversation;
```

---

### 3.3 Modelo de Mensagem (Simplificado)

**Arquivo:** `src/models/Message.ts`

- [ ] Verificar se já existe
- [ ] Garantir campos: conversationId, senderId, content, isFromAI

---

### 3.4 Modificar Socket Handler para Persistir

**Arquivo:** `src/sockets/chat.ts`

- [ ] Na conexão, sincronizar usuário
- [ ] Criar ou buscar conversa ativa
- [ ] Ao receber mensagem, salvar no banco
- [ ] **Responder sempre com "pong"** (ignorar IA por enquanto)

**Código:**

```typescript
import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import User from '../models/User';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { findOrCreateUser } from '../services/userSyncService';

interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
  livechatUserId?: Types.ObjectId;
  conversationId?: string;
}

const chatSocket = (io: Server) => {
  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`🔌 [Socket] Nova conexão: ${socket.id}`);

    try {
      // 1. Sincronizar usuário
      const user = await findOrCreateUser({
        externalUserId: socket.userId,
        username: socket.username,
      });
      socket.livechatUserId = user._id;

      // 2. Buscar ou criar conversa ativa
      let conversation = await Conversation.findOne({
        userId: user._id,
        status: 'active',
      });

      if (!conversation) {
        conversation = await Conversation.create({
          userId: user._id,
          status: 'active',
          lastMessageAt: new Date(),
        });
        console.log(`✅ [Socket] Nova conversa criada: ${conversation._id}`);
      } else {
        console.log(`✅ [Socket] Conversa existente: ${conversation._id}`);
      }

      socket.conversationId = conversation._id.toString();
      await socket.join(socket.conversationId);

      // Enviar confirmação de conexão
      socket.emit('connected', {
        conversationId: socket.conversationId,
        userId: user._id.toString(),
      });

      console.log(
        `✅ [Socket] Usuário ${socket.username} conectado à conversa ${socket.conversationId}`
      );
    } catch (error) {
      console.error('❌ [Socket] Erro na conexão:', error);
      socket.emit('error', { message: 'Erro ao estabelecer conexão' });
      socket.disconnect();
      return;
    }

    // Handler: Receber mensagem
    socket.on('send_message', async (data: { content: string }) => {
      try {
        if (!socket.conversationId || !socket.livechatUserId) {
          socket.emit('error', { message: 'Conversa não inicializada' });
          return;
        }

        console.log(
          `📩 [Socket] Mensagem recebida de ${socket.username}: "${data.content}"`
        );

        // Salvar mensagem do usuário
        const userMessage = await Message.create({
          conversationId: new Types.ObjectId(socket.conversationId),
          senderId: socket.livechatUserId,
          content: data.content,
          messageType: 'text',
          isFromAI: false,
        });

        // Atualizar último timestamp da conversa
        await Conversation.findByIdAndUpdate(socket.conversationId, {
          lastMessageAt: new Date(),
        });

        // Emitir mensagem do usuário
        io.to(socket.conversationId).emit('new_message', {
          id: userMessage._id.toString(),
          content: userMessage.content,
          isFromAI: false,
          createdAt: userMessage.createdAt,
        });

        console.log(`✅ [Socket] Mensagem do usuário salva e emitida`);

        // Responder com "pong" (teste simples)
        const botMessage = await Message.create({
          conversationId: new Types.ObjectId(socket.conversationId),
          senderId: new Types.ObjectId('000000000000000000000000'), // ID fictício do bot
          content: 'pong',
          messageType: 'text',
          isFromAI: true,
        });

        // Emitir resposta do bot
        io.to(socket.conversationId).emit('new_message', {
          id: botMessage._id.toString(),
          content: botMessage.content,
          isFromAI: true,
          createdAt: botMessage.createdAt,
        });

        console.log(`🤖 [Socket] Resposta "pong" enviada`);
      } catch (error) {
        console.error('❌ [Socket] Erro ao processar mensagem:', error);
        socket.emit('error', { message: 'Erro ao enviar mensagem' });
      }
    });

    // Handler: Desconexão
    socket.on('disconnect', async () => {
      if (socket.livechatUserId) {
        await User.findByIdAndUpdate(socket.livechatUserId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        console.log(`👋 [Socket] Usuário ${socket.username} desconectado`);
      }
    });
  });
};

export default chatSocket;
```

**Teste Manual:**

- [ ] Usuário é criado/atualizado ao conectar
- [ ] Conversa é criada/recuperada
- [ ] Mensagens são salvas no MongoDB
- [ ] Resposta "pong" é enviada sempre

---

## 📋 FASE 4: Integração Frontend

### 4.1 Serviço LiveChat

**Arquivo:** `src/services/livechat.service.ts`

- [ ] Criar classe `LiveChatService`
- [ ] Método `connect()`
- [ ] Método `disconnect()`
- [ ] Método `sendMessage()`
- [ ] Callbacks para eventos

**Código:**

```typescript
import { io, Socket } from 'socket.io-client';
import { env } from '../config/env.config';
import type { Message } from '../types/livechat.types';

class LiveChatService {
  private socket: Socket | null = null;
  private conversationId: string | null = null;

  connect() {
    if (this.socket?.connected) {
      console.log('⚠️ [LiveChat] Já conectado');
      return;
    }

    console.log('🔌 [LiveChat] Conectando ao servidor...');

    this.socket = io(env.livechatUrl, {
      withCredentials: true, // CRÍTICO: envia cookies
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ [LiveChat] Conectado com sucesso');
    });

    this.socket.on('connected', (data: { conversationId: string }) => {
      this.conversationId = data.conversationId;
      console.log('✅ [LiveChat] Conversa iniciada:', data.conversationId);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ [LiveChat] Erro de conexão:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('👋 [LiveChat] Desconectado:', reason);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.conversationId = null;
      console.log('👋 [LiveChat] Desconectado manualmente');
    }
  }

  sendMessage(content: string) {
    if (!this.socket?.connected) {
      console.error('❌ [LiveChat] Não conectado');
      throw new Error('Não conectado ao servidor');
    }

    console.log('📤 [LiveChat] Enviando mensagem:', content);
    this.socket.emit('send_message', { content });
  }

  onNewMessage(callback: (message: Message) => void) {
    this.socket?.on('new_message', (data) => {
      console.log('📨 [LiveChat] Nova mensagem:', data);
      callback({
        id: data.id,
        content: data.content,
        isFromAI: data.isFromAI,
        createdAt: new Date(data.createdAt),
      });
    });
  }

  onError(callback: (error: string) => void) {
    this.socket?.on('error', (data) => {
      console.error('❌ [LiveChat] Erro:', data.message);
      callback(data.message);
    });
  }

  get isConnected() {
    return this.socket?.connected || false;
  }
}

export const liveChatService = new LiveChatService();
```

---

### 4.2 Hook useLiveChat

**Arquivo:** `src/hooks/useLiveChat.ts`

- [ ] Gerenciar estado do chat
- [ ] Conectar quando autenticado
- [ ] Desconectar ao desmontar
- [ ] Gerenciar mensagens

**Código:**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { liveChatService } from '../services/livechat.service';
import type { Message, ConnectionStatus } from '../types/livechat.types';
import { useAuth } from './useAuth';

export const useLiveChat = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    if (!isAuthenticated) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');
    liveChatService.connect();

    liveChatService.onNewMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    liveChatService.onError((error) => {
      console.error('[useLiveChat] Erro:', error);
    });

    const checkConnection = setInterval(() => {
      setConnectionStatus(
        liveChatService.isConnected ? 'connected' : 'disconnected'
      );
    }, 1000);

    return () => {
      clearInterval(checkConnection);
      liveChatService.disconnect();
    };
  }, [isAuthenticated]);

  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    try {
      liveChatService.sendMessage(content);
    } catch (error) {
      console.error('[useLiveChat] Erro ao enviar:', error);
    }
  }, []);

  return {
    isOpen,
    messages,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    openChat,
    closeChat,
    toggleChat,
    sendMessage,
  };
};
```

---

### 4.3 Integrar no App.tsx

**Arquivo:** `src/App.tsx`

- [ ] Importar componentes
- [ ] Importar hook
- [ ] Renderizar condicionalmente

**Código:**

```typescript
import { ChatButton } from './components/livechat/ChatButton';
import { ChatPopup } from './components/livechat/ChatPopup';
import { useLiveChat } from './hooks/useLiveChat';

function App() {
  const { user, isAuthenticated } = useAuth();
  const { isOpen, messages, isConnected, toggleChat, closeChat, sendMessage } =
    useLiveChat();

  return (
    <BrowserRouter>
      {/* ... rotas existentes ... */}

      {/* LiveChat - Apenas para usuários autenticados */}
      {isAuthenticated && (
        <>
          <ChatButton isOpen={isOpen} onClick={toggleChat} />
          <ChatPopup
            isOpen={isOpen}
            onClose={closeChat}
            messages={messages}
            onSendMessage={sendMessage}
            isConnected={isConnected}
          />
        </>
      )}
    </BrowserRouter>
  );
}
```

---

## 📋 FASE 5: Testes de Validação

### 5.1 Teste: Autenticação

- [ ] Login no frontend
- [ ] Verificar que botão de chat aparece
- [ ] Abrir DevTools → Console
- [ ] Verificar log: `✅ [LiveChat] Conectado com sucesso`
- [ ] Verificar no backend: `✅ [Auth] Usuário autenticado: [username]`

### 5.2 Teste: Persistência

- [ ] Abrir chat
- [ ] Verificar no MongoDB Compass/terminal:
  ```bash
  mongo
  use lnbot_livechat
  db.users.find().pretty()
  db.conversations.find().pretty()
  ```
- [ ] Verificar que usuário foi criado com `externalUserId` correto

### 5.3 Teste: Envio de Mensagem

- [ ] Digitar "Olá" no chat
- [ ] Clicar em Enviar (ou Enter)
- [ ] Verificar mensagem aparece do lado direito
- [ ] Aguardar ~1 segundo
- [ ] Verificar resposta "pong" aparece do lado esquerdo
- [ ] Console deve mostrar:
  ```
  📤 [LiveChat] Enviando mensagem: Olá
  📨 [LiveChat] Nova mensagem: { content: "Olá", isFromAI: false }
  📨 [LiveChat] Nova mensagem: { content: "pong", isFromAI: true }
  ```

### 5.4 Teste: Persistência de Mensagens

- [ ] Enviar algumas mensagens
- [ ] Verificar no MongoDB:
  ```bash
  db.messages.find().pretty()
  ```
- [ ] Confirmar que mensagens foram salvas
- [ ] Confirmar que `isFromAI` está correto (false para user, true para bot)

### 5.5 Teste: Reconexão

- [ ] Fechar chat
- [ ] Reabrir chat
- [ ] Verificar que mensagens anteriores NÃO aparecem (será implementado depois)
- [ ] Enviar nova mensagem
- [ ] Verificar que funciona normalmente

### 5.6 Teste: Token Inválido

- [ ] Logout do frontend
- [ ] Verificar que botão de chat desaparece
- [ ] Login novamente
- [ ] Verificar que conecta normalmente

---

## 🎯 Critérios de Sucesso

### ✅ Frontend

- [ ] Botão flutuante aparece quando autenticado
- [ ] Popup abre e fecha suavemente
- [ ] Mensagens aparecem corretamente (user vs bot)
- [ ] Input funciona (digitar e enviar)
- [ ] Indicador de conexão funciona

### ✅ Backend

- [ ] Middleware de autenticação valida JWT
- [ ] Usuários são sincronizados no MongoDB
- [ ] Conversas são criadas/recuperadas
- [ ] Mensagens são persistidas
- [ ] Resposta "pong" é enviada automaticamente

### ✅ Integração

- [ ] Cookies HTTPOnly são enviados via WebSocket
- [ ] Autenticação funciona sem interação com backend principal
- [ ] Mensagens trafegam corretamente (frontend → backend → frontend)
- [ ] Logs aparecem em ambos os lados

---

## 📝 Logs Esperados

### Frontend Console

```
🔌 [LiveChat] Conectando ao servidor...
✅ [LiveChat] Conectado com sucesso
✅ [LiveChat] Conversa iniciada: 6516a3b2c4d5e6f7g8h9i0j1
📤 [LiveChat] Enviando mensagem: teste
📨 [LiveChat] Nova mensagem: { content: "teste", isFromAI: false }
📨 [LiveChat] Nova mensagem: { content: "pong", isFromAI: true }
```

### Backend Console

```
✅ [Auth] Usuário autenticado: pagansdev (43cbdaf3-f125-42c5-a4f9-b91f3043c71b)
🔌 [Socket] Nova conexão: abc123def456
✅ [UserSync] Usuário existente atualizado: pagansdev
✅ [Socket] Conversa existente: 6516a3b2c4d5e6f7g8h9i0j1
✅ [Socket] Usuário pagansdev conectado à conversa 6516a3b2c4d5e6f7g8h9i0j1
📩 [Socket] Mensagem recebida de pagansdev: "teste"
✅ [Socket] Mensagem do usuário salva e emitida
🤖 [Socket] Resposta "pong" enviada
```

---

## 🚀 Ordem de Execução

1. **Frontend - Componentes Visuais** (1-2h)

   - Criar tipos → ChatMessage → ChatButton → ChatPopup
   - Testar visualmente sem funcionalidade

2. **Backend - Autenticação** (1h)

   - Adicionar JWT_SECRET → Criar middleware → Aplicar no Socket.IO
   - Testar com Postman ou ferramenta similar

3. **Backend - Persistência** (1h)

   - UserSyncService → Modificar chat.ts → Testar salvamento

4. **Frontend - Integração** (1h)

   - Serviço → Hook → App.tsx → Testar conexão

5. **Testes Finais** (30min)
   - Executar todos os cenários de teste
   - Validar logs
   - Conferir MongoDB

**Tempo Total Estimado:** 4-5 horas

---

**Última atualização:** 30/09/2025  
**Versão:** MVP 1.0  
**Status:** Pronto para implementação
