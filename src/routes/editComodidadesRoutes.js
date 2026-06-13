const express        = require('express')
const router         = express.Router()

const ctrl           = require('../controllers/editComodidadesController')
const authMiddleware = require('../middlewares/authMiddleware')

// CRUD completo de comodidades (admin)
router.get('/', authMiddleware, ctrl.listar)
router.get('/:id', authMiddleware, ctrl.buscarPorId)
router.post('/', authMiddleware, ctrl.criar)
router.put('/:id', authMiddleware, ctrl.atualizar)
router.delete('/:id', authMiddleware, ctrl.remover)

module.exports = router