const { v4: uuidv4 } = require('uuid')
const db = require('../config/db')

// ────────────────────────────────────────────────────────────
// GET /api/comodidades
// Lista todas as comodidades cadastradas
// ────────────────────────────────────────────────────────────
async function listar(req, res) {
  try {
    const [rows] = await db.execute(
      'SELECT id, nome, icone FROM comodidades ORDER BY nome ASC'
    )
    return res.json(rows)
  } catch (err) {
    console.error('[comodidades:listar]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/comodidades/:id
// ────────────────────────────────────────────────────────────
async function buscarPorId(req, res) {
  try {
    const { id } = req.params

    const [rows] = await db.execute(
      'SELECT id, nome, icone FROM comodidades WHERE id = ? LIMIT 1',
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Comodidade não encontrada.' })
    }

    return res.json(rows[0])
  } catch (err) {
    console.error('[comodidades:buscarPorId]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/comodidades
// Body: { nome, icone }
// ────────────────────────────────────────────────────────────
async function criar(req, res) {
  try {
    const { nome, icone } = req.body

    if (!nome || !icone) {
      return res.status(400).json({ message: 'Nome e ícone são obrigatórios.' })
    }

    const id = uuidv4()

    await db.execute(
      'INSERT INTO comodidades (id, nome, icone) VALUES (?, ?, ?)',
      [id, nome, icone]
    )

    return res.status(201).json({ id, nome, icone })
  } catch (err) {
    console.error('[comodidades:criar]', err)

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Já existe uma comodidade com esse nome.' })
    }

    return res.status(500).json({ message: 'Erro interno.' })
  }
}

// ────────────────────────────────────────────────────────────
// PUT /api/comodidades/:id
// Body: { nome, icone }
// ────────────────────────────────────────────────────────────
async function atualizar(req, res) {
  try {
    const { id } = req.params
    const { nome, icone } = req.body

    if (!nome || !icone) {
      return res.status(400).json({ message: 'Nome e ícone são obrigatórios.' })
    }

    const [result] = await db.execute(
      'UPDATE comodidades SET nome = ?, icone = ? WHERE id = ?',
      [nome, icone, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Comodidade não encontrada.' })
    }

    return res.json({ message: 'Comodidade atualizada com sucesso.' })
  } catch (err) {
    console.error('[comodidades:atualizar]', err)

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Já existe uma comodidade com esse nome.' })
    }

    return res.status(500).json({ message: 'Erro interno.' })
  }
}

// ────────────────────────────────────────────────────────────
// DELETE /api/comodidades/:id
// ────────────────────────────────────────────────────────────
async function remover(req, res) {
  try {
    const { id } = req.params

    const [result] = await db.execute('DELETE FROM comodidades WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Comodidade não encontrada.' })
    }

    return res.json({ message: 'Comodidade removida com sucesso.' })
  } catch (err) {
    console.error('[comodidades:remover]', err)

    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ message: 'Esta comodidade está em uso por algum imóvel e não pode ser removida.' })
    }

    return res.status(500).json({ message: 'Erro interno.' })
  }
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  remover,
}