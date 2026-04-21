import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { employeesRoutes } from './routes/employees.js'
import { checklistRoutes } from './routes/checklist.js'
import { documentsRoutes } from './routes/documents.js'
import { provisioningRoutes } from './routes/provisioning.js'

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    // ISO27001 A.12.4 — structured logging for SIEM ingestion
    ...(process.env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : {}),
  },
})

async function buildApp() {
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
      },
    },
  })

  await server.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5175',
    credentials: true,
  })

  await server.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  })

  await server.register(employeesRoutes, { prefix: '/api/onboarding' })
  await server.register(checklistRoutes, { prefix: '/api/onboarding' })
  await server.register(documentsRoutes, { prefix: '/api/onboarding' })
  await server.register(provisioningRoutes, { prefix: '/api/onboarding' })

  server.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  return server
}

const PORT = Number(process.env.ONBOARDING_PORT ?? 3002)
const HOST = process.env.HOST ?? '0.0.0.0'

buildApp()
  .then((app) =>
    app.listen({ port: PORT, host: HOST }, (err) => {
      if (err) {
        app.log.error(err)
        process.exit(1)
      }
    }),
  )
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
