// ✅ VENDAS CONTROLLER COMPLETO - COM FILTRO DE STATUS
const pool = require('../db/connection');

/**
 * LISTAR TODAS AS VENDAS (com filtro de status)
 */
exports.listarVendas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || null; // novo: filtro por status

    let query = 'SELECT * FROM vendas';
    let countQuery = 'SELECT COUNT(*) FROM vendas';
    let params = [];
    let paramCount = 1;
    const whereClauses = [];

    // Filtro de busca por texto
    if (search) {
      whereClauses.push(
        `(nome ILIKE $${paramCount} OR email ILIKE $${paramCount} OR 
          tipo_pagamento ILIKE $${paramCount} OR origem_checkout ILIKE $${paramCount} OR
          produto ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    // Filtro de status
    if (status) {
      whereClauses.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    // Aplicar WHERE se houver filtros
    if (whereClauses.length > 0) {
      const whereClause = ' WHERE ' + whereClauses.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // Ordenação e paginação
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Contar total (remover limit e offset dos params)
    const countParams = params.slice(0, -2);
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar vendas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar vendas',
      error: error.message
    });
  }
};

/**
 * LISTAR SOMENTE VENDAS ATIVAS (aprovadas)
 */
exports.listarVendasAtivas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `SELECT * FROM vendas WHERE status = 'aprovado'`;
    let countQuery = `SELECT COUNT(*) FROM vendas WHERE status = 'aprovado'`;
    let params = [];

    // Filtro de busca
    if (search) {
      query += ` AND (nome ILIKE $1 OR email ILIKE $1 OR produto ILIKE $1 OR origem_checkout ILIKE $1)`;
      countQuery += ` AND (nome ILIKE $1 OR email ILIKE $1 OR produto ILIKE $1 OR origem_checkout ILIKE $1)`;
      params.push(`%${search}%`);
    }

    // Ordenação e paginação
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Contar total
    const countParams = search ? [`%${search}%`] : [];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      filtro: 'vendas_ativas',
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar vendas ativas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar vendas ativas',
      error: error.message
    });
  }
};

/**
 * LISTAR SOMENTE CANCELAMENTOS (cancelado, reembolso, chargeback)
 */
exports.listarCancelamentos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `SELECT * FROM vendas WHERE status IN ('cancelado', 'reembolso', 'chargeback')`;
    let countQuery = `SELECT COUNT(*) FROM vendas WHERE status IN ('cancelado', 'reembolso', 'chargeback')`;
    let params = [];

    // Filtro de busca
    if (search) {
      query += ` AND (nome ILIKE $1 OR email ILIKE $1 OR produto ILIKE $1 OR motivo_cancelamento ILIKE $1)`;
      countQuery += ` AND (nome ILIKE $1 OR email ILIKE $1 OR produto ILIKE $1 OR motivo_cancelamento ILIKE $1)`;
      params.push(`%${search}%`);
    }

    // Ordenação por data de cancelamento (mais recentes primeiro)
    query += ` ORDER BY data_cancelamento DESC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Contar total
    const countParams = search ? [`%${search}%`] : [];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      filtro: 'cancelamentos',
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar cancelamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar cancelamentos',
      error: error.message
    });
  }
};

/**
 * BUSCAR VENDA POR ID
 */
exports.buscarVendaPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM vendas WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Venda não encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar venda',
      error: error.message
    });
  }
};

/**
 * CRIAR VENDA MANUALMENTE
 */
exports.criarVenda = async (req, res) => {
  try {
    const { 
      nome, 
      email, 
      telefone, 
      produto, 
      tipo_pagamento, 
      faturamento_liquido, 
      origem_checkout 
    } = req.body;

    if (!nome) {
      return res.status(400).json({
        success: false,
        message: 'Nome é obrigatório'
      });
    }

    const query = `
      INSERT INTO vendas 
      (nome, email, telefone, produto, tipo_pagamento, faturamento_liquido, origem_checkout, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'aprovado')
      RETURNING *
    `;

    const result = await pool.query(query, [
      nome,
      email || null,
      telefone || null,
      produto || null,
      tipo_pagamento || null,
      faturamento_liquido || null,
      origem_checkout || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Venda criada com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar venda',
      error: error.message
    });
  }
};

/**
 * ATUALIZAR VENDA
 */
exports.atualizarVenda = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nome, 
      email, 
      telefone, 
      produto, 
      tipo_pagamento, 
      faturamento_liquido, 
      origem_checkout 
    } = req.body;

    // Verificar se existe
    const check = await pool.query('SELECT id FROM vendas WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Venda não encontrada'
      });
    }

    const query = `
      UPDATE vendas 
      SET nome = $1, 
          email = $2, 
          telefone = $3, 
          produto = $4,
          tipo_pagamento = $5, 
          faturamento_liquido = $6, 
          origem_checkout = $7
      WHERE id = $8
      RETURNING *
    `;

    const result = await pool.query(query, [
      nome,
      email,
      telefone,
      produto,
      tipo_pagamento,
      faturamento_liquido,
      origem_checkout,
      id
    ]);

    res.json({
      success: true,
      message: 'Venda atualizada com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar venda:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar venda',
      error: error.message
    });
  }
};

/**
 * DELETAR VENDA (soft delete - marca como cancelado)
 */
exports.deletarVenda = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se existe
    const check = await pool.query('SELECT id, status FROM vendas WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Venda não encontrada'
      });
    }

    // Soft delete - marcar como cancelado
    const result = await pool.query(
      `UPDATE vendas 
       SET status = 'cancelado', 
           data_cancelamento = NOW(), 
           motivo_cancelamento = 'Cancelado manualmente pelo sistema'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({
      success: true,
      message: 'Venda cancelada com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao deletar venda:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar venda',
      error: error.message
    });
  }
};

/**
 * ESTATÍSTICAS GERAIS
 */
exports.obterEstatisticas = async (req, res) => {
  try {
    // Estatísticas de vendas ativas
    const queryAtivas = `
      SELECT 
        COUNT(*) as total_vendas,
        SUM(faturamento_liquido) as faturamento_total,
        AVG(faturamento_liquido) as faturamento_medio,
        MAX(faturamento_liquido) as maior_venda,
        MIN(faturamento_liquido) as menor_venda
      FROM vendas
      WHERE status = 'aprovado' AND faturamento_liquido IS NOT NULL
    `;

    // Estatísticas de cancelamentos
    const queryCanceladas = `
      SELECT 
        COUNT(*) as total_cancelamentos,
        SUM(faturamento_liquido) as valor_cancelado,
        COUNT(CASE WHEN status = 'cancelado' THEN 1 END) as cancelamentos,
        COUNT(CASE WHEN status = 'reembolso' THEN 1 END) as reembolsos,
        COUNT(CASE WHEN status = 'chargeback' THEN 1 END) as chargebacks
      FROM vendas
      WHERE status IN ('cancelado', 'reembolso', 'chargeback') 
        AND faturamento_liquido IS NOT NULL
    `;

    // Estatísticas por produto (top 5)
    const queryProdutos = `
      SELECT 
        produto,
        COUNT(*) as vendas,
        SUM(faturamento_liquido) as faturamento
      FROM vendas
      WHERE status = 'aprovado' AND produto IS NOT NULL
      GROUP BY produto
      ORDER BY faturamento DESC
      LIMIT 5
    `;

    const [ativas, canceladas, produtos] = await Promise.all([
      pool.query(queryAtivas),
      pool.query(queryCanceladas),
      pool.query(queryProdutos)
    ]);

    res.json({
      success: true,
      data: {
        vendas_ativas: ativas.rows[0],
        cancelamentos: canceladas.rows[0],
        top_produtos: produtos.rows
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas',
      error: error.message
    });
  }
};

/**
 * ESTATÍSTICAS POR PERÍODO (últimos 30 dias)
 */
exports.obterEstatisticasPeriodo = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 30;

    const query = `
      SELECT 
        DATE(created_at) as data,
        COUNT(*) FILTER (WHERE status = 'aprovado') as vendas,
        COUNT(*) FILTER (WHERE status IN ('cancelado', 'reembolso', 'chargeback')) as cancelamentos,
        SUM(faturamento_liquido) FILTER (WHERE status = 'aprovado') as faturamento,
        SUM(faturamento_liquido) FILTER (WHERE status IN ('cancelado', 'reembolso', 'chargeback')) as valor_cancelado
      FROM vendas
      WHERE created_at >= NOW() - INTERVAL '${dias} days'
      GROUP BY DATE(created_at)
      ORDER BY data DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      periodo: `Últimos ${dias} dias`,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas por período:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas por período',
      error: error.message
    });
  }
};