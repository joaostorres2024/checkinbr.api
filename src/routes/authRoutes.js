const express        = require('express')
const router         = express.Router()
const { login, me }  = require('../controllers/authController')
const authMiddleware = require('../middlewares/authMiddleware')

// POST /api/auth/login  — pública
router.post('/login', login)

// GET  /api/auth/me     — protegida
router.get('/me', authMiddleware, me)

module.exports = router