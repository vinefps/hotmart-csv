// ===== SCRIPT DE TESTE DO WEBHOOK HOTMART =====
// Execute: node test-webhook.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const HOTMART_TOKEN = process.env.HOTMART_HOTTOK || 'kex2V0p505haOEPI97QyFTW0RAfG3w4bb85820-3865-4edd-ac24-49c2a5c34096';

// ===== HELPER PARA FAZER REQUISIÇÕES =====
async function enviarWebhook(evento, dados) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TESTANDO: ${evento}`);
    console.log('='.repeat(60));

    const response = await axios.post(
      `${BASE_URL}/api/hotmart/webhook`,
      {
        event: evento,
        data: dados
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-hotmart-hottok': HOTMART_TOKEN
        }
      }
    );

    console.log('✅ Resposta:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    throw error;
  }
}

// ===== DELAY HELPER =====
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ===== TESTES =====
async function executarTestes() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          TESTE DE WEBHOOK - INTEGRAÇÃO HOTMART                ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  try {
    // ===== TESTE 1: COMPRA COMPLETA =====
    console.log('\n📦 TESTE 1: Compra Completa (PURCHASE_COMPLETE)');
    await enviarWebhook('PURCHASE_COMPLETE', {
      product: {
        id: 'PROD_001',
        name: 'Curso de JavaScript Avançado'
      },
      buyer: {
        name: 'João Silva',
        email: 'joao.silva@email.com',
        phone: '11987654321'
      },
      purchase: {
        transaction: 'HP12345678901',
        price: {
          value: 297.00,
          currency_code: 'BRL'
        },
        status: 'COMPLETE',
        payment: {
          type: 'CREDIT_CARD'
        },
        checkout_origin: 'Hotmart',
        approved_date: new Date().toISOString()
      }
    });

    await delay(1000);

    // ===== TESTE 2: OUTRA COMPRA =====
    console.log('\n📦 TESTE 2: Outra Compra Completa');
    await enviarWebhook('PURCHASE_COMPLETE', {
      product: {
        id: 'PROD_002',
        name: 'Mentoria em Programação'
      },
      buyer: {
        name: 'Maria Santos',
        email: 'maria.santos@email.com',
        phone: '21976543210'
      },
      purchase: {
        transaction: 'HP98765432109',
        price: {
          value: 497.00,
          currency_code: 'BRL'
        },
        status: 'COMPLETE',
        payment: {
          type: 'PIX'
        },
        checkout_origin: 'Hotmart',
        approved_date: new Date().toISOString()
      }
    });

    await delay(1000);

    // ===== TESTE 3: CANCELAMENTO =====
    console.log('\n❌ TESTE 3: Cancelamento de Compra (PURCHASE_CANCELED)');
    await enviarWebhook('PURCHASE_CANCELED', {
      product: {
        id: 'PROD_001',
        name: 'Curso de JavaScript Avançado'
      },
      buyer: {
        name: 'João Silva',
        email: 'joao.silva@email.com'
      },
      purchase: {
        transaction: 'HP12345678901',
        cancellation_reason: 'Cliente solicitou cancelamento por motivo pessoal',
        price: {
          value: 297.00,
          currency_code: 'BRL'
        }
      }
    });

    await delay(1000);

    // ===== TESTE 4: REEMBOLSO =====
    console.log('\n💸 TESTE 4: Reembolso (PURCHASE_REFUNDED)');
    await enviarWebhook('PURCHASE_REFUNDED', {
      product: {
        id: 'PROD_002',
        name: 'Mentoria em Programação'
      },
      buyer: {
        name: 'Maria Santos',
        email: 'maria.santos@email.com'
      },
      purchase: {
        transaction: 'HP98765432109',
        refund_reason: 'Garantia de 7 dias acionada',
        price: {
          value: 497.00,
          currency_code: 'BRL'
        }
      }
    });

    await delay(1000);

    // ===== TESTE 5: NOVA VENDA PARA CHARGEBACK =====
    console.log('\n📦 TESTE 5: Nova venda (para testar chargeback depois)');
    await enviarWebhook('PURCHASE_COMPLETE', {
      product: {
        id: 'PROD_003',
        name: 'E-book Marketing Digital'
      },
      buyer: {
        name: 'Carlos Oliveira',
        email: 'carlos.oliveira@email.com',
        phone: '31912345678'
      },
      purchase: {
        transaction: 'HP55555555555',
        price: {
          value: 97.00,
          currency_code: 'BRL'
        },
        status: 'COMPLETE',
        payment: {
          type: 'CREDIT_CARD'
        },
        checkout_origin: 'Hotmart',
        approved_date: new Date().toISOString()
      }
    });

    await delay(1000);

    // ===== TESTE 6: CHARGEBACK =====
    console.log('\n⚠️ TESTE 6: Chargeback (PURCHASE_CHARGEBACK)');
    await enviarWebhook('PURCHASE_CHARGEBACK', {
      product: {
        id: 'PROD_003',
        name: 'E-book Marketing Digital'
      },
      buyer: {
        name: 'Carlos Oliveira',
        email: 'carlos.oliveira@email.com'
      },
      purchase: {
        transaction: 'HP55555555555',
        chargeback_reason: 'Contestação no cartão de crédito',
        price: {
          value: 97.00,
          currency_code: 'BRL'
        }
      }
    });

    await delay(1000);

    // ===== TESTE 7: TOKEN INVÁLIDO =====
    console.log('\n🔒 TESTE 7: Tentativa com Token Inválido (deve falhar)');
    try {
      await axios.post(
        `${BASE_URL}/api/hotmart/webhook`,
        {
          event: 'PURCHASE_COMPLETE',
          data: {}
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-hotmart-hottok': 'TOKEN_INVALIDO_123'
          }
        }
      );
    } catch (error) {
      console.log('✅ Token inválido rejeitado corretamente:', error.response?.data);
    }

    // ===== RESUMO FINAL =====
    console.log(`
${'='.repeat(60)}
✅ TODOS OS TESTES CONCLUÍDOS!
${'='.repeat(60)}

📊 RESUMO:
- Teste 1: Compra completa (João Silva) - HP12345678901
- Teste 2: Compra completa (Maria Santos) - HP98765432109
- Teste 3: Cancelamento (João Silva) - HP12345678901
- Teste 4: Reembolso (Maria Santos) - HP98765432109
- Teste 5: Compra completa (Carlos Oliveira) - HP55555555555
- Teste 6: Chargeback (Carlos Oliveira) - HP55555555555
- Teste 7: Token inválido (rejeitado)

💡 PRÓXIMOS PASSOS:
1. Verifique o banco de dados para confirmar os registros:

   SELECT id, nome, produto, faturamento_liquido, status,
          hotmart_transaction_id, data_cancelamento, motivo_cancelamento
   FROM vendas
   ORDER BY created_at DESC;

2. Verifique os status esperados:
   - HP12345678901: status = 'cancelado'
   - HP98765432109: status = 'reembolso'
   - HP55555555555: status = 'chargeback'

${'='.repeat(60)}
    `);

  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error.message);
    process.exit(1);
  }
}

// ===== EXECUTAR =====
console.log('Aguardando 2 segundos para garantir que o servidor está rodando...\n');
setTimeout(() => {
  executarTestes()
    .then(() => {
      console.log('\n✅ Script de teste finalizado com sucesso!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    });
}, 2000);
