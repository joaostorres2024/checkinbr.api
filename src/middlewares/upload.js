const multer = require('multer')
const path   = require('path')
const fs     = require('fs')

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'imoveis')

// Garante que a pasta existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname)
    const nome = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, nome)
  },
})

const fileFilter = (_req, file, cb) => {
  const tiposPermitidos = /jpeg|jpg|png|webp/
  const ok = tiposPermitidos.test(path.extname(file.originalname).toLowerCase())

  if (ok) {
    cb(null, true)
  } else {
    cb(new Error('Formato de imagem inválido. Use JPG, PNG ou WEBP.'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB por foto
})

module.exports = upload
