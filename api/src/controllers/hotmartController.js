// ✅ HOTMART CONTROLLER - VERSÃO DEBUG
// Esta versão loga TUDO e aceita webhooks mesmo com assinatura inválida
// Use APENAS para descobrir qual é o problema!

const crypto = require('crypto');
const pool = require('../db/connection');

/**
 * Valida a assinatura HMAC da Hotmart com LOGS DETALHADOS
 */
const validarAssinaturaHotmart = (req) => {
  const secret = process.env.HOTMART_SECRET_KEY;

  console.log('\n🔐 ===== DEBUG DE VALIDAÇÃO HMAC =====');
  console.log('📋 SECRET configurado:', secret ? `SIM (${secret.length} caracteres)` : 'NÃO');
  console.log('📋 SECRET (primeiros 10 chars):', secret ? secret.substring(0, 10) + '...' : 'N/A');

  // Detectar secret de exemplo/placeholder
  const isPlaceholder = !secret ||
    secret.includes('abc123') ||
    secret.includes('...') ||
    secret === 'seu_secret_aqui';

  if (isPlaceholder) {
    console.log('⚠️ Secret parece ser placeholder ou está vazio');
  }

  // Hotmart envia a assinatura no header
  const signatureHeader = req.headers['x-hotmart-hottok'];

  console.log('📋 Headers recebidos:');
  Object.keys(req.headers).forEach(key => {
    if (key.toLowerCase().includes('hotmart') || key.toLowerCase().includes('hottok')) {
      console.log(`   ${key}: ${req.headers[key]}`);
    }
  });

  if (!signatureHeader) {
    console.error('❌ Header x-hotmart-hottok NÃO ENCONTRADO');
    console.log('📋 Todos os headers:', JSON.stringify(req.headers, null, 2));

    // ⚠️ TEMPORÁRIO: Aceitar mesmo sem header
    console.log('⚠️ MODO DEBUG: Aceitando webhook mesmo sem header (INSEGURO!)');
    return true;
  }

  console.log('✅ Header x-hotmart-hottok encontrado:', signatureHeader);
  console.log('   Tamanho:', signatureHeader.length, 'caracteres');

  if (!secret || isPlaceholder) {
    console.error('❌ HOTMART_SECRET_KEY não configurado corretamente no .env');

    // ⚠️ TEMPORÁRIO: Aceitar mesmo sem secret
    console.log('⚠️ MODO DEBUG: Aceitando webhook mesmo sem secret (INSEGURO!)');
    return true;
  }

  try {
    // CRÍTICO: Usar o body RAW (Buffer) para calcular o HMAC
    const rawBody = req.body;

    console.log('📋 Body recebido:');
    console.log('   Tipo:', typeof rawBody);
    console.log('   É Buffer?', Buffer.isBuffer(rawBody));
    console.log('   Tamanho:', rawBody ? rawBody.length : 0, 'bytes');

    // Tentar parsear para ver o conteúdo
    try {
      const bodyParsed = JSON.parse(rawBody.toString('utf8'));
      console.log('   Conteúdo (parseado):', JSON.stringify(bodyParsed, null, 2));
    } catch (e) {
      console.log('   Não foi possível parsear o body');
    }

    // Calcular HMAC com SHA256
    console.log('\n🔐 Calculando HMAC SHA256...');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    console.log('✅ HMAC calculado com sucesso');
    console.log('   Signature RECEBIDA:', signatureHeader);
    console.log('   Signature ESPERADA:', expectedSignature);
    console.log('   São iguais?', signatureHeader === expectedSignature);

    // Tentar com diferentes encodings
    console.log('\n🧪 Testando variações...');

    // Teste 1: Base64
    const expectedBase64 = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');
    console.log('   HMAC Base64:', expectedBase64);
    console.log('   Igual ao recebido?', signatureHeader === expectedBase64);

    // Teste 2: String direta
    const bodyString = rawBody.toString('utf8');
    const expectedFromString = crypto
      .createHmac('sha256', secret)
      .update(bodyString)
      .digest('hex');
    console.log('   HMAC de String:', expectedFromString);
    console.log('   Igual ao recebido?', signatureHeader === expectedFromString);

    // Comparação segura
    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(signatureHeader),
        Buffer.from(expectedSignature)
      );
    } catch (e) {
      console.log('⚠️ Erro no timingSafeEqual (tamanhos diferentes?)');
      isValid = signatureHeader === expectedSignature;
    }

    if (isValid) {
      console.log('✅✅✅ Assinatura VÁLIDA! ✅✅✅');
    } else {
      console.error('❌❌❌ Assinatura INVÁLIDA! ❌❌❌');
      console.error('   Secret configurado pode estar incorreto');
      console.error('   Ou a Hotmart mudou a forma de calcular o HMAC');

      // ⚠️ TEMPORÁRIO: Aceitar mesmo com assinatura inválida
      console.log('⚠️ MODO DEBUG: Aceitando webhook mesmo com assinatura inválida (INSEGURO!)');
      return true;
    }

    console.log('🔐 ===== FIM DEBUG =====\n');
    return isValid;

  } catch (error) {
    console.error('❌ Erro ao validar assinatura:', error.message);
    console.error('   Stack:', error.stack);

    // ⚠️ TEMPORÁRIO: Aceitar mesmo com erro
    console.log('⚠️ MODO DEBUG: Aceitando webhook mesmo com erro (INSEGURO!)');
    return true;
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
    console.log('🔔 ⚠️⚠️⚠️ MODO DEBUG ATIVO ⚠️⚠️⚠️');
    console.log('🔔 ========================================');
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR'));

    // 1. Validar assinatura HMAC (modo debug - aceita mesmo se inválida)
    const assinaturaValida = validarAssinaturaHotmart(req);

    if (!assinaturaValida) {
      console.warn('⚠️ Assinatura inválida, mas MODO DEBUG está aceitando');
    }

    // 2. Parsear o body
    const bodyParsed = JSON.parse(req.body.toString('utf8'));
    const { event, data } = bodyParsed;
    console.log('📦 Tipo de Evento:', event);
    console.log('📦 Payload completo:', JSON.stringify(data, null, 2));

    let resultado;

    // 3. Processar evento baseado no tipo
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

      // PROTESTOS
      case 'PURCHASE_PROTEST':
        resultado = await processarCancelamento(data, 'PROTESTO');
        break;

      // Outros eventos
      default:
        console.log(`ℹ️ Evento ${event} recebido mas não processado`);
        resultado = {
          success: true,
          message: `Evento ${event} recebido mas não requer processamento`
        };
    }

    console.log('✅ Processamento concluído:', resultado);
    console.log('🔔 ========================================\n');

    // 4. Responder 200 OK
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
 * ENDPOINT DE TESTE
 */
exports.testarWebhook = async (req, res) => {
  console.log('🧪 Teste de webhook iniciado');

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
    req.body = Buffer.from(JSON.stringify(payloadVendaTeste));
    await exports.receberWebhook(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};