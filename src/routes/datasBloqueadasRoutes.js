const express = require('express')
const router  = express.Router()

const ctrl           = require('../controllers/datasBloqueadasController')
const authMiddleware = require('../middlewares/authMiddleware')

router.get('/imoveis/:imovelId/datas-bloqueadas', authMiddleware, ctrl.listar)
router.post('/imoveis/:imovelId/datas-bloqueadas', authMiddleware, ctrl.bloquear)
router.delete('/imoveis/:imovelId/datas-bloqueadas', authMiddleware, ctrl.desbloquear)

module.exports = router