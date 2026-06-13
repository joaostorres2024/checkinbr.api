const { v4: uuidv4 } = require('uuid')
const db = require('../config/db')

/**
 * Tabela: top_imoveis
 * Colunas: id (uuid), imovel_id (uuid, FK -> imoveis.id), posicao, atualizado_em
 *
 * Regra: guarda os imóveis em destaque ("Top Hospedagens" no site),
 * ordenados pela coluna `posicao` (1 = primeiro lugar, 2 = segundo, ...).
 * O usuário escolhe entre os imóveis já cadastrados (tabela `imoveis`);
 * aqui só ficam registrados o vínculo e a posição.
 */

const MAX_TOP = 4

// ────────────────────────────────────────────────────────────
// GET /api/top-imoveis
// Lista os imóveis em destaque, com dados completos para exibir
// (foto capa, título, cidade/estado, ativo), ordenados por posição.
// Usado tanto no admin quanto na seção "TOP HOSPEDAGENS" do site.
// ────────────────────────────────────────────────────────────
async function listar(req, res) {
  try {
    const [rows] = await db.execute(`
      SELECT
        ti.id,
        ti.imovel_id,
        ti.posicao,
        ti.atualizado_em,
        i.titulo,
        i.cidade,
        i.estado,
        i.ativo,
        i.preco_diaria,
        (
          SELECT f.url
          FROM fotos_imovel f
          WHERE f.imovel_id = i.id
          ORDER BY f.capa DESC, f.ordem ASC
          LIMIT 1
        ) AS foto_capa
      FROM top_imoveis ti
      INNER JOIN imoveis i ON i.id = ti.imovel_id
      ORDER BY ti.posicao ASC
    `)

    return res.json(rows)
  } catch (err) {
    console.error('[topImoveis:listar]', err)
    return res.status(500).json({ message: 'Erro ao listar Top Anúncios.' })
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/top-imoveis/disponiveis
// Lista os imóveis cadastrados que ainda NÃO estão no Top,
// para o usuário escolher quais quer destacar.
// ────────────────────────────────────────────────────────────
async function listarDisponiveis(req, res) {
  try {
    const [rows] = await db.execute(`
      SELECT
        i.id,
        i.titulo,
        i.cidade,
        i.estado,
        i.ativo,
        (
          SELECT f.url
          FROM fotos_imovel f
          WHERE f.imovel_id = i.id
          ORDER BY f.capa DESC, f.ordem ASC
          LIMIT 1
        ) AS foto_capa
      FROM imoveis i
      WHERE i.id NOT IN (SELECT imovel_id FROM top_imoveis)
      ORDER BY i.titulo ASC
    `)

    return res.json(rows)
  } catch (err) {
    console.error('[topImoveis:listarDisponiveis]', err)
    return res.status(500).json({ message: 'Erro ao listar imóveis disponíveis.' })
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/top-imoveis
// Body: { imovel_id }
// Vincula um imóvel já existente ao Top, na próxima posição livre.
// Limite máximo: MAX_TOP itens.
// ────────────────────────────────────────────────────────────
async function adicionar(req, res) {
  try {
    const { imovel_id } = req.body

    if (!imovel_id) {
      return res.status(400).json({ message: 'imovel_id é obrigatório.' })
    }

    // Garante que o imóvel existe
    const [imovelRows] = await db.execute(
      'SELECT id FROM imoveis WHERE id = ? LIMIT 1',
      [imovel_id]
    )

    if (imovelRows.length === 0) {
      return res.status(404).json({ message: 'Imóvel não encontrado.' })
    }

    // Verifica se já está no top
    const [existente] = await db.execute(
      'SELECT id FROM top_imoveis WHERE imovel_id = ?',
      [imovel_id]
    )

    if (existente.length) {
      return res.status(409).json({ message: 'Este imóvel já está no Top Anúncios.' })
    }

    // Verifica limite máximo
    const [countRows] = await db.execute('SELECT COUNT(*) AS total FROM top_imoveis')

    if (countRows[0].total >= MAX_TOP) {
      return res.status(400).json({
        message: `O Top Anúncios já possui o máximo de ${MAX_TOP} imóveis. Remova um para adicionar outro.`
      })
    }

    // Próxima posição = maior posição atual + 1
    const [maxRows] = await db.execute('SELECT COALESCE(MAX(posicao), 0) AS max_posicao FROM top_imoveis')
    const proximaPosicao = (maxRows[0].max_posicao || 0) + 1

    const id = uuidv4()

    await db.execute(
      `INSERT INTO top_imoveis (id, imovel_id, posicao, atualizado_em)
       VALUES (?, ?, ?, NOW())`,
      [id, imovel_id, proximaPosicao]
    )

    return res.status(201).json({ id, imovel_id, posicao: proximaPosicao })
  } catch (err) {
    console.error('[topImoveis:adicionar]', err)
    return res.status(500).json({ message: 'Erro ao adicionar imóvel ao Top.' })
  }
}

// ────────────────────────────────────────────────────────────
// DELETE /api/top-imoveis/:id
// Remove o vínculo (não apaga o imóvel) e reorganiza as posições.
// ────────────────────────────────────────────────────────────
async function remover(req, res) {
  const conn = await db.getConnection()

  try {
    const { id } = req.params

    const [rows] = await conn.execute('SELECT posicao FROM top_imoveis WHERE id = ?', [id])

    if (!rows.length) {
      conn.release()
      return res.status(404).json({ message: 'Registro não encontrado.' })
    }

    const posicaoRemovida = rows[0].posicao

    await conn.beginTransaction()

    await conn.execute('DELETE FROM top_imoveis WHERE id = ?', [id])

    // Decrementa a posição de todos que estavam depois do removido
    await conn.execute(
      `UPDATE top_imoveis
       SET posicao = posicao - 1, atualizado_em = NOW()
       WHERE posicao > ?`,
      [posicaoRemovida]
    )

    await conn.commit()
    conn.release()

    return res.json({ message: 'Removido do Top Anúncios com sucesso.' })
  } catch (err) {
    await conn.rollback()
    conn.release()
    console.error('[topImoveis:remover]', err)
    return res.status(500).json({ message: 'Erro ao remover imóvel do Top.' })
  }
}

// ────────────────────────────────────────────────────────────
// PUT /api/top-imoveis/reordenar
// Body: { ordem: [ { id, posicao }, ... ] }
// Atualiza a posição de cada item (drag and drop no admin).
// ────────────────────────────────────────────────────────────
async function reordenar(req, res) {
  const { ordem } = req.body

  if (!Array.isArray(ordem) || !ordem.length) {
    return res.status(400).json({ message: 'Lista de ordem inválida.' })
  }

  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    const idsValidos = ordem.filter(item => item.id && item.posicao)

    if (idsValidos.length) {
      // DELETE + INSERT dentro da transação: evita violar UNIQUE(posicao)
      // e CHECK(posicao between 1 and 4), que o InnoDB verifica linha a linha
      // mesmo dentro de um único UPDATE com CASE.

      // Busca imovel_id de cada item antes de remover
      const ids = idsValidos.map(item => item.id)
      const [rows] = await conn.query(
        `SELECT id, imovel_id FROM top_imoveis WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      )

      const imovelPorId = {}
      for (const row of rows) {
        imovelPorId[row.id] = row.imovel_id
      }

      await conn.query(
        `DELETE FROM top_imoveis WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      )

      for (const item of idsValidos) {
        const imovelId = imovelPorId[item.id]
        if (!imovelId) continue

        await conn.execute(
          `INSERT INTO top_imoveis (id, imovel_id, posicao, atualizado_em)
           VALUES (?, ?, ?, NOW())`,
          [item.id, imovelId, item.posicao]
        )
      }
    }

    await conn.commit()
    conn.release()

    return res.json({ message: 'Ordem atualizada com sucesso.' })
  } catch (err) {
    await conn.rollback()
    conn.release()
    console.error('[topImoveis:reordenar]', err)
    return res.status(500).json({ message: 'Erro ao reordenar Top Anúncios.' })
  }
}

module.exports = {
  listar,
  listarDisponiveis,
  adicionar,
  remover,
  reordenar,
}