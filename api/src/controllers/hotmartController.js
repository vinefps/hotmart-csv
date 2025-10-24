// ✅ HOTMART CONTROLLER - VERSÃO ULTRA DEBUG
// Esta versão loga TUDO em detalhes para descobrir o problema

const crypto = require('crypto');
const pool = require('../db/connection');

/**
 * Salva os dados do webhook em arquivo para análise
 */
const salvarWebhookParaAnalise = (req) => {
  const fs = require('fs');
  const path = require('path');
  
  const dados = {
    timestamp: new Date().toISOString(),
    headers: req.headers,
    body_type: typeof req.body,
    body_is_buffer: Buffer.isBuffer(req.body),
    body_raw: req.body,
    body_string: req.body ? req.body.toString('utf8') : null,
    body_parsed: null
  };
  
  try {
    if (Buffer.isBuffer(req.body)) {
      dados.body_parsed = JSON.parse(req.body.toString('utf8'));
    } else if (typeof req.body === 'object') {
      dados.body_parsed = req.body;
    }
  } catch (e) {
    dados.parse_error = e.message;
  }
  
  const filename = `/tmp/webhook-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(dados, null, 2));
  console.log(`📁 Webhook salvo em: ${filename}`);
  
  return dados;
};

/**
 * Testa TODAS as formas possíveis de calcular HMAC
 */
const testarTodasFormasHMAC = (secret, req) => {
  console.log('\n🧪 ========================================');
  console.log('🧪 TESTANDO TODAS AS FORMAS DE CALCULAR HMAC');
  console.log('🧪 ========================================\n');
  
  const results = [];
  
  // Forma 1: Body como Buffer
  if (Buffer.isBuffer(req.body)) {
    const hmac1 = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    results.push({
      metodo: 'Buffer direto',
      hmac: hmac1,
      tamanho: req.body.length
    });
    console.log('1️⃣ Buffer direto:', hmac1);
  }
  
  // Forma 2: Body como String UTF8
  try {
    const bodyString = Buffer.isBuffer(req.body) 
      ? req.body.toString('utf8')
      : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    
    const hmac2 = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
    results.push({
      metodo: 'String UTF8',
      hmac: hmac2,
      tamanho: bodyString.length
    });
    console.log('2️⃣ String UTF8:', hmac2);
    
    // Forma 3: String sem espaços
    const bodyNoSpaces = bodyString.replace(/\s/g, '');
    const hmac3 = crypto.createHmac('sha256', secret).update(bodyNoSpaces).digest('hex');
    results.push({
      metodo: 'String sem espaços',
      hmac: hmac3,
      tamanho: bodyNoSpaces.length
    });
    console.log('3️⃣ String sem espaços:', hmac3);
    
    // Forma 4: JSON.stringify do objeto parseado
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      const bodyStringified = JSON.stringify(req.body);
      const hmac4 = crypto.createHmac('sha256', secret).update(bodyStringified).digest('hex');
      results.push({
        metodo: 'JSON.stringify',
        hmac: hmac4,
        tamanho: bodyStringified.length
      });
      console.log('4️⃣ JSON.stringify:', hmac4);
    }
    
    // Forma 5: Base64
    const hmac5 = crypto.createHmac('sha256', secret).update(bodyString).digest('base64');
    results.push({
      metodo: 'Base64',
      hmac: hmac5,
      tamanho: bodyString.length
    });
    console.log('5️⃣ Base64:', hmac5);
    
    // Forma 6: Latin1
    const hmac6 = crypto.createHmac('sha256', secret).update(bodyString, 'latin1').digest('hex');
    results.push({
      metodo: 'Latin1',
      hmac: hmac6,
      tamanho: bodyString.length
    });
    console.log('6️⃣ Latin1:', hmac6);
    
  } catch (e) {
    console.error('❌ Erro ao testar variações:', e.message);
  }
  
  console.log('\n🧪 ========================================\n');
  return results;
};

/**
 * Valida a assinatura HMAC da Hotmart - VERSÃO ULTRA DEBUG
 */
const validarAssinaturaHotmart = (req) => {
  const secret = process.env.HOTMART_SECRET_KEY;

  console.log('\n🔐 ===== ULTRA DEBUG - VALIDAÇÃO HMAC =====');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🔑 SECRET configurado:', secret ? 'SIM' : 'NÃO');
  
  if (secret) {
    console.log('🔑 SECRET length:', secret.length);
    console.log('🔑 SECRET (primeiros 20 chars):', secret.substring(0, 20) + '...');
    console.log('🔑 SECRET (últimos 10 chars):', '...' + secret.substring(secret.length - 10));
    console.log('🔑 SECRET em hex:', Buffer.from(secret).toString('hex').substring(0, 40) + '...');
  }
  
  // Salvar webhook para análise
  const dadosSalvos = salvarWebhookParaAnalise(req);
  
  console.log('\n📋 HEADERS COMPLETOS:');
  Object.keys(req.headers).forEach(key => {
    console.log(`   ${key}: ${req.headers[key]}`);
  });
  
  const signatureHeader = req.headers['x-hotmart-hottok'];
  
  console.log('\n🔐 SIGNATURE DO HEADER:');
  console.log('   Nome do header: x-hotmart-hottok');
  console.log('   Valor recebido:', signatureHeader || 'NÃO ENCONTRADO');
  if (signatureHeader) {
    console.log('   Length:', signatureHeader.length);
    console.log('   Tipo:', typeof signatureHeader);
    console.log('   Em hex:', Buffer.from(signatureHeader).toString('hex').substring(0, 40) + '...');
  }
  
  console.log('\n📦 BODY RECEBIDO:');
  console.log('   Tipo:', typeof req.body);
  console.log('   É Buffer?', Buffer.isBuffer(req.body));
  console.log('   É String?', typeof req.body === 'string');
  console.log('   É Object?', typeof req.body === 'object' && !Buffer.isBuffer(req.body));
  
  if (req.body) {
    console.log('   Length/Size:', req.body.length || JSON.stringify(req.body).length);
    
    try {
      const bodyString = Buffer.isBuffer(req.body) 
        ? req.body.toString('utf8')
        : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      
      console.log('   Primeiros 200 chars:', bodyString.substring(0, 200) + '...');
      console.log('   Últimos 100 chars:', '...' + bodyString.substring(Math.max(0, bodyString.length - 100)));
      console.log('   Body completo (formatado):');
      console.log(bodyString);
    } catch (e) {
      console.error('   Erro ao converter body:', e.message);
    }
  }
  
  if (!signatureHeader) {
    console.error('\n❌ Header x-hotmart-hottok NÃO ENCONTRADO');
    console.log('⚠️ MODO DEBUG: Aceitando webhook mesmo sem header');
    return true;
  }
  
  if (!secret) {
    console.error('\n❌ HOTMART_SECRET_KEY não configurado');
    console.log('⚠️ MODO DEBUG: Aceitando webhook mesmo sem secret');
    return true;
  }
  
  // Testar TODAS as formas de calcular HMAC
  const todasFormas = testarTodasFormasHMAC(secret, req);
  
  console.log('\n🔍 COMPARAÇÃO DE RESULTADOS:');
  console.log('   Signature recebida:', signatureHeader);
  
  todasFormas.forEach((result, index) => {
    const match = result.hmac === signatureHeader;
    const emoji = match ? '✅' : '❌';
    console.log(`   ${emoji} ${index + 1}. ${result.metodo}: ${result.hmac.substring(0, 20)}... (${match ? 'MATCH!' : 'no match'})`);
  });
  
  // Verificar se alguma forma deu match
  const algumMatch = todasFormas.some(r => r.hmac === signatureHeader);
  
  if (algumMatch) {
    console.log('\n✅✅✅ ENCONTRAMOS UM MATCH! ✅✅✅');
    const metodoCorreto = todasFormas.find(r => r.hmac === signatureHeader);
    console.log('   Método correto:', metodoCorreto.metodo);
  } else {
    console.log('\n❌❌❌ NENHUM MÉTODO DEU MATCH ❌❌❌');
    console.log('   Isso pode significar:');
    console.log('   1. O SECRET está incorreto');
    console.log('   2. A Hotmart usa um método diferente');
    console.log('   3. Há alguma transformação no body que não testamos');
  }
  
  console.log('\n🔐 ===== FIM ULTRA DEBUG =====\n');
  
  // ⚠️ MODO DEBUG: Sempre retorna true
  console.log('⚠️ MODO DEBUG: Aceitando webhook independente do resultado');
  return true;
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

    const comprador = extrairDadosComprador(data);
    const produto = extrairDadosProduto(data);
    const pagamento = extrairDadosPagamento(data);

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

  let status = 'cancelado';
  let motivo = 'Cancelamento via Hotmart';

  if (tipoEvento.includes('REFUND')) {
    status = 'reembolso';
    motivo = 'Reembolso solicitado via Hotmart';
  } else if (tipoEvento.includes('CHARGEBACK')) {
    status = 'chargeback';
    motivo = 'Chargeback processado pela operadora';
  }

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
    console.log('🔔 WEBHOOK RECEBIDO - ULTRA DEBUG MODE');
    console.log('🔔 ========================================');

    // Validar assinatura (modo ultra debug)
    validarAssinaturaHotmart(req);

    // Parsear o body
    let bodyParsed;
    
    if (Buffer.isBuffer(req.body)) {
      bodyParsed = JSON.parse(req.body.toString('utf8'));
    } else if (typeof req.body === 'string') {
      bodyParsed = JSON.parse(req.body);
    } else if (typeof req.body === 'object') {
      bodyParsed = req.body;
    } else {
      throw new Error(`Formato de body inesperado: ${typeof req.body}`);
    }

    const { event, data } = bodyParsed;
    console.log('\n📦 Evento:', event);

    let resultado;

    switch (event) {
      case 'PURCHASE_COMPLETE':
      case 'PURCHASE_APPROVED':
      case 'PURCHASE_BILLET_PRINTED':
        resultado = await processarVendaAprovada(data);
        break;

      case 'PURCHASE_CANCELED':
      case 'PURCHASE_CANCELLED':
        resultado = await processarCancelamento(data, 'CANCELAMENTO');
        break;

      case 'PURCHASE_REFUNDED':
      case 'PURCHASE_REFUND':
        resultado = await processarCancelamento(data, 'REEMBOLSO');
        break;

      case 'PURCHASE_CHARGEBACK':
        resultado = await processarCancelamento(data, 'CHARGEBACK');
        break;

      case 'PURCHASE_PROTEST':
        resultado = await processarCancelamento(data, 'PROTESTO');
        break;

      default:
        console.log(`ℹ️ Evento ${event} não processado`);
        resultado = {
          success: true,
          message: `Evento ${event} recebido`
        };
    }

    console.log('\n✅ Processamento concluído');
    console.log('🔔 ========================================\n');

    res.json(resultado);

  } catch (error) {
    console.error('❌ ERRO:', error);
    console.error('Stack:', error.stack);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

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
    req.body = payloadVendaTeste;
    await exports.receberWebhook(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};