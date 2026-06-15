const express = require('express')
const router  = express.Router()
const ctrl    = require('../controllers/comodidadesController')
const authMiddleware = require('../middlewares/authMiddleware')

router.get('/', ctrl.listar)

module.exports = router