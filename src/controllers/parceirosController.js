const db = require('../config/db')
const path = require('path')
const fs = require('fs')

exports.listar = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM parceiros WHERE ativo = 1 ORDER BY ordem ASC')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar parceiros.' })
  }
}

exports.listarAdmin = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM parceiros ORDER BY ordem ASC')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar parceiros.' })
  }
}

exports.criar = async (req, res) => {
  const { nome, site_url } = req.body
  const logo_url = req.file ? `/uploads/parceiros/${req.file.filename}` : null

  if (!nome || !logo_url) {
    return res.status(400).json({ message: 'Nome e logo são obrigatórios.' })
  }

  try {
    const id = require('crypto').randomUUID()
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM parceiros')

    await db.query(
      'INSERT INTO parceiros (id, nome, logo_url, site_url, ordem) VALUES (?, ?, ?, ?, ?)',
      [id, nome, logo_url, site_url || null, total]
    )
    res.status(201).json({ id, nome, logo_url, site_url, ordem: total, ativo: 1 })
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar parceiro.' })
  }
}

exports.atualizar = async (req, res) => {
  const { id } = req.params
  const { nome, site_url, ativo, ordem } = req.body
  const logo_url = req.file ? `/uploads/parceiros/${req.file.filename}` : null

  try {
    const fields = []
    const values = []

    if (nome !== undefined)     { fields.push('nome = ?');     values.push(nome) }
    if (site_url !== undefined) { fields.push('site_url = ?'); values.push(site_url) }
    if (ativo !== undefined)    { fields.push('ativo = ?');    values.push(ativo) }
    if (ordem !== undefined)    { fields.push('ordem = ?');    values.push(ordem) }
    if (logo_url)               { fields.push('logo_url = ?'); values.push(logo_url) }

    if (!fields.length) return res.status(400).json({ message: 'Nada para atualizar.' })

    values.push(id)
    await db.query(`UPDATE parceiros SET ${fields.join(', ')} WHERE id = ?`, values)
    res.json({ message: 'Parceiro atualizado.' })
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar parceiro.' })
  }
}

exports.remover = async (req, res) => {
  const { id } = req.params
  try {
    const [rows] = await db.query('SELECT logo_url FROM parceiros WHERE id = ?', [id])
    if (rows[0]?.logo_url) {
      const filePath = path.join(__dirname, '../../', rows[0].logo_url)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    await db.query('DELETE FROM parceiros WHERE id = ?', [id])
    res.json({ message: 'Parceiro removido.' })
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover parceiro.' })
  }
}