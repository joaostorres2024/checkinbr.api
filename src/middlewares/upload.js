const multer = require('multer')
const path   = require('path')
const fs     = require('fs')

// ── Imóveis ───────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'imoveis')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const imoveisStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  }
})

const imageFilter = (_req, file, cb) => {
  const ok = /jpeg|jpg|png|webp|avif/.test(path.extname(file.originalname).toLowerCase())
  ok ? cb(null, true) : cb(new Error('Formato inválido. Use JPG, PNG, WEBP ou AVIF.'))
}

const upload = multer({
  storage: imoveisStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
})

// ── Parceiros ─────────────────────────────────────────────────
const parceirosDir = path.join(__dirname, '..', '..', 'uploads', 'parceiros')
if (!fs.existsSync(parceirosDir)) fs.mkdirSync(parceirosDir, { recursive: true })

const parceirosStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, parceirosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  }
})

const logoFilter = (_req, file, cb) => {
  const ok = /jpeg|jpg|png|webp|svg\+xml|svg/.test(
    file.mimetype === 'image/svg+xml' ? 'svg' : path.extname(file.originalname).toLowerCase().replace('.', '')
  )
  ok ? cb(null, true) : cb(new Error('Formato inválido. Use JPG, PNG, WEBP ou SVG.'))
}

const uploadParceiro = multer({
  storage: parceirosStorage,
  fileFilter: logoFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
})

module.exports = upload
module.exports.uploadParceiro = uploadParceiro