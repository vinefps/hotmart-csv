const pool = require('../db/connection');

// Listar vendas com paginação e busca
exports.listarVendas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = 'SELECT * FROM vendas';
    let countQuery = 'SELECT COUNT(*) FROM vendas';
    let params = [];
    let paramCount = 1;

    // Filtro de busca - AGORA INCLUI origem_checkout
    if (search) {
      const whereClause = ` WHERE (nome ILIKE $${paramCount} OR email ILIKE $${paramCount} OR tipo_pagamento ILIKE $${paramCount} OR origem_checkout ILIKE $${paramCount})`;
      query += whereClause;
      countQuery += whereClause;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Ordenação e paginação
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Contar total
    const countResult = await pool.query(countQuery, search ? [`%${search}%`] : []);
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
      message: 'Erro ao listar vendas'
    });
  }
};

// Buscar venda por ID
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
      message: 'Erro ao buscar venda'
    });
  }
};

// Criar venda
exports.criarVenda = async (req, res) => {
  try {
    const { nome, email, telefone, tipo_pagamento, faturamento_liquido, origem_checkout } = req.body;

    if (!nome) {
      return res.status(400).json({
        success: false,
        message: 'Nome é obrigatório'
      });
    }

    const query = `
      INSERT INTO vendas (nome, email, telefone, tipo_pagamento, faturamento_liquido, origem_checkout)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      nome,
      email || null,
      telefone || null,
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
      message: 'Erro ao criar venda'
    });
  }
};

// Atualizar venda
exports.atualizarVenda = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, tipo_pagamento, faturamento_liquido, origem_checkout } = req.body;

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
      SET nome = $1, email = $2, telefone = $3, tipo_pagamento = $4, 
          faturamento_liquido = $5, origem_checkout = $6
      WHERE id = $7
      RETURNING *
    `;

    const result = await pool.query(query, [
      nome,
      email,
      telefone,
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
      message: 'Erro ao atualizar venda'
    });
  }
};

// Estatísticas
exports.obterEstatisticas = async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_vendas,
        COUNT(DISTINCT tipo_pagamento) as tipos_pagamento,
        SUM(faturamento_liquido) as faturamento_total,
        AVG(faturamento_liquido) as faturamento_medio,
        MAX(faturamento_liquido) as maior_venda,
        MIN(faturamento_liquido) as menor_venda
      FROM vendas
      WHERE faturamento_liquido IS NOT NULL
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas'
    });
  }
};