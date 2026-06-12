const express        = require('express')
const router         = express.Router()

const ctrl           = require('../controllers/imoveisController')
const authMiddleware = require('../middlewares/authMiddleware')
const upload         = require('../middlewares/upload')

// ── Públicas ─────────────────────────────────────────────────
router.get('/', ctrl.listar)
router.get('/:id', ctrl.buscarPorId)

// ── Protegidas (admin) ───────────────────────────────────────
router.post('/', authMiddleware, upload.array('fotos', 20), ctrl.criar)
router.put('/:id', authMiddleware, ctrl.atualizar)
router.put('/:id/comodidades', authMiddleware, ctrl.atualizarComodidades)
router.post('/:id/fotos', authMiddleware, upload.array('fotos', 20), ctrl.adicionarFotos)
router.delete('/:id/fotos/:fotoId', authMiddleware, ctrl.removerFoto)
router.put('/:id/fotos/:fotoId/capa', authMiddleware, ctrl.definirCapa)
router.delete('/:id', authMiddleware, ctrl.remover)

module.exports = router
