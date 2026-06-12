const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const db     = require('../config/db')

async function login(req, res) {
  const { email, senha } = req.body

  if (!email || !senha) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' })
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, nome, email, senha_hash FROM administradores WHERE email = ? LIMIT 1',
      [email]
    )

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas.' })
    }

    const admin = rows[0]
    const senhaCorreta = await bcrypt.compare(senha, admin.senha_hash)

    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Credenciais inválidas.' })
    }

    const token = jwt.sign(
      { id: admin.id, nome: admin.nome, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    return res.json({
      token,
      admin: {
        id:    admin.id,
        nome:  admin.nome,
        email: admin.email,
      },
    })
  } catch (err) {
    console.error('[login]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}


async function me(req, res) {
  try {
    const [rows] = await db.execute(
      'SELECT id, nome, email, criado_em FROM administradores WHERE id = ? LIMIT 1',
      [req.admin.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Admin não encontrado.' })
    }

    return res.json(rows[0])
  } catch (err) {
    console.error('[me]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

module.exports = { login, me }