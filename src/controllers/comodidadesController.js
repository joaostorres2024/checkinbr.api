const db = require('../config/db')

// GET /api/comodidades
async function listar(_req, res) {
  try {
    const [rows] = await db.execute('SELECT id, nome, icone FROM comodidades ORDER BY nome ASC')
    return res.json(rows)
  } catch (err) {
    console.error('[comodidades:listar]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

module.exports = { listar }