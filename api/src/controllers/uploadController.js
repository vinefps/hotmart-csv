// ✅ UPLOAD CONTROLLER - COMPATÍVEL COM FORMATO HOTMART
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const pool = require('../db/connection');

// Configurar multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'));
    }
  }
});

/**
 * Detecta o formato do CSV e extrai os dados
 */
const extrairDadosCSV = (row) => {
  // Limpar BOM se existir
  const cleanRow = {};
  for (const key in row) {
    const cleanKey = key.replace(/^\uFEFF/, '').trim();
    cleanRow[cleanKey] = row[key];
  }

  // ========================================
  // FORMATO HOTMART (detectado automaticamente)
  // ========================================
  const isHotmart = cleanRow['Nome do Produto'] !== undefined;

  if (isHotmart) {
    console.log('📦 Formato detectado: HOTMART');
    
    return {
      nome: cleanRow['Nome'] || null,
      email: cleanRow['Email'] || null,
      telefone: cleanRow['DDD'] && cleanRow['Telefone'] 
        ? `(${cleanRow['DDD']}) ${cleanRow['Telefone']}`
        : cleanRow['Telefone'] || null,
      produto: cleanRow['Nome do Produto'] || null,
      tipo_pagamento: cleanRow['Tipo de Pagamento'] || cleanRow['Meio de Pagamento'] || null,
      faturamento_liquido: cleanRow['Faturamento líquido'] || null,
      origem_checkout: cleanRow['Origem de Checkout'] || cleanRow['Origem'] || null,
      status: cleanRow['Status'] === 'Aprovado' ? 'aprovado' : 'cancelado',
      hotmart_transaction_id: cleanRow['Transação'] || null
    };
  }

  // ========================================
  // FORMATO SIMPLES (padrão antigo)
  // ========================================
  console.log('📦 Formato detectado: SIMPLES');
  
  return {
    nome: cleanRow['Nome'] || null,
    email: cleanRow['Email'] || null,
    telefone: cleanRow['DDD'] && cleanRow['Telefone']
      ? `(${cleanRow['DDD']}) ${cleanRow['Telefone']}`
      : cleanRow['Telefone Completo'] || cleanRow['Telefone'] || null,
    produto: cleanRow['Produto'] || cleanRow['Nome do Produto'] || null,
    tipo_pagamento: cleanRow['Tipo de Pagamento'] || null,
    faturamento_liquido: cleanRow['Faturamento líquido'] || cleanRow['Faturamento Líquido'] || cleanRow['Valor'] || null,
    origem_checkout: cleanRow['Origem de Checkout'] || cleanRow['Origem'] || null,
    status: 'aprovado',
    hotmart_transaction_id: null
  };
};

// Controller de upload
exports.uploadCSV = [
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      });
    }

    const filePath = req.file.path;
    const vendas = [];
    const erros = [];
    let totalSucesso = 0;
    let totalErros = 0;

    try {
      // Ler CSV
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath, { encoding: 'utf8' })
          .pipe(csv({ separator: ';' }))
          .on('data', (row) => {
            vendas.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      console.log(`📊 Total de linhas lidas: ${vendas.length}`);
      if (vendas.length > 0) {
        console.log('📝 Colunas do CSV:', Object.keys(vendas[0]));
      }

      // Processar cada venda
      for (let i = 0; i < vendas.length; i++) {
        try {
          // Extrair dados (detecta formato automaticamente)
          const dados = extrairDadosCSV(vendas[i]);

          // Limpar e validar nome
          const nome = dados.nome ? dados.nome.toString().trim() : null;
          
          if (!nome) {
            erros.push(`Linha ${i + 2}: Nome é obrigatório`);
            totalErros++;
            continue;
          }

          // Limpar e validar outros campos
          const email = dados.email ? dados.email.toString().trim() : null;
          const telefone = dados.telefone ? dados.telefone.toString().trim() : null;
          const produto = dados.produto ? dados.produto.toString().trim() : null;
          const tipo_pagamento = dados.tipo_pagamento ? dados.tipo_pagamento.toString().trim() : null;
          const origem_checkout = dados.origem_checkout ? dados.origem_checkout.toString().trim() : null;
          const hotmart_transaction_id = dados.hotmart_transaction_id ? dados.hotmart_transaction_id.toString().trim() : null;

          // Converter faturamento líquido para número
          let faturamento_liquido = null;
          if (dados.faturamento_liquido) {
            const faturamentoStr = dados.faturamento_liquido
              .toString()
              .replace(/\./g, '')  // Remove separador de milhar
              .replace(',', '.'); // Troca vírgula decimal por ponto
            faturamento_liquido = parseFloat(faturamentoStr) || null;
          }

          console.log(`✅ Linha ${i + 2}: nome="${nome}", produto="${produto}", valor=${faturamento_liquido}`);

          // Verificar se já existe (por transaction ID)
          if (hotmart_transaction_id) {
            const existe = await pool.query(
              'SELECT id FROM vendas WHERE hotmart_transaction_id = $1',
              [hotmart_transaction_id]
            );

            if (existe.rows.length > 0) {
              console.log(`⚠️ Venda duplicada (transaction: ${hotmart_transaction_id}) - ignorando`);
              erros.push(`Linha ${i + 2}: Venda já existe (transação ${hotmart_transaction_id})`);
              totalErros++;
              continue;
            }
          }

          // Inserir no banco
          const resultado = await pool.query(
            `INSERT INTO vendas 
             (nome, email, telefone, produto, tipo_pagamento, faturamento_liquido, 
              origem_checkout, status, hotmart_transaction_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, produto, telefone, faturamento_liquido`,
            [
              nome,
              email,
              telefone,
              produto,
              tipo_pagamento,
              faturamento_liquido,
              origem_checkout,
              dados.status,
              hotmart_transaction_id
            ]
          );

          console.log(
            `✅ Inserido - ID: ${resultado.rows[0].id}, ` +
            `Produto: ${resultado.rows[0].produto}, ` +
            `Valor: R$ ${resultado.rows[0].faturamento_liquido}`
          );

          totalSucesso++;
        } catch (error) {
          console.error(`❌ Erro na linha ${i + 2}:`, error.message);
          erros.push(`Linha ${i + 2}: ${error.message}`);
          totalErros++;
        }
      }

      // Deletar arquivo após processamento
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        message: 'Upload processado com sucesso',
        data: {
          totalLinhas: vendas.length,
          totalSucesso,
          totalErros,
          erros: erros.slice(0, 10) // Mostrar apenas os 10 primeiros erros
        }
      });
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      
      // Deletar arquivo em caso de erro
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao processar arquivo CSV',
        error: error.message
      });
    }
  }
];

/**
 * OBTER FORMATO DO CSV ESPERADO
 */
exports.obterFormatoCSV = (req, res) => {
  const formatos = {
    formato_simples: {
      separator: ';',
      encoding: 'UTF-8',
      colunas: [
        { nome: 'Nome', obrigatorio: true, exemplo: 'João da Silva' },
        { nome: 'Email', obrigatorio: false, exemplo: 'joao@email.com' },
        { nome: 'DDD', obrigatorio: false, exemplo: '11' },
        { nome: 'Telefone', obrigatorio: false, exemplo: '999999999' },
        { nome: 'Telefone Completo', obrigatorio: false, exemplo: '(11) 99999-9999' },
        { nome: 'Produto', obrigatorio: false, exemplo: 'Curso de Marketing' },
        { nome: 'Tipo de Pagamento', obrigatorio: false, exemplo: 'Cartão de Crédito' },
        { nome: 'Faturamento líquido', obrigatorio: false, exemplo: '97,00' },
        { nome: 'Origem de Checkout', obrigatorio: false, exemplo: 'Hotmart' }
      ],
      exemplo_csv: 'Nome;Email;DDD;Telefone;Produto;Tipo de Pagamento;Faturamento líquido;Origem de Checkout\n' +
                   'João da Silva;joao@email.com;11;999999999;Curso de Marketing;Cartão de Crédito;97,00;Hotmart'
    },
    formato_hotmart: {
      separator: ';',
      encoding: 'UTF-8',
      descricao: 'O sistema detecta AUTOMATICAMENTE o formato Hotmart (relatório de vendas exportado da Hotmart)',
      colunas_usadas: [
        'Nome do Produto',
        'Transação',
        'Tipo de Pagamento',
        'Meio de Pagamento',
        'Status',
        'Nome',
        'Email',
        'DDD',
        'Telefone',
        'Origem de Checkout',
        'Faturamento líquido'
      ],
      nota: 'Use o relatório de vendas diretamente da Hotmart - não precisa modificar!'
    }
  };

  res.json({
    success: true,
    message: 'O sistema aceita DOIS formatos de CSV automaticamente',
    data: formatos
  });
};