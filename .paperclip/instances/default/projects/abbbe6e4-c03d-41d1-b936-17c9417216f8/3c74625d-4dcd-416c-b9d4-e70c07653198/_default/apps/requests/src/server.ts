import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { requestsRoutes } from './routes/requests.js'
import { commentsRoutes } from './routes/comments.js'
import { statsRoutes } from './routes/stats.js'

const server = Fastify({
  logger:
    process.env.NODE_ENV === 'development'
      ? { level: process.env.LOG_LEVEL ?? 'info', transport: { target: 'pino-pretty' } }
      : { level: process.env.LOG_LEVEL ?? 'info' },
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

  await server.register(statsRoutes, { prefix: '/api/requests' })
  await server.register(requestsRoutes, { prefix: '/api/requests' })
  await server.register(commentsRoutes, { prefix: '/api/requests' })

  server.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  return server
}

const PORT = Number(process.env.REQUESTS_PORT ?? process.env.PORT ?? 3002)
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
