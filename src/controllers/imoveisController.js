const { v4: uuidv4 } = require('uuid')
const db = require('../config/db')

// ────────────────────────────────────────────────────────────
// GET /api/imoveis
// Lista todos os imóveis (com foto de capa)
// ────────────────────────────────────────────────────────────
async function listar(req, res) {
  try {
    const { cidade, estado, tipo, ativo } = req.query

    let sql = `
      SELECT
        i.*,
        (
          SELECT f.url FROM fotos_imovel f
          WHERE f.imovel_id = i.id AND f.capa = 1
          LIMIT 1
        ) AS foto_capa
      FROM imoveis i
      WHERE 1 = 1
    `
    const params = []

    if (cidade) {
      sql += ' AND i.cidade = ?'
      params.push(cidade)
    }
    if (estado) {
      sql += ' AND i.estado = ?'
      params.push(estado)
    }
    if (tipo) {
      sql += ' AND i.tipo = ?'
      params.push(tipo)
    }
    if (ativo !== undefined) {
      sql += ' AND i.ativo = ?'
      params.push(ativo === 'true' ? 1 : 0)
    }

    sql += ' ORDER BY i.criado_em DESC'

    const [rows] = await db.execute(sql, params)
    return res.json(rows)
  } catch (err) {
    console.error('[imoveis:listar]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/imoveis/:id
// Detalhe completo: imóvel + fotos + comodidades
// ────────────────────────────────────────────────────────────
async function buscarPorId(req, res) {
  try {
    const { id } = req.params

    const [imovelRows] = await db.execute(
      'SELECT * FROM imoveis WHERE id = ? LIMIT 1',
      [id]
    )

    if (imovelRows.length === 0) {
      return res.status(404).json({ message: 'Imóvel não encontrado.' })
    }

    const [fotos] = await db.execute(
      'SELECT id, url, alt_text, ordem, capa FROM fotos_imovel WHERE imovel_id = ? ORDER BY ordem ASC',
      [id]
    )

    const [comodidades] = await db.execute(
      `SELECT c.id, c.nome, c.icone
       FROM comodidades c
       INNER JOIN imovel_comodidades ic ON ic.comodidade_id = c.id
       WHERE ic.imovel_id = ?`,
      [id]
    )

    return res.json({
      ...imovelRows[0],
      fotos,
      comodidades,
    })
  } catch (err) {
    console.error('[imoveis:buscarPorId]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/imoveis
// Cria imóvel + fotos (upload) + comodidades, tudo numa requisição
// Espera multipart/form-data:
//   - campos do imóvel (titulo, descricao, tipo, ...)
//   - comodidades: string JSON, ex: '["id1","id2"]'
//   - fotos: arquivos (campo "fotos", múltiplos)
//   - capa_index: índice da foto que será a capa (opcional, default 0)
// ────────────────────────────────────────────────────────────
async function criar(req, res) {
  const conn = await db.getConnection()

  try {
    const {
      titulo,
      descricao,
      tipo,
      capacidade_max,
      preco_diaria,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      latitude,
      longitude,
      ativo,
      comodidades,   // JSON string: '["uuid1","uuid2"]'
      capa_index,    // índice da foto capa (default 0)
    } = req.body

    if (!titulo || !preco_diaria) {
      conn.release()
      return res.status(400).json({ message: 'Título e preço diária são obrigatórios.' })
    }

    await conn.beginTransaction()

    const imovelId = uuidv4()

    // 1. Criar o imóvel
    await conn.execute(
      `INSERT INTO imoveis (
        id, titulo, descricao, tipo, capacidade_max, preco_diaria,
        cep, logradouro, numero, complemento, bairro, cidade, estado,
        latitude, longitude, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        imovelId,
        titulo,
        descricao || null,
        tipo || 'apartamento',
        capacidade_max || 1,
        preco_diaria,
        cep || null,
        logradouro || null,
        numero || null,
        complemento || null,
        bairro || null,
        cidade || null,
        estado || null,
        latitude || null,
        longitude || null,
        ativo === 'false' ? 0 : 1,
      ]
    )

    // 2. Salvar fotos enviadas (multer já gravou no disco)
    const arquivos = req.files || []
    const capaIdx  = capa_index !== undefined ? parseInt(capa_index, 10) : 0

    for (let i = 0; i < arquivos.length; i++) {
      const file = arquivos[i]
      const url  = `/uploads/imoveis/${file.filename}`

      await conn.execute(
        `INSERT INTO fotos_imovel (id, imovel_id, url, alt_text, ordem, capa)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          imovelId,
          url,
          titulo,
          i,
          i === capaIdx ? 1 : 0,
        ]
      )
    }

    // 3. Vincular comodidades
    if (comodidades) {
      let listaComodidades = []
      try {
        listaComodidades = JSON.parse(comodidades)
      } catch {
        listaComodidades = []
      }

      for (const comodidadeId of listaComodidades) {
        await conn.execute(
          `INSERT INTO imovel_comodidades (imovel_id, comodidade_id) VALUES (?, ?)`,
          [imovelId, comodidadeId]
        )
      }
    }

    await conn.commit()
    conn.release()

    return res.status(201).json({ id: imovelId, message: 'Imóvel criado com sucesso.' })
  } catch (err) {
    await conn.rollback()
    conn.release()
    console.error('[imoveis:criar]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

// ────────────────────────────────────────────────────────────
// PUT /api/imoveis/:id
// Atualiza dados básicos do imóvel (sem fotos/comodidades)
// ────────────────────────────────────────────────────────────
async function atualizar(req, res) {
  try {
    const { id } = req.params
    const {
      titulo,
      descricao,
      tipo,
      capacidade_max,
      preco_diaria,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      latitude,
      longitude,
      ativo,
    } = req.body

    const [result] = await db.execute(
      `UPDATE imoveis SET
        titulo = ?, descricao = ?, tipo = ?, capacidade_max = ?, preco_diaria = ?,
        cep = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?,
        cidade = ?, estado = ?, latitude = ?, longitude = ?, ativo = ?
       WHERE id = ?`,
      [
        titulo, descricao || null, tipo, capacidade_max, preco_diaria,
        cep || null, logradouro || null, numero || null, complemento || null,
        bairro || null, cidade || null, estado || null,
        latitude || null, longitude || null,
        ativo === 'false' || ativo === false ? 0 : 1,
        id,
      ]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Imóvel não encontrado.' })
    }

    return res.json({ message: 'Imóvel atualizado com sucesso.' })
  } catch (err) {
    console.error('[imoveis:atualizar]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

// ────────────────────────────────────────────────────────────
// PUT /api/imoveis/:id/comodidades
// Substitui o conjunto de comodidades do imóvel
// Body: { comodidades: ["uuid1", "uuid2"] }
// ────────────────────────────────────────────────────────────
async function atualizarComodidades(req, res) {
  const conn = await db.getConnection()

  try {
    const { id } = req.params
    const { comodidades } = req.body

    if (!Array.isArray(comodidades)) {
      conn.release()
      return res.status(400).json({ message: 'comodidades deve ser um array de IDs.' })
    }

    await conn.beginTransaction()

    await conn.execute('DELETE FROM imovel_comodidades WHERE imovel_id = ?', [id])

    for (const comodidadeId of comodidades) {
      await conn.execute(
        'INSERT INTO imovel_comodidades (imovel_id, comodidade_id) VALUES (?, ?)',
        [id, comodidadeId]
      )
    }

    await conn.commit()
    conn.release()

    return res.json({ message: 'Comodidades atualizadas com sucesso.' })
  } catch (err) {
    await conn.rollback()
    conn.release()
    console.error('[imoveis:atualizarComodidades]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/imoveis/:id/fotos
// Adiciona novas fotos a um imóvel já existente
// ────────────────────────────────────────────────────────────
async function adicionarFotos(req, res) {
  try {
    const { id } = req.params
    const arquivos = req.files || []

    if (arquivos.length === 0) {
      return res.status(400).json({ message: 'Nenhuma foto enviada.' })
    }

    // Próxima ordem disponível
    const [rows] = await db.execute(
      'SELECT COALESCE(MAX(ordem), -1) AS maxOrdem FROM fotos_imovel WHERE imovel_id = ?',
      [id]
    )
    let ordem = rows[0].maxOrdem + 1

    const fotosInseridas = []

    for (const file of arquivos) {
      const url      = `/uploads/imoveis/${file.filename}`
      const fotoId   = uuidv4()

      await db.execute(
        `INSERT INTO fotos_imovel (id, imovel_id, url, ordem, capa)
         VALUES (?, ?, ?, ?, 0)`,
        [fotoId, id, url, ordem]
      )

      fotosInseridas.push({ id: fotoId, url, ordem })
      ordem++
    }

    return res.status(201).json({ fotos: fotosInseridas })
  } catch (err) {
    console.error('[imoveis:adicionarFotos]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

// ────────────────────────────────────────────────────────────
// DELETE /api/imoveis/:id/fotos/:fotoId
// ────────────────────────────────────────────────────────────
async function removerFoto(req, res) {
  try {
    const { id, fotoId } = req.params

    const [result] = await db.execute(
      'DELETE FROM fotos_imovel WHERE id = ? AND imovel_id = ?',
      [fotoId, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Foto não encontrada.' })
    }

    return res.json({ message: 'Foto removida com sucesso.' })
  } catch (err) {
    console.error('[imoveis:removerFoto]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

// ────────────────────────────────────────────────────────────
// PUT /api/imoveis/:id/fotos/:fotoId/capa
// Define uma foto como capa (e desmarca as outras)
// ────────────────────────────────────────────────────────────
async function definirCapa(req, res) {
  const conn = await db.getConnection()

  try {
    const { id, fotoId } = req.params

    await conn.beginTransaction()

    await conn.execute('UPDATE fotos_imovel SET capa = 0 WHERE imovel_id = ?', [id])

    const [result] = await conn.execute(
      'UPDATE fotos_imovel SET capa = 1 WHERE id = ? AND imovel_id = ?',
      [fotoId, id]
    )

    if (result.affectedRows === 0) {
      await conn.rollback()
      conn.release()
      return res.status(404).json({ message: 'Foto não encontrada.' })
    }

    await conn.commit()
    conn.release()

    return res.json({ message: 'Capa atualizada com sucesso.' })
  } catch (err) {
    await conn.rollback()
    conn.release()
    console.error('[imoveis:definirCapa]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

// ────────────────────────────────────────────────────────────
// DELETE /api/imoveis/:id
// ────────────────────────────────────────────────────────────
async function remover(req, res) {
  try {
    const { id } = req.params

    const [result] = await db.execute('DELETE FROM imoveis WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Imóvel não encontrado.' })
    }

    return res.json({ message: 'Imóvel removido com sucesso.' })
  } catch (err) {
    console.error('[imoveis:remover]', err)
    return res.status(500).json({ message: 'Erro interno.' })
  }
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  atualizarComodidades,
  adicionarFotos,
  removerFoto,
  definirCapa,
  remover,
}
