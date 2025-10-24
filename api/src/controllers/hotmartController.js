// ✅ HOTMART CONTROLLER COMPLETO - VENDAS E CANCELAMENTOS
const crypto = require('crypto');
const pool = require('../db/connection');

/**
 * Valida a assinatura HMAC da Hotmart (Versão 2.0)
 */
const validarAssinaturaHotmart = (req) => {
  const secret = process.env.HOTMART_SECRET_KEY;
  
  // Em desenvolvimento, permite sem validação
  if (process.env.NODE_ENV === 'development' && !secret) {
    console.warn('⚠️ HOTMART_SECRET_KEY não configurado - modo DEV');
    return true;
  }

  // Hotmart envia a assinatura no header
  const signatureHeader = req.headers['x-hotmart-hottok'];
  
  if (!signatureHeader || !secret) {
    return false;
  }

  try {
    // Gerar hash HMAC do body
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    
    // Comparação segura
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Erro ao validar assinatura:', error);
    return false;
  }
};

/**
 * Verifica se venda já existe por transaction ID
 */
const vendaJaExiste = async (transactionId) => {
  if (!transactionId) return false;
  
  const resultado = await pool.query(
    'SELECT id FROM vendas WHERE hotmart_transaction_id = $1 LIMIT 1',
    [transactionId]
  );
  
  return resultado.rows.length > 0;
};

/**
 * Busca venda existente para atualizar status
 */
const buscarVendaPorTransaction = async (transactionId) => {
  if (!transactionId) return null;
  
  const resultado = await pool.query(
    'SELECT * FROM vendas WHERE hotmart_transaction_id = $1 LIMIT 1',
    [transactionId]
  );
  
  return resultado.rows.length > 0 ? resultado.rows[0] : null;
};

/**
 * Extrai dados do comprador do payload Hotmart v2.0
 */
const extrairDadosComprador = (data) => {
  return {
    nome: data.buyer?.name || 'Não informado',
    email: data.buyer?.email || null,
    telefone: data.buyer?.phone_number || 
              data.buyer?.phone || null
  };
};

/**
 * Extrai dados do produto
 */
const extrairDadosProduto = (data) => {
  return {
    produto: data.product?.name || 
            data.purchase?.offer?.name || 
            data.product?.ucode ||
            'Produto Hotmart',
    origem: data.product?.name || 
           data.purchase?.offer?.name || 
           'Hotmart'
  };
};

/**
 * Extrai dados de pagamento
 */
const extrairDadosPagamento = (data) => {
  const tipoPagamento = data.purchase?.payment?.type || 
                       data.purchase?.payment_type || 
                       'Não informado';
  
  const faturamento = parseFloat(
    data.purchase?.price?.value || 
    data.purchase?.commissioned_amount ||
    data.purchase?.price ||
    0
  );

  return {
    tipo_pagamento: tipoPagamento,
    faturamento_liquido: faturamento
  };
};

/**
 * PROCESSAR VENDA APROVADA
 */
const processarVendaAprovada = async (data) => {
  const transactionId = data.purchase?.transaction || null;
  
  console.log('💰 Processando VENDA APROVADA');
  console.log('   Transaction ID:', transactionId);

  // Verificar duplicata
  if (transactionId && await vendaJaExiste(transactionId)) {
    console.log('⚠️ Venda duplicada - ignorando');
    return { 
      success: true, 
      message: 'Venda já processada',
      duplicated: true 
    };
  }

  // Extrair dados
  const comprador = extrairDadosComprador(data);
  const produto = extrairDadosProduto(data);
  const pagamento = extrairDadosPagamento(data);

  console.log('📊 Dados extraídos:');
  console.log('   Nome:', comprador.nome);
  console.log('   Email:', comprador.email);
  console.log('   Produto:', produto.produto);
  console.log('   Valor: R$', pagamento.faturamento_liquido.toFixed(2));

  // Inserir no banco
  const resultado = await pool.query(
    `INSERT INTO vendas 
     (nome, email, telefone, produto, tipo_pagamento, faturamento_liquido, 
      origem_checkout, status, hotmart_transaction_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      comprador.nome,
      comprador.email,
      comprador.telefone,
      produto.produto,
      pagamento.tipo_pagamento,
      pagamento.faturamento_liquido,
      produto.origem,
      'aprovado',
      transactionId
    ]
  );

  console.log(`✅ Venda inserida - ID: ${resultado.rows[0].id}`);

  return {
    success: true,
    message: 'Venda processada com sucesso',
    venda_id: resultado.rows[0].id
  };
};

/**
 * PROCESSAR CANCELAMENTO/REEMBOLSO/CHARGEBACK
 */
const processarCancelamento = async (data, tipoEvento) => {
  const transactionId = data.purchase?.transaction || null;
  
  console.log(`🚫 Processando ${tipoEvento.toUpperCase()}`);
  console.log('   Transaction ID:', transactionId);

  if (!transactionId) {
    console.log('⚠️ Transaction ID não encontrado - ignorando');
    return {
      success: true,
      message: 'Transaction ID não encontrado'
    };
  }

  // Buscar venda existente
  const vendaExistente = await buscarVendaPorTransaction(transactionId);

  if (!vendaExistente) {
    console.log('⚠️ Venda não encontrada para cancelar - criando registro de cancelamento');
    
    // Criar registro de cancelamento mesmo sem venda prévia
    const comprador = extrairDadosComprador(data);
    const produto = extrairDadosProduto(data);
    const pagamento = extrairDadosPagamento(data);

    // Mapear tipo de status
    let status = 'cancelado';
    if (tipoEvento.includes('REFUND')) status = 'reembolso';
    if (tipoEvento.includes('CHARGEBACK')) status = 'chargeback';

    const resultado = await pool.query(
      `INSERT INTO vendas 
       (nome, email, telefone, produto, tipo_pagamento, faturamento_liquido, 
        origem_checkout, status, data_cancelamento, motivo_cancelamento, 
        hotmart_transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
       RETURNING id`,
      [
        comprador.nome,
        comprador.email,
        comprador.telefone,
        produto.produto,
        pagamento.tipo_pagamento,
        pagamento.faturamento_liquido,
        produto.origem,
        status,
        `${tipoEvento} - Sem venda prévia no sistema`,
        transactionId
      ]
    );

    console.log(`✅ Cancelamento registrado - ID: ${resultado.rows[0].id}`);

    return {
      success: true,
      message: 'Cancelamento registrado',
      venda_id: resultado.rows[0].id,
      novo_registro: true
    };
  }

  // Atualizar venda existente para cancelada
  let status = 'cancelado';
  let motivo = 'Cancelamento via Hotmart';

  if (tipoEvento.includes('REFUND')) {
    status = 'reembolso';
    motivo = 'Reembolso solicitado via Hotmart';
  } else if (tipoEvento.includes('CHARGEBACK')) {
    status = 'chargeback';
    motivo = 'Chargeback processado pela operadora';
  }

  // Adicionar motivo do webhook se disponível
  if (data.purchase?.refund_reason) {
    motivo += ` - Motivo: ${data.purchase.refund_reason}`;
  }

  const resultado = await pool.query(
    `UPDATE vendas 
     SET status = $1, 
         data_cancelamento = NOW(), 
         motivo_cancelamento = $2
     WHERE id = $3
     RETURNING id, status`,
    [status, motivo, vendaExistente.id]
  );

  console.log(`✅ Venda atualizada - ID: ${resultado.rows[0].id} - Novo status: ${status}`);

  return {
    success: true,
    message: `Venda marcada como ${status}`,
    venda_id: resultado.rows[0].id,
    status_anterior: vendaExistente.status,
    status_novo: status
  };
};

/**
 * ENDPOINT PRINCIPAL DO WEBHOOK
 */
exports.receberWebhook = async (req, res) => {
  try {
    console.log('\n🔔 ========================================');
    console.log('🔔 WEBHOOK RECEBIDO DA HOTMART (v2.0)');
    console.log('🔔 ========================================');
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR'));
    console.log('🔑 Headers:', JSON.stringify(req.headers, null, 2));

    // 1. Validar assinatura HMAC
    if (!validarAssinaturaHotmart(req)) {
      console.error('❌ ASSINATURA HMAC INVÁLIDA');
      return res.status(401).json({ 
        success: false,
        error: 'Assinatura inválida' 
      });
    }

    console.log('✅ Assinatura HMAC validada com sucesso');

    const { event, data } = req.body;
    console.log('📦 Tipo de Evento:', event);
    console.log('📦 Payload:', JSON.stringify(data, null, 2));

    let resultado;

    // 2. Processar evento baseado no tipo
    switch (event) {
      // VENDAS APROVADAS
      case 'PURCHASE_COMPLETE':
      case 'PURCHASE_APPROVED':
      case 'PURCHASE_BILLET_PRINTED':
        resultado = await processarVendaAprovada(data);
        break;

      // CANCELAMENTOS
      case 'PURCHASE_CANCELED':
      case 'PURCHASE_CANCELLED':
        resultado = await processarCancelamento(data, 'CANCELAMENTO');
        break;

      // REEMBOLSOS
      case 'PURCHASE_REFUNDED':
      case 'PURCHASE_REFUND':
        resultado = await processarCancelamento(data, 'REEMBOLSO');
        break;

      // CHARGEBACKS
      case 'PURCHASE_CHARGEBACK':
        resultado = await processarCancelamento(data, 'CHARGEBACK');
        break;

      // PROTESTOS (tratado como cancelamento)
      case 'PURCHASE_PROTEST':
        resultado = await processarCancelamento(data, 'PROTESTO');
        break;

      // Outros eventos não processados
      default:
        console.log(`ℹ️ Evento ${event} recebido mas não processado`);
        resultado = { 
          success: true, 
          message: `Evento ${event} recebido mas não requer processamento` 
        };
    }

    console.log('✅ Processamento concluído:', resultado);
    console.log('🔔 ========================================\n');

    // 3. Responder 200 OK para Hotmart
    res.json(resultado);

  } catch (error) {
    console.error('❌ ERRO AO PROCESSAR WEBHOOK:', error);
    console.error('Stack:', error.stack);
    console.log('🔔 ========================================\n');
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * ENDPOINT DE TESTE (opcional - para testar sem Hotmart)
 */
exports.testarWebhook = async (req, res) => {
  console.log('🧪 Teste de webhook iniciado');
  
  // Exemplo de payload de venda
  const payloadVendaTeste = {
    event: 'PURCHASE_COMPLETE',
    data: {
      buyer: {
        name: 'Cliente Teste',
        email: 'teste@exemplo.com',
        phone: '11999999999'
      },
      product: {
        name: 'Produto de Teste',
        ucode: 'prod-teste-123'
      },
      purchase: {
        transaction: `TEST-${Date.now()}`,
        payment: {
          type: 'credit_card'
        },
        price: {
          value: 97.00
        }
      }
    }
  };

  try {
    req.body = payloadVendaTeste;
    await exports.receberWebhook(req, res);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};