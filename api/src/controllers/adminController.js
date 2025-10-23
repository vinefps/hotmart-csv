const pool = require('../db/connection');

exports.deletarTodos = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM vendas');
    
    res.json({
      success: true,
      message: 'Todos os dados foram deletados',
      data: {
        deletados: result.rowCount
      }
    });
  } catch (error) {
    console.error('Erro ao deletar todos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar dados'
    });
  }
};
