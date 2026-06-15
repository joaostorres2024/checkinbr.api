const db = require('../config/db')

exports.listar = async (req, res) => {
  const { imovelId } = req.params  // ← era "id"
  try {
    const [rows] = await db.query(
      'SELECT * FROM imovel_datas_bloqueadas WHERE imovel_id = ? ORDER BY data_bloqueada ASC',
      [imovelId]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar datas bloqueadas.' })
  }
}

exports.bloquear = async (req, res) => {
  const { imovelId } = req.params  // ← era "id"
  const { datas, motivo } = req.body

  if (!datas || !datas.length) {
    return res.status(400).json({ message: 'Nenhuma data informada.' })
  }

  try {
    const values = datas.map(d => [require('crypto').randomUUID(), imovelId, d, motivo || 'bloqueio_manual'])
    await db.query(
      'INSERT IGNORE INTO imovel_datas_bloqueadas (id, imovel_id, data_bloqueada, motivo) VALUES ?',
      [values]
    )
    res.json({ message: 'Datas bloqueadas com sucesso.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Erro ao bloquear datas.' })
  }
}

exports.desbloquear = async (req, res) => {
  const { imovelId } = req.params  // ← era "id"
  const { datas } = req.body

  if (!datas || !datas.length) {
    return res.status(400).json({ message: 'Nenhuma data informada.' })
  }

  try {
    await db.query(
      'DELETE FROM imovel_datas_bloqueadas WHERE imovel_id = ? AND data_bloqueada IN (?)',
      [imovelId, datas]
    )
    res.json({ message: 'Datas desbloqueadas com sucesso.' })
  } catch (err) {
    res.status(500).json({ message: 'Erro ao desbloquear datas.' })
  }
}