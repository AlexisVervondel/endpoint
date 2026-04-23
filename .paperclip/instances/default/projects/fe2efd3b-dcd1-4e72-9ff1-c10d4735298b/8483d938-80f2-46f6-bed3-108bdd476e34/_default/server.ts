import express from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001
const IS_PROD = process.env.NODE_ENV === 'production'

app.use(express.json())

app.get('/api/stats', async (_req, res) => {
  try {
    const { stdout } = await execAsync('rtk gain --all --format json', {
      timeout: 15_000,
      env: { ...process.env, PATH: process.env.PATH },
    })
    const data = JSON.parse(stdout)
    res.json(data)
  } catch (err) {
    console.error('[/api/stats] rtk error:', err)
    res.status(500).json({ error: 'Failed to run rtk gain' })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() })
})

if (IS_PROD) {
  const distDir = path.join(__dirname, '..', 'dist')
  app.use(express.static(distDir))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`RTK Dashboard server running on http://localhost:${PORT}`)
})
