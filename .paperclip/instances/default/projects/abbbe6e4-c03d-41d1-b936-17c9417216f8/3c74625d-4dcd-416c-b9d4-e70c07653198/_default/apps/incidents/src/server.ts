import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import { incidentsRoutes } from './routes/incidents.js'
import { timelineRoutes } from './routes/timeline.js'
import { postmortemRoutes } from './routes/postmortems.js'
import { reportsRoutes } from './routes/reports.js'

// Extend Fastify JWT types so request.user is typed throughout
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email?: string; role?: string }
    user: { sub: string; email?: string; role?: string }
  }
}

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    // ISO27001 A.12.4 - structured logging for SIEM ingestion
    ...(process.env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
  },
})

async function buildApp() {
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
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

  // JWT secret must be set explicitly; no insecure default in any env
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) throw new Error('JWT_SECRET environment variable is required')
  await server.register(jwt, { secret: jwtSecret })

  // Authenticate every request except /health
  server.addHook('preHandler', async (request, reply) => {
    if (request.routeOptions.url === '/health') return
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
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
