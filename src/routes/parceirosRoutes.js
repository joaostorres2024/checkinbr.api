const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/parceirosController')
const authMiddleware = require('../middlewares/authMiddleware')
const upload = require('../middlewares/upload')

router.get('/', ctrl.listar)
router.get('/admin', authMiddleware, ctrl.listarAdmin)
router.post('/', authMiddleware, upload.uploadParceiro.single('logo'), ctrl.criar)
router.put('/:id', authMiddleware, upload.uploadParceiro.single('logo'), ctrl.atualizar)
router.delete('/:id', authMiddleware, ctrl.remover)

module.exports = router