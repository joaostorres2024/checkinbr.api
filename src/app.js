require('dotenv').config()

const express          = require('express')
const cors             = require('cors')
const path             = require('path')

const authRoutes       = require('./routes/authRoutes')
const imoveisRoutes    = require('./routes/imoveisRoutes')
const comodidadesRoutes = require('./routes/comodidadesRoutes')

const app = express()

// ── Middlewares globais ────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json())

// ── Arquivos estáticos (fotos enviadas) ─────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// ── Rotas ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/imoveis', imoveisRoutes)
app.use('/api/comodidades', comodidadesRoutes)

// ── Health check ───────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ── 404 ────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }))

module.exports = app