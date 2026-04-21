import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { incidentsRoutes } from './routes/incidents.js'
import { timelineRoutes } from './routes/timeline.js'
import { postmortemRoutes } from './routes/postmortems.js'
import { reportsRoutes } from './routes/reports.js'

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    // ISO27001 A.12.4 - structured logging for SIEM ingestion
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
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
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5174',
    credentials: true,
  })

  await server.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  })

  await server.register(incidentsRoutes, { prefix: '/api/incidents' })
  await server.register(timelineRoutes, { prefix: '/api/incidents' })
  await server.register(postmortemRoutes, { prefix: '/api/incidents' })
  await server.register(reportsRoutes, { prefix: '/api/reports' })

  server.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  return server
}

const PORT = Number(process.env.PORT ?? 3001)
const HOST = process.env.HOST ?? '0.0.0.0'

buildApp()
  .then((app) =>
    app.listen({ port: PORT, host: HOST }, (err) => {
      if (err) {
        app.log.error(err)
        process.exit(1)
      }
    })
  )
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
