// controllers/hotmartController.js
const crypto = require('crypto');
const pool = require('../db/connection');

// ===== RECEBER WEBHOOK DA HOTMART =====
exports.receberWebhook = async (req, res) => {
  try {
    console.log('📥 Webhook Hotmart recebido');
    console.log('Headers:', req.headers);
    
    // ===== VALIDAÇÃO DO TOKEN HOTMART =====
    const HOTMART_TOKEN = process.env.HOTMART_HOTTOK || 'kex2V0p505haOEPI97QyFTW0RAfG3w4bb85820-3865-4edd-ac24-49c2a5c34096';
    
    // O Hotmart envia o token no header 'x-hotmart-hottok'
    const tokenRecebido = req.headers['x-hotmart-hottok'];
    
    console.log('Token recebido:', tokenRecebido);
    console.log('Token esperado:', HOTMART_TOKEN);
    
    // Validar o token
    if (!tokenRecebido || tokenRecebido !== HOTMART_TOKEN) {
      console.log('❌ Token inválido - Acesso negado');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Token inválido' 
      });
    }
    
    console.log('✅ Token válido - Processando webhook');
    
    // ===== PROCESSAR O BODY =====
    let body;
    
    // Se o body veio como Buffer (por causa do express.raw())
    if (Buffer.isBuffer(req.body)) {
      const rawBody = req.body.toString('utf8');
      console.log('Body raw:', rawBody);
      body = JSON.parse(rawBody);
    } else {
      // Se o body já está parseado
      body = req.body;
    }
    
    console.log('Dados do webhook:', JSON.stringify(body, null, 2));
    
    // ===== EXTRAIR INFORMAÇÕES DO EVENTO =====
    const { event, data } = body;
    
    console.log('Evento:', event);
    console.log('Dados:', data);
    
    // ===== PROCESSAR BASEADO NO TIPO DE EVENTO =====
    switch (event) {
      case 'PURCHASE_COMPLETE':
        console.log('✅ Compra completa');
        await processarCompraCompleta(data);
        break;
        
      case 'PURCHASE_CANCELED':
        console.log('❌ Compra cancelada');
        await processarCompraCancelada(data);
        break;
        
      case 'PURCHASE_REFUNDED':
        console.log('💸 Compra reembolsada');
        await processarReembolso(data);
        break;
        
      case 'PURCHASE_CHARGEBACK':
        console.log('⚠️ Chargeback');
        await processarChargeback(data);
        break;
        
      default:
        console.log('⚠️ Evento não tratado:', event);
    }
    
    // ===== RETORNAR SUCESSO =====
    // IMPORTANTE: Sempre retornar 200 para o Hotmart não reenviar
    return res.status(200).json({ 
      success: true,
      message: 'Webhook processado com sucesso',
      event: event
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    
    // Mesmo com erro, retornar 200 para evitar reenvio
    return res.status(200).json({ 
      success: false,
      message: 'Erro ao processar, mas recebido',
      error: error.message
    });
  }
};

// ===== FUNÇÕES DE PROCESSAMENTO =====

async function processarCompraCompleta(data) {
  try {
    console.log('Processando compra completa...');
    
    // Extrair informações importantes
    const compra = {
      transacao: data.purchase?.transaction,
      produtoId: data.product?.id,
      produtoNome: data.product?.name,
      compradorEmail: data.buyer?.email,
      compradorNome: data.buyer?.name,
      valor: data.purchase?.price,
      status: data.purchase?.status,
      dataCompra: data.purchase?.approved_date || new Date().toISOString()
    };
    
    console.log('Dados da compra:', compra);
    
    // ✅ SALVAR NO BANCO DE DADOS
    try {
      // Verificar se a transação já existe
      const existe = await pool.query(
        'SELECT id FROM vendas WHERE hotmart_transaction_id = $1',
        [compra.transacao]
      );
      
      if (existe.rows.length > 0) {
        console.log('⚠️ Transação já existe no banco:', compra.transacao);
        return { ...compra, duplicada: true };
      }
      
      // Inserir nova venda
      const resultado = await pool.query(
        `INSERT INTO vendas 
         (nome, email, produto, faturamento_liquido, status, hotmart_transaction_id, 
          tipo_pagamento, origem_checkout)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          compra.compradorNome || 'Cliente Hotmart',
          compra.compradorEmail,
          compra.produtoNome || 'Produto Hotmart',
          compra.valor || 0,
          'aprovado',
          compra.transacao,
          data.purchase?.payment?.type || 'Hotmart',
          'Webhook Hotmart'
        ]
      );
      
      console.log('✅ Venda salva no banco - ID:', resultado.rows[0].id);
      
      // TODO: Enviar email de confirmação
      // await enviarEmailConfirmacao(compra);
      
      // TODO: Adicionar o comprador no ActiveCampaign
      // await adicionarNoActiveCampaign(compra);
      
      return { ...compra, id: resultado.rows[0].id, salvo: true };
      
    } catch (dbError) {
      console.error('❌ Erro ao salvar no banco:', dbError);
      throw dbError;
    }
    
  } catch (error) {
    console.error('Erro ao processar compra:', error);
    throw error;
  }
}

async function processarCompraCancelada(data) {
  console.log('Processando cancelamento...');
  
  try {
    const transacao = data.purchase?.transaction;
    
    if (!transacao) {
      console.log('⚠️ Transação não encontrada no webhook de cancelamento');
      return;
    }
    
    // Atualizar status da venda
    const resultado = await pool.query(
      `UPDATE vendas 
       SET status = 'cancelado', 
           data_cancelamento = CURRENT_TIMESTAMP,
           motivo_cancelamento = $1
       WHERE hotmart_transaction_id = $2
       RETURNING *`,
      [data.purchase?.cancellation_reason || 'Cancelado via webhook', transacao]
    );
    
    if (resultado.rows.length > 0) {
      console.log('✅ Venda cancelada - ID:', resultado.rows[0].id);
    } else {
      console.log('⚠️ Venda não encontrada para cancelamento:', transacao);
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar cancelamento:', error);
    throw error;
  }
}

async function processarReembolso(data) {
  console.log('Processando reembolso...');
  
  try {
    const transacao = data.purchase?.transaction;
    
    if (!transacao) {
      console.log('⚠️ Transação não encontrada no webhook de reembolso');
      return;
    }
    
    // Atualizar status da venda
    const resultado = await pool.query(
      `UPDATE vendas 
       SET status = 'reembolso', 
           data_cancelamento = CURRENT_TIMESTAMP,
           motivo_cancelamento = $1
       WHERE hotmart_transaction_id = $2
       RETURNING *`,
      [data.purchase?.refund_reason || 'Reembolso solicitado via webhook', transacao]
    );
    
    if (resultado.rows.length > 0) {
      console.log('✅ Reembolso processado - ID:', resultado.rows[0].id);
    } else {
      console.log('⚠️ Venda não encontrada para reembolso:', transacao);
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar reembolso:', error);
    throw error;
  }
}

async function processarChargeback(data) {
  console.log('Processando chargeback...');
  
  try {
    const transacao = data.purchase?.transaction;
    
    if (!transacao) {
      console.log('⚠️ Transação não encontrada no webhook de chargeback');
      return;
    }
    
    // Atualizar status da venda
    const resultado = await pool.query(
      `UPDATE vendas 
       SET status = 'chargeback', 
           data_cancelamento = CURRENT_TIMESTAMP,
           motivo_cancelamento = 'Chargeback reportado via webhook'
       WHERE hotmart_transaction_id = $1
       RETURNING *`,
      [transacao]
    );
    
    if (resultado.rows.length > 0) {
      console.log('✅ Chargeback processado - ID:', resultado.rows[0].id);
    } else {
      console.log('⚠️ Venda não encontrada para chargeback:', transacao);
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar chargeback:', error);
    throw error;
  }
}

// ===== TESTAR WEBHOOK LOCALMENTE =====
exports.testarWebhook = async (req, res) => {
  console.log('🧪 Teste de webhook');
  
  // Simular dados de teste
  const dadosTeste = {
    event: 'PURCHASE_COMPLETE',
    data: {
      product: {
        id: 'TEST123',
        name: 'Produto Teste'
      },
      buyer: {
        email: 'teste@example.com',
        name: 'Cliente Teste'
      },
      purchase: {
        transaction: 'TRX123456',
        price: 197.00,
        status: 'COMPLETE',
        approved_date: new Date().toISOString()
      }
    }
  };
  
  // Chamar o processamento
  await processarCompraCompleta(dadosTeste.data);
  
  res.json({
    success: true,
    message: 'Teste executado',
    dados: dadosTeste
  });
};