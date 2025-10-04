# Development

Configuração do ambiente de desenvolvimento e convenções de código.

## Environment Setup

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- npm ou yarn

### Installation

```bash
npm install
cp .env.example .env
```

### Development Scripts

```bash
npm run dev      # Desenvolvimento com watch
npm run build    # Compilação TypeScript
npm start        # Execução em produção
```

## Code Conventions

### TypeScript

- Usar tipos explícitos
- Preferir interfaces sobre types
- Organizar imports por contexto
- Usar strict mode

### File Structure

```
src/
├── models/      # Modelos Sequelize
├── services/    # Lógica de negócio
├── sockets/     # Socket.IO handlers
├── routes/      # API endpoints
└── config/      # Configurações
```

### Naming

- Classes: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Files: camelCase.ts

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "typeRoots": ["./node_modules/@types", "./@types"]
  }
}
```

### Type Definitions

- Centralizadas em `@types/`
- Organizadas por contexto
- Exportadas via `index.d.ts`

## Database

### Sequelize Models

- Usar interfaces para atributos
- Definir relacionamentos claramente
- Implementar validações

### Migrations

- Versionamento do schema
- Rollback capabilities
- Data seeding

## Testing

### Unit Tests

- Jest framework
- Mock external dependencies
- Test coverage > 80%

### Integration Tests

- API endpoints
- Database operations
- Socket.IO events

## Debugging

### Logs

- Níveis: DEBUG, INFO, WARN, ERROR
- Formato JSON estruturado
- Contexto de requisição

### Tools

- Node.js debugger
- Sequelize logging
- Socket.IO debugging
