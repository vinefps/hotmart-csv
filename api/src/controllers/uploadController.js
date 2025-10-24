// ✅ UPLOAD CONTROLLER ATUALIZADO - COM PRODUTO
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
            // Limpar BOM se existir
            const cleanRow = {};
            for (const key in row) {
              const cleanKey = key.replace(/^\uFEFF/, '').trim();
              cleanRow[cleanKey] = row[key];
            }
            vendas.push(cleanRow);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      console.log(`📊 Total de linhas lidas: ${vendas.length}`);
      if (vendas.length > 0) {
        console.log('📝 Colunas do CSV:', Object.keys(vendas[0]));
        console.log('📝 Primeira linha:', vendas[0]);
      }

      // Processar cada venda
      for (let i = 0; i < vendas.length; i++) {
        const row = vendas[i];

        try {
          // Extrair campos
          const nome = row['Nome'] ? row['Nome'].trim() : null;
          const email = row['Email'] ? row['Email'].trim() : null;
          
          // ✅ NOVO: Campo Produto
          const produto = row['Produto'] || row['Nome do Produto'] || row['produto'] || null;
          if (produto) {
            produto = produto.toString().trim();
          }
          
          // Telefone (DDD + Telefone ou Telefone Completo)
          let telefoneCompleto = null;
          const ddd = row['DDD'] ? row['DDD'].toString().trim() : '';
          const telefone = row['Telefone'] ? row['Telefone'].toString().trim() : '';
          
          if (ddd && telefone) {
            telefoneCompleto = `(${ddd}) ${telefone}`;
          } else if (telefone) {
            telefoneCompleto = telefone;
          } else if (row['Telefone Completo']) {
            telefoneCompleto = row['Telefone Completo'].toString().trim() || null;
          }

          const tipo_pagamento = row['Tipo de Pagamento'] ? row['Tipo de Pagamento'].trim() : null;
          
          // Converter faturamento líquido para número
          let faturamento_liquido = null;
          if (row['Faturamento líquido'] || row['Faturamento Líquido'] || row['Valor']) {
            const faturamentoStr = (row['Faturamento líquido'] || row['Faturamento Líquido'] || row['Valor'])
              .toString()
              .replace(',', '.');
            faturamento_liquido = parseFloat(faturamentoStr) || null;
          }

          const origem_checkout = row['Origem de Checkout'] || row['Origem'] || null;
          if (origem_checkout) {
            origem_checkout = origem_checkout.toString().trim();
          }

          // Validar campos obrigatórios
          if (!nome) {
            erros.push(`Linha ${i + 2}: Nome é obrigatório`);
            totalErros++;
            continue;
          }

          console.log(`✅ Linha ${i + 2}: nome=${nome}, produto=${produto}, telefone=${telefoneCompleto}`);

          // Inserir no banco COM PRODUTO
          const resultado = await pool.query(
            `INSERT INTO vendas 
             (nome, email, telefone, produto, tipo_pagamento, faturamento_liquido, origem_checkout, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'aprovado')
             RETURNING id, produto, telefone`,
            [
              nome, 
              email || null, 
              telefoneCompleto, 
              produto || null,
              tipo_pagamento || null, 
              faturamento_liquido, 
              origem_checkout || null
            ]
          );

          console.log(
            `✅ Inserido - ID: ${resultado.rows[0].id}, ` +
            `Produto: ${resultado.rows[0].produto}, ` +
            `Telefone: ${resultado.rows[0].telefone}`
          );

          totalSucesso++;
        } catch (error) {
          console.error(`Erro na linha ${i + 2}:`, error.message);
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
      console.error('Erro no upload:', error);
      
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
  const formato = {
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
  };

  res.json({
    success: true,
    data: formato
  });
};