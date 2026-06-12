const express = require('express')
const router  = express.Router()
const ctrl    = require('../controllers/comodidadesController')

router.get('/', ctrl.listar)

module.exports = router