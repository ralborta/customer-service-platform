# Esquema de Base de Datos

## Tablas Principales

### 1. **tenants** (Multi-tenancy)
- `id`, `name`, `slug`, `settings` (JSON con configuración de IA)
- Configuración por tenant: `aiMode`, `autopilotCategories`, `confidenceThreshold`

### 2. **users** (Usuarios del sistema)
- `id`, `tenantId`, `email`, `name`, `password` (hashed), `role`, `active`
- Roles: `admin`, `agent`, `supervisor`

### 3. **customers** (Clientes)
- `id`, `tenantId`, `phoneNumber`, `email`, `name`, `metadata`
- Índices en `phoneNumber` y `email` para búsquedas rápidas

### 4. **contacts** (Contactos adicionales)
- `id`, `customerId`, `type`, `value`, `isPrimary`
- Tipos: `phone`, `email`, `whatsapp`

### 5. **channel_accounts** (Cuentas de canales)
- `id`, `tenantId`, `channel`, `accountKey`, `config`, `active`
- Ejemplo: `channel: "builderbot_whatsapp"`, `accountKey: "builderbot_whatsapp_main"`

### 6. **conversations** (Conversaciones unificadas) ⭐ CORE
- `id`, `tenantId`, `customerId`, `primaryChannel`, `status`, `priority`, `assignedToId`, `tags`
- Canales: `WHATSAPP`, `CALL`, `EMAIL`
- Estados: `OPEN`, `PENDING`, `RESOLVED`, `CLOSED`
- Prioridades: `LOW`, `MEDIUM`, `HIGH`, `URGENT`

### 7. **messages** (Mensajes) ⭐ CORE
- `id`, `conversationId`, `channel`, `direction`, `text`, `rawPayload`, `attachments`, `metadata`
- Direcciones: `INBOUND` (del cliente), `OUTBOUND` (del agente/sistema)
- Metadata: `suggestedReply`, `suggestedActions`, `intent`, `confidence`, `builderbotMessageId`

### 8. **tickets** (Tickets/Casos) ⭐ CORE
- `id`, `tenantId`, `conversationId`, `number`, `status`, `category`, `priority`, `title`, `summary`, `assignedToId`, `slaDueAt`
- Estados: `NEW`, `IN_PROGRESS`, `WAITING_CUSTOMER`, `RESOLVED`, `CLOSED`
- Categorías: `RECLAMO`, `INFO`, `FACTURACION`, `TRACKING`, `COTIZACION`, `OTRO`

### 9. **ticket_events** (Eventos de tickets)
- `id`, `ticketId`, `type`, `data`, `createdById`
- Tipos: `status_change`, `assignment`, `comment`, `call.completed`

### 10. **knowledge_articles** (Base de conocimientos)
- `id`, `tenantId`, `title`, `content`, `sourceType`, `sourceUrl`, `tags`, `embeddingVector`
- `embeddingVector`: preparado para pgvector (RAG)

### 11. **shipments** (Envíos/Tracking)
- `id`, `tenantId`, `conversationId`, `trackingNumber`, `carrier`, `status`, `metadata`
- Estados: `pending`, `in_transit`, `delivered`, `exception`

### 12. **shipment_events** (Eventos de envío)
- `id`, `shipmentId`, `status`, `description`, `location`, `occurredAt`, `rawData`

### 13. **invoices** (Facturas - Mock)
- `id`, `tenantId`, `customerId`, `number`, `amount`, `currency`, `status`, `dueDate`
- Estados: `pending`, `paid`, `overdue`, `cancelled`

### 14. **quotes** (Cotizaciones - Mock)
- `id`, `tenantId`, `customerId`, `number`, `status`, `notes`, `expiresAt`
- Estados: `draft`, `sent`, `accepted`, `rejected`, `expired`

### 15. **quote_items** (Items de cotización)
- `id`, `quoteId`, `description`, `quantity`, `unitPrice`

### 16. **call_sessions** (Sesiones de llamadas)
- `id`, `conversationId`, `phoneNumber`, `startedAt`, `endedAt`, `duration`, `outcome`, `summary`, `transcript`, `rawPayload`

### 17. **survey_responses** (Respuestas de encuestas)
- `id`, `ticketId`, `type`, `score`, `comment`
- Tipos: `CSAT` (1-5), `NPS` (0-10)

### 18. **event_logs** (Log de eventos - Idempotencia) ⭐ IMPORTANTE
- `id`, `tenantId`, `idempotencyKey` (único), `source`, `type`, `rawPayload`, `processedAt`, `status`, `error`, `retryCount`
- Fuentes: `builderbot_whatsapp`, `elevenlabs_post_call`, `api`
- Estados: `pending`, `processed`, `failed`, `retrying`

## Cómo Crear las Tablas en Railway

### Opción 1: Desde tu máquina local (Recomendado)

```bash
# 1. Obtén DATABASE_URL de Railway
# Ve a PostgreSQL service → Variables → Copia DATABASE_URL

# 2. Configura en tu terminal
export DATABASE_URL="postgresql://postgres:password@host:port/railway"

# 3. Push schema (crea/actualiza tablas)
pnpm db:push

# 4. Seed con datos demo
pnpm db:seed
```

### Opción 2: Usando Railway CLI

```bash
# 1. Instalar Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Link al proyecto
railway link

# 4. Ejecutar comandos en contexto de Railway
railway run pnpm db:push
railway run pnpm db:seed
```

### Opción 3: Desde un servicio temporal en Railway

1. Crea un servicio temporal "db-migrate"
2. Build command: `pnpm install && pnpm --filter @customer-service/db build`
3. Start command: `pnpm --filter @customer-service/db db:push && pnpm --filter @customer-service/db db:seed`
4. Ejecuta una vez y luego elimina el servicio

## Datos de Seed

El seed crea:
- **2 Tenants**: `admin` y `demo`
- **2 Usuarios**: `admin@example.com` (password: `admin123`) y `agent@demo.com`
- **3 Customers** con números de teléfono
- **3 Conversations** con mensajes de ejemplo
- **3 Tickets**: uno de tracking, uno de facturación, uno de reclamo
- **3 Knowledge Articles** de ejemplo
- **1 ChannelAccount**: `builderbot_whatsapp_main`

## Verificar Tablas Creadas

### Desde Railway PostgreSQL:
1. Ve al servicio PostgreSQL
2. Click en **Query** o **Connect** → **psql**
3. Ejecuta:
```sql
\dt  -- Lista todas las tablas
SELECT COUNT(*) FROM tenants;  -- Verifica datos
```

### Desde tu máquina:
```bash
# Conectar con psql
psql $DATABASE_URL

# Listar tablas
\dt

# Ver datos
SELECT * FROM tenants;
SELECT * FROM conversations;
```

## Estructura de Relaciones

```
Tenant
├── Users
├── Customers
│   ├── Conversations
│   │   ├── Messages (INBOUND/OUTBOUND)
│   │   ├── Tickets
│   │   │   ├── TicketEvents
│   │   │   └── SurveyResponses
│   │   ├── CallSessions
│   │   └── Shipments
│   │       └── ShipmentEvents
│   ├── Invoices
│   └── Quotes
│       └── QuoteItems
├── KnowledgeArticles
└── ChannelAccounts

EventLog (idempotencia para webhooks)
```

## Notas Importantes

1. **Multi-tenancy**: Todas las tablas principales tienen `tenantId` (excepto EventLog que es opcional)
2. **Idempotencia**: `EventLog` usa `idempotencyKey` único para evitar procesar webhooks duplicados
3. **pgvector**: `KnowledgeArticle.embeddingVector` está preparado pero requiere extensión `vector` en PostgreSQL
4. **Cascadas**: Al eliminar un Tenant, se eliminan todos sus datos relacionados
5. **Índices**: Hay índices en campos frecuentemente consultados (tenantId, status, phoneNumber, etc.)
