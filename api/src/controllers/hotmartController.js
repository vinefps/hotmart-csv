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

// Função auxiliar para salvar compra no banco
async function salvarCompraNoBanco(compra) {
  try {
    const resultado = await pool.query(
      `INSERT INTO vendas
       (nome, email, telefone, produto, tipo_pagamento, faturamento_liquido,
        origem_checkout, status, hotmart_transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (hotmart_transaction_id)
       DO UPDATE SET
         email = EXCLUDED.email,
         telefone = EXCLUDED.telefone,
         tipo_pagamento = EXCLUDED.tipo_pagamento,
         faturamento_liquido = EXCLUDED.faturamento_liquido,
         origem_checkout = EXCLUDED.origem_checkout,
         status = EXCLUDED.status,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, nome, produto, faturamento_liquido, status, hotmart_transaction_id`,
      [
        compra.compradorNome,
        compra.compradorEmail,
        compra.compradorTelefone,
        compra.produtoNome,
        compra.tipoPagamento,
        compra.valor,
        compra.origem,
        'aprovado',
        compra.transacao
      ]
    );

    return resultado.rows[0];
  } catch (error) {
    console.error('Erro ao salvar compra no banco:', error);
    throw error;
  }
}

// Função auxiliar para atualizar status da venda
async function atualizarStatusVenda(transacao, novoStatus, motivo = null) {
  try {
    const resultado = await pool.query(
      `UPDATE vendas
       SET status = $1,
           data_cancelamento = $2,
           motivo_cancelamento = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE hotmart_transaction_id = $4
       RETURNING id, nome, produto, status, hotmart_transaction_id`,
      [
        novoStatus,
        novoStatus !== 'aprovado' ? new Date() : null,
        motivo,
        transacao
      ]
    );

    if (resultado.rows.length === 0) {
      throw new Error(`Venda com transação ${transacao} não encontrada`);
    }

    return resultado.rows[0];
  } catch (error) {
    console.error('Erro ao atualizar status da venda:', error);
    throw error;
  }
}

async function processarCompraCompleta(data) {
  try {
    console.log('Processando compra completa...');

    // Validar dados recebidos
    if (!data) {
      throw new Error('Dados do webhook estão vazios');
    }

    // Extrair informações importantes
    const compra = {
      transacao: data.purchase?.transaction,
      produtoId: data.product?.id,
      produtoNome: data.product?.name,
      compradorEmail: data.buyer?.email,
      compradorNome: data.buyer?.name,
      compradorTelefone: data.buyer?.checkout_phone || data.buyer?.phone,
      valor: data.purchase?.price?.value || data.purchase?.price,
      moeda: data.purchase?.price?.currency_code || 'BRL',
      status: data.purchase?.status,
      tipoPagamento: data.purchase?.payment?.type,
      origem: data.purchase?.checkout_origin || 'Hotmart',
      dataCompra: data.purchase?.approved_date || new Date().toISOString()
    };

    console.log('Dados da compra:', compra);

    // Validar campos obrigatórios
    if (!compra.transacao) {
      throw new Error('Transaction ID é obrigatório');
    }

    if (!compra.compradorNome) {
      throw new Error('Nome do comprador é obrigatório');
    }

    // Salvar no banco de dados
    const vendaSalva = await salvarCompraNoBanco(compra);
    console.log('✅ Venda salva no banco:', vendaSalva.id);

    // TODO: Enviar email de confirmação
    // await enviarEmailConfirmacao(compra);

    // TODO: Adicionar o comprador no ActiveCampaign
    // await adicionarNoActiveCampaign(compra);

    return vendaSalva;

  } catch (error) {
    console.error('Erro ao processar compra:', error);
    throw error;
  }
}

async function processarCompraCancelada(data) {
  try {
    console.log('Processando cancelamento...');

    // Validar dados
    if (!data || !data.purchase?.transaction) {
      throw new Error('Dados de cancelamento inválidos');
    }

    const transacao = data.purchase.transaction;
    const motivo = data.purchase?.cancellation_reason || 'Cancelamento solicitado pelo cliente';

    console.log(`Cancelando venda - Transação: ${transacao}`);
    console.log(`Motivo: ${motivo}`);

    // Atualizar status no banco
    const vendaAtualizada = await atualizarStatusVenda(transacao, 'cancelado', motivo);
    console.log('✅ Venda cancelada no banco:', vendaAtualizada.id);

    // TODO: Enviar email de cancelamento
    // await enviarEmailCancelamento(vendaAtualizada);

    // TODO: Remover do ActiveCampaign ou adicionar tag
    // await removerDoActiveCampaign(vendaAtualizada);

    return vendaAtualizada;

  } catch (error) {
    console.error('Erro ao processar cancelamento:', error);
    throw error;
  }
}

async function processarReembolso(data) {
  try {
    console.log('Processando reembolso...');

    // Validar dados
    if (!data || !data.purchase?.transaction) {
      throw new Error('Dados de reembolso inválidos');
    }

    const transacao = data.purchase.transaction;
    const motivo = data.purchase?.refund_reason || 'Reembolso processado pela Hotmart';
    const valorReembolsado = data.purchase?.price?.value || data.purchase?.price || 0;

    console.log(`Reembolsando venda - Transação: ${transacao}`);
    console.log(`Valor: R$ ${valorReembolsado}`);
    console.log(`Motivo: ${motivo}`);

    // Atualizar status no banco
    const vendaAtualizada = await atualizarStatusVenda(transacao, 'reembolso', motivo);
    console.log('✅ Reembolso registrado no banco:', vendaAtualizada.id);

    // TODO: Enviar email de confirmação de reembolso
    // await enviarEmailReembolso(vendaAtualizada);

    // TODO: Atualizar ActiveCampaign
    // await atualizarTagActiveCampaign(vendaAtualizada, 'reembolsado');

    return vendaAtualizada;

  } catch (error) {
    console.error('Erro ao processar reembolso:', error);
    throw error;
  }
}

async function processarChargeback(data) {
  try {
    console.log('Processando chargeback...');

    // Validar dados
    if (!data || !data.purchase?.transaction) {
      throw new Error('Dados de chargeback inválidos');
    }

    const transacao = data.purchase.transaction;
    const motivo = `Chargeback registrado - ${data.purchase?.chargeback_reason || 'Motivo não especificado'}`;
    const valorChargeback = data.purchase?.price?.value || data.purchase?.price || 0;

    console.log(`⚠️ CHARGEBACK - Transação: ${transacao}`);
    console.log(`Valor: R$ ${valorChargeback}`);
    console.log(`Motivo: ${motivo}`);

    // Atualizar status no banco
    const vendaAtualizada = await atualizarStatusVenda(transacao, 'chargeback', motivo);
    console.log('✅ Chargeback registrado no banco:', vendaAtualizada.id);

    // TODO: Enviar alerta de chargeback
    // await enviarAlertaChargeback(vendaAtualizada);

    // TODO: Remover do ActiveCampaign e adicionar tag de risco
    // await marcarComoRiscoActiveCampaign(vendaAtualizada);

    return vendaAtualizada;

  } catch (error) {
    console.error('Erro ao processar chargeback:', error);
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