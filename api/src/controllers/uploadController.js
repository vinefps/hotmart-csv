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
          // Extrair campos - VERSÃO MELHORADA
          const nome = row['Nome'] ? row['Nome'].trim() : null;
          const email = row['Email'] ? row['Email'].trim() : null;
          
          // Opção 1: Se DDD e Telefone estão em colunas separadas
          let telefoneCompleto = null;
          const ddd = row['DDD'] ? row['DDD'].toString().trim() : '';
          const telefone = row['Telefone'] ? row['Telefone'].toString().trim() : '';
          
          if (ddd && telefone) {
            telefoneCompleto = `(${ddd}) ${telefone}`;
          } else if (telefone) {
            // Se não tem DDD, apenas telefone
            telefoneCompleto = telefone;
          } else if (row['Telefone Completo']) {
            // Opção 2: Se existe coluna Telefone Completo
            telefoneCompleto = row['Telefone Completo'].toString().trim() || null;
          }

          const tipo_pagamento = row['Tipo de Pagamento'] ? row['Tipo de Pagamento'].trim() : null;
          
          // Converter faturamento líquido para número
          let faturamento_liquido = null;
          if (row['Faturamento líquido']) {
            const faturamentoStr = row['Faturamento líquido'].toString().replace(',', '.');
            faturamento_liquido = parseFloat(faturamentoStr) || null;
          }

          const origem_checkout = row['Origem de Checkout'] ? row['Origem de Checkout'].toString().trim() : null;

          // Validar campos obrigatórios
          if (!nome) {
            erros.push(`Linha ${i + 2}: Nome é obrigatório`);
            totalErros++;
            continue;
          }

          console.log(`✅ Linha ${i + 2}: nome=${nome}, telefone=${telefoneCompleto}`);

          // Inserir no banco
          const resultado = await pool.query(
            `INSERT INTO vendas (nome, email, telefone, tipo_pagamento, faturamento_liquido, origem_checkout)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, telefone`,
            [nome, email || null, telefoneCompleto, tipo_pagamento || null, faturamento_liquido, origem_checkout || null]
          );

          console.log(`✅ Inserido com sucesso - ID: ${resultado.rows[0].id}, Telefone: ${resultado.rows[0].telefone}`);

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
          erros: erros.slice(0, 10)
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