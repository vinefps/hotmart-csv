// api/src/controllers/hotmartController.js (VERSÃO CORRIGIDA)
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
  const signatureHeader = req.headers['x-hotmart-signature'];
  
  if (!signatureHeader || !secret) {
    return false;
  }

  try {
    // A assinatura vem no formato: sha256=abc123...
    const signature = signatureHeader.replace('sha256=', '');
    
    // Gerar hash HMAC do body
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    
    // Comparação segura contra timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Erro ao validar assinatura:', error);
    return false;
  }
};

/**
 * Verifica duplicata
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
 * Recebe e processa webhook da Hotmart
 */
exports.receberWebhook = async (req, res) => {
  try {
    console.log('🔔 Webhook recebido da Hotmart (v2.0)');
    console.log('Headers:', req.headers);

    // 1. Validar assinatura HMAC
    if (!validarAssinaturaHotmart(req)) {
      console.error('❌ Assinatura HMAC inválida');
      return res.status(401).json({ 
        success: false,
        error: 'Assinatura inválida' 
      });
    }

    console.log('✅ Assinatura validada com sucesso');

    const { event, data } = req.body;
    console.log('📦 Evento:', event);

    // 2. Processar apenas compras aprovadas
    if (event === 'PURCHASE_COMPLETE' || event === 'PURCHASE_APPROVED') {
      
      // Extrair dados (estrutura v2.0)
      const transactionId = data.purchase?.transaction || null;
      const nome = data.buyer?.name || 'Não informado';
      const email = data.buyer?.email || null;
      const telefone = data.buyer?.phone_number || 
                      data.buyer?.phone || null;
      
      // Tipo de pagamento
      const tipoPagamento = data.purchase?.payment?.type || 'Não informado';
      
      // Faturamento (cuidado com a estrutura)
      const faturamento = parseFloat(
        data.purchase?.price?.value || 
        data.purchase?.amount || 
        0
      );
      
      // Origem
      const origem = data.product?.name || 
                    data.purchase?.offer?.name || 
                    'Hotmart';

      console.log('📊 Dados extraídos:');
      console.log(`  Transaction ID: ${transactionId}`);
      console.log(`  Nome: ${nome}`);
      console.log(`  Email: ${email}`);
      console.log(`  Valor: R$ ${faturamento.toFixed(2)}`);

      // 3. Verificar duplicata por transaction ID
      if (transactionId && await vendaJaExiste(transactionId)) {
        console.log('⚠️ Transação duplicada - ignorando');
        return res.json({ 
          success: true, 
          message: 'Transação já processada',
          duplicated: true 
        });
      }

      // 4. Inserir no banco
      const resultado = await pool.query(
        `INSERT INTO vendas 
         (nome, email, telefone, tipo_pagamento, faturamento_liquido, 
          origem_checkout, hotmart_transaction_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [nome, email, telefone, tipoPagamento, faturamento, origem, transactionId]
      );

      console.log(`✅ Venda inserida - ID: ${resultado.rows[0].id}`);

      // 5. Responder 200 OK para Hotmart
      res.json({ 
        success: true, 
        message: 'Webhook processado',
        venda_id: resultado.rows[0].id 
      });

    } else {
      // Outros eventos
      console.log(`ℹ️ Evento ${event} recebido mas não processado`);
      res.json({ 
        success: true, 
        message: `Evento ${event} recebido` 
      });
    }

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};