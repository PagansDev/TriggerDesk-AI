# AI Integration

Integração com OpenRouter para processamento de IA.

## Configuration

### Environment Variables

```env
OPENROUTER_API_KEY=sua_chave_api
OPENROUTER_MODEL=openai/gpt-3.5-turbo
```

### Supported Models

- `openai/gpt-3.5-turbo`
- `openai/gpt-4`
- `anthropic/claude-3-haiku`
- `meta-llama/llama-2-70b-chat`

## Service Usage

### Basic Usage

```javascript
import openRouterService from '../services/openRouterService';

const response = await aiService.generateResponse(conversationId, userMessage);
```

### Parameters

- `conversationId`: ID da conversa para contexto
- `userMessage`: Mensagem do usuário
- `systemPrompt` (opcional): Prompt personalizado

## Response Format

### Success Response

```json
{
  "content": "Resposta da IA",
  "model": "openai/gpt-3.5-turbo",
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  }
}
```

### Error Response

```json
{
  "error": "API Error",
  "message": "Invalid API key",
  "code": 401
}
```

## Context Management

### Conversation History

O serviço mantém automaticamente o histórico da conversa para contexto.

### Context Limits

- Máximo de 10 mensagens anteriores
- Tokens limitados por modelo
- Contexto limpo a cada nova conversa

## Customization

### System Prompts

```javascript
const customPrompt = `
Você é um assistente de suporte técnico especializado em e-commerce.
Sempre seja prestativo e profissional.
`;

await aiService.generateResponse(conversationId, userMessage, customPrompt);
```

### Model Selection

```javascript
// Alterar modelo via environment
OPENROUTER_MODEL = openai / gpt - 4;

// Ou via código (requer modificação do serviço)
aiService.setModel('openai/gpt-4');
```

## Rate Limiting

### OpenRouter Limits

- 60 requests/minute (gratuito)
- 1000 requests/minute (pago)
- Tokens limitados por plano

### Implementation

```javascript
// Rate limiting implementado no serviço
const RATE_LIMIT = 60; // requests per minute
const requests = new Map();

function checkRateLimit() {
  const now = Date.now();
  const minuteAgo = now - 60000;

  // Limpar requisições antigas
  for (const [key, time] of requests) {
    if (time < minuteAgo) {
      requests.delete(key);
    }
  }

  return requests.size < RATE_LIMIT;
}
```

## Error Handling

### Common Errors

- `Invalid API key`: Chave inválida
- `Rate limit exceeded`: Limite de requisições
- `Model not found`: Modelo não disponível
- `Insufficient credits`: Créditos insuficientes

### Retry Logic

```javascript
async function generateWithRetry(conversationId, message, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await aiService.generateResponse(conversationId, message);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Monitoring

### Metrics

- Requests per minute
- Response time
- Error rate
- Token usage

### Logging

```javascript
console.log('AI Request:', {
  conversationId,
  messageLength: userMessage.length,
  model: OPENROUTER_MODEL,
  timestamp: new Date().toISOString(),
});
```

## Best Practices

### Prompt Engineering

- Seja específico no contexto
- Use exemplos quando possível
- Defina limites claros
- Teste diferentes abordagens

### Performance

- Cache respostas similares
- Implemente timeout
- Use streaming quando disponível
- Monitore custos

### Security

- Valide entrada do usuário
- Sanitize saída da IA
- Implemente filtros de conteúdo
- Log todas as interações
