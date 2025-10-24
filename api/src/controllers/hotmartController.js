// controllers/hotmartController.js
const crypto = require('crypto');

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
    
    // TODO: Salvar no banco de dados
    // await salvarCompraNoBanco(compra);
    
    // TODO: Enviar email de confirmação
    // await enviarEmailConfirmacao(compra);
    
    // TODO: Adicionar o comprador no ActiveCampaign
    // await adicionarNoActiveCampaign(compra);
    
    return compra;
    
  } catch (error) {
    console.error('Erro ao processar compra:', error);
    throw error;
  }
}

async function processarCompraCancelada(data) {
  console.log('Processando cancelamento...');
  // Implementar lógica de cancelamento
}

async function processarReembolso(data) {
  console.log('Processando reembolso...');
  // Implementar lógica de reembolso
}

async function processarChargeback(data) {
  console.log('Processando chargeback...');
  // Implementar lógica de chargeback
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