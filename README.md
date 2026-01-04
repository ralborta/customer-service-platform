# Plataforma de Atención al Cliente potenciada con IA

Monorepo production-ready para una plataforma de atención al cliente orientada a WhatsApp (Builderbot.cloud) y con capacidad de incluir llamadas por ElevenLabs. Todo centralizado en un Centro de Gestión (web dashboard).

## 🏗️ Arquitectura

### Stack Tecnológico

- **Node.js 20+**
- **pnpm workspaces + Turborepo** para monorepo
- **apps/web**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **apps/api**: Fastify + TypeScript (REST API interna)
- **apps/channel-gateway**: Fastify + TypeScript (webhooks públicos)
- **apps/worker**: Node.js + TypeScript (jobs async, cron simple)
- **packages/shared**: Tipos, schemas Zod, helpers, adapters de canales
- **packages/db**: Prisma + PostgreSQL (preparado para pgvector)

### Estructura del Monorepo

```
Customer_Service/
├── apps/
│   ├── web/              # Next.js dashboard
│   ├── api/              # Fastify REST API
│   ├── channel-gateway/  # Webhooks públicos (Builderbot, ElevenLabs)
│   └── worker/           # Jobs async y scheduler
├── packages/
│   ├── shared/           # Tipos, schemas, adapters
│   └── db/               # Prisma schema y cliente
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 20+
- pnpm 8+
- Docker y Docker Compose (para PostgreSQL local)

### Instalación Local

1. **Clonar el repositorio**

```bash
git clone <repo-url>
cd Customer_Service
```

2. **Instalar dependencias**

```bash
pnpm install
```

3. **Configurar variables de entorno**

Copia los archivos `.env.example` y configura según tu entorno:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/channel-gateway/.env.example apps/channel-gateway/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env.local
```

4. **Levantar PostgreSQL con Docker**

```bash
docker-compose up -d
```

5. **Configurar base de datos**

```bash
# Push schema (desarrollo)
pnpm db:push

# O crear migración (producción)
pnpm db:migrate

# Seed con datos demo
pnpm db:seed
```

6. **Iniciar todos los servicios en desarrollo**

```bash
pnpm dev
```

Esto iniciará:
- **API**: http://localhost:3000
- **Channel Gateway**: http://localhost:3001
- **Web Dashboard**: http://localhost:3002
- **Worker**: Procesando jobs en background

### Credenciales Demo

Después del seed:
- **Email**: `agent@demo.com`
- **Password**: `admin123`

## 📋 Funcionalidades MVP

### 1. WhatsApp-First

- Recibir mensajes por webhook desde Builderbot
- Clasificación automática con IA (triage)
- Respuestas automáticas (autopilot) o asistidas (assisted)
- Creación automática de tickets

### 2. Tickets/Reclamos

- Creación automática desde conversaciones
- Gestión de estados (NEW, IN_PROGRESS, RESOLVED, CLOSED)
- Asignación a agentes
- Eventos y auditoría

### 3. Knowledge Base con RAG

- Artículos de conocimiento
- Búsqueda semántica (estructura lista para embeddings)
- Ingest de contenido (stub funcional)

### 4. Track & Trace

- Modo DEMO con timeline simulado
- Interfaz lista para proveedores reales (AfterShip, 17Track)
- Asociación con conversaciones y tickets

### 5. Facturación y Cotizaciones

- MVP con datos mock
- Estructura lista para integraciones reales

### 6. Llamadas (ElevenLabs)

- Recibir webhook post-call
- Asociar a conversación/ticket
- Sugerir seguimiento por WhatsApp

### 7. Observabilidad

- Event log con idempotencia
- Manejo de errores y reintentos
- Auditoría completa

## 🔧 Configuración

### Variables de Entorno Principales

#### Database
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/customer_service?schema=public"
```

#### JWT
```env
JWT_SECRET="change-me-in-production-use-strong-secret"
```

#### Builderbot (WhatsApp)
```env
BUILDERBOT_API_URL=https://api.builderbot.cloud
BUILDERBOT_API_KEY=tu_api_key
BUILDERBOT_BOT_ID=tu_bot_id
```

#### ElevenLabs (Calls)
```env
ELEVENLABS_API_KEY=tu_api_key
ELEVENLABS_AGENT_ID=tu_agent_id
```

#### OpenAI (Opcional - para LLM real)
```env
OPENAI_API_KEY=tu_api_key
```

### Webhooks

#### Builderbot → Channel Gateway

Configura en Builderbot el webhook:
```
POST https://tu-dominio.com/webhooks/builderbot/whatsapp
Headers:
  X-Account-Key: builderbot_whatsapp_main
```

#### ElevenLabs → Channel Gateway

Configura en ElevenLabs el webhook post-call:
```
POST https://tu-dominio.com/webhooks/elevenlabs/post-call
Headers:
  X-Account-Key: elevenlabs_calls_main
```

## 📦 Deploy

### Railway (API + Gateway + Worker + Postgres)

1. **Crear proyecto en Railway**

2. **Agregar servicios:**
   - PostgreSQL (desde template)
   - API (desde GitHub)
   - Channel Gateway (desde GitHub)
   - Worker (desde GitHub)

3. **Variables de entorno en Railway:**

   Para cada servicio, configura:
   - `DATABASE_URL` (desde el servicio PostgreSQL)
   - `JWT_SECRET` (genera uno seguro)
   - `CORS_ORIGIN` (URL de tu frontend)
   - `BUILDERBOT_API_KEY`, `ELEVENLABS_API_KEY`, etc.

4. **Configurar dominios:**
   - API: `api.tu-dominio.com`
   - Gateway: `gateway.tu-dominio.com` (o subdominio)

### Vercel (Web Dashboard)

1. **Conectar repositorio GitHub a Vercel**

2. **Configurar proyecto:**
   - Root Directory: `apps/web`
   - Framework: Next.js
   - Build Command: `pnpm build`
   - Install Command: `pnpm install`

3. **Variables de entorno:**
   - `NEXT_PUBLIC_API_URL`: URL de tu API en Railway

4. **Deploy**

## 🗄️ Base de Datos

### Schema Principal

- **Tenant**: Multi-tenancy
- **User**: Usuarios del sistema
- **Customer**: Clientes
- **Conversation**: Conversaciones unificadas (WhatsApp, Calls, etc.)
- **Message**: Mensajes de conversaciones
- **Ticket**: Tickets/casos
- **KnowledgeArticle**: Artículos de conocimiento
- **Shipment**: Envíos y tracking
- **CallSession**: Sesiones de llamadas
- **EventLog**: Log de eventos (idempotencia)

### Migraciones

```bash
# Crear migración
pnpm --filter db db:migrate

# Aplicar migraciones
pnpm --filter db db:push
```

### Seed

```bash
pnpm db:seed
```

Crea:
- 2 tenants (admin, demo)
- 2 usuarios (admin, agent)
- 3 clientes
- 3 conversaciones con mensajes
- 3 tickets
- 3 artículos de conocimiento

## 🔐 Seguridad

- **Idempotencia**: Todos los webhooks usan `EventLog` con `idempotencyKey`
- **Rate Limiting**: Implementado en channel-gateway
- **JWT Auth**: Para API interna
- **Validación Zod**: En todos los endpoints
- **CORS**: Configurado por app

## 🧪 Modos de Operación IA

### ASSISTED (Asistido)

- IA sugiere respuesta y acciones
- Humano aprueba desde web dashboard
- Configurable por tenant

### AUTOPILOT (Automático)

- IA responde automáticamente por WhatsApp
- Solo en categorías de bajo riesgo (INFO, TRACKING)
- Configurable por tenant

### Guardrails

- Si `confidence < threshold`: crear ticket y pedir datos
- Categorías de alto riesgo siempre requieren aprobación humana

## 📚 Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Inicia todos los servicios en modo dev

# Build
pnpm build            # Build de todos los packages y apps

# Lint
pnpm lint             # Lint de todo el monorepo

# Database
pnpm db:push          # Push schema (desarrollo)
pnpm db:migrate       # Crear/aplicar migraciones
pnpm db:seed          # Seed con datos demo
pnpm db:studio        # Abrir Prisma Studio

# Limpieza
pnpm clean            # Limpia builds de todos los packages
```

## 🛠️ Desarrollo

### Agregar un nuevo endpoint

1. **En `apps/api/src/index.ts`**:
```typescript
fastify.get('/nuevo-endpoint', async (request, reply) => {
  const user = request.user as AuthUser;
  // Tu lógica aquí
});
```

### Agregar un nuevo job al worker

1. **Crear job en `apps/worker/src/jobs/`**
2. **Agregar al scheduler en `apps/worker/src/index.ts`**

### Agregar una nueva página al dashboard

1. **Crear en `apps/web/src/app/nueva-pagina/page.tsx`**
2. **Agregar al Sidebar en `apps/web/src/components/Sidebar.tsx`**

## 📝 Notas Importantes

- **WhatsApp es el canal dominante**: Las entidades priorizan `phone_number` y conversación
- **Calls son eventos**: Enriquecen el caso, se ven en timeline
- **MVP funciona sin keys externas**: Stubs implementados para desarrollo
- **No requiere Redis**: Queue simple en memoria (MVP)
- **pgvector preparado**: Schema listo, implementación de embeddings opcional

## 🐛 Troubleshooting

### Error: "Cannot find module '@customer-service/shared'"

```bash
pnpm install
pnpm build --filter=@customer-service/shared
```

### Error de conexión a PostgreSQL

```bash
# Verificar que Docker está corriendo
docker ps

# Reiniciar contenedor
docker-compose restart postgres
```

### Error en webhooks

- Verificar que `channel-gateway` está corriendo
- Verificar headers `X-Account-Key`
- Revisar logs en `EventLog` table

## 📄 Licencia

[Tu licencia aquí]

## 🤝 Contribución

[Guía de contribución aquí]

---

**Desarrollado con ❤️ para atención al cliente potenciada con IA**
