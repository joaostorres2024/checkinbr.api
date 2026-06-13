const express        = require('express')
const router         = express.Router()

const ctrl           = require('../controllers/topImoveisController')
const authMiddleware = require('../middlewares/authMiddleware')

// ── Públicas ─────────────────────────────────────────────────
// Usado na seção "TOP HOSPEDAGENS" do site
router.get('/', ctrl.listar)

// ── Protegidas (admin) ───────────────────────────────────────
router.get('/disponiveis', authMiddleware, ctrl.listarDisponiveis)
router.post('/', authMiddleware, ctrl.adicionar)
router.put('/reordenar', authMiddleware, ctrl.reordenar)
router.delete('/:id', authMiddleware, ctrl.remover)

module.exports = router