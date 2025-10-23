import { useState, useEffect } from 'react';
import { vendasService } from '../services/api';
import Header from '../components/Header';
import Modal from '../components/Modal';
import Loading from '../components/Loading';

const Vendas = () => {
  const [vendas, setVendas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [arquivo, setArquivo] = useState(null);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    tipo_pagamento: '',
    faturamento_liquido: '',
    origem_checkout: ''
  });

  useEffect(() => {
    carregarVendas();
  }, [paginaAtual, busca]);

  const carregarVendas = async () => {
    try {
      setCarregando(true);
      const response = await vendasService.listar(paginaAtual, 20, busca);
      setVendas(response.data);
      setTotalPaginas(response.pagination.totalPages);
    } catch (error) {
      mostrarMensagem('erro', 'Erro ao carregar vendas');
    } finally {
      setCarregando(false);
    }
  };

  const mostrarMensagem = (tipo, texto) => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);
  };

  const abrirModal = (venda = null) => {
    if (venda) {
      setVendaSelecionada(venda);
      setFormData({
        nome: venda.nome || '',
        email: venda.email || '',
        telefone: venda.telefone || '',
        tipo_pagamento: venda.tipo_pagamento || '',
        faturamento_liquido: venda.faturamento_liquido || '',
        origem_checkout: venda.origem_checkout || ''
      });
    } else {
      setVendaSelecionada(null);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        tipo_pagamento: '',
        faturamento_liquido: '',
        origem_checkout: ''
      });
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setVendaSelecionada(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (vendaSelecionada) {
        await vendasService.atualizar(vendaSelecionada.id, formData);
        mostrarMensagem('sucesso', 'Venda atualizada com sucesso!');
      } else {
        await vendasService.criar(formData);
        mostrarMensagem('sucesso', 'Venda criada com sucesso!');
      }
      fecharModal();
      carregarVendas();
    } catch (error) {
      mostrarMensagem('erro', error.response?.data?.message || 'Erro ao salvar venda');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!arquivo) {
      mostrarMensagem('erro', 'Selecione um arquivo CSV');
      return;
    }

    try {
      setCarregando(true);
      const response = await vendasService.uploadCSV(arquivo);
      setModalUploadAberto(false);
      setArquivo(null);
      mostrarMensagem('sucesso', `Upload concluído! ${response.data.totalSucesso} vendas importadas.`);
      carregarVendas();
    } catch (error) {
      mostrarMensagem('erro', error.response?.data?.message || 'Erro ao fazer upload');
    } finally {
      setCarregando(false);
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (carregando && vendas.length === 0) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensagem de feedback */}
        {mensagem.texto && (
          <div className={`mb-4 p-4 rounded-lg ${
            mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {mensagem.texto}
          </div>
        )}

        {/* Barra de Pesquisa e Botões */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Buscar por nome, email, tipo de pagamento ou origem..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPaginaAtual(1);
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setModalUploadAberto(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📤 Upload CSV
          </button>
        </div>

        {/* Tabela de Vendas */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {carregando ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Carregando vendas...</p>
            </div>
          ) : vendas.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Nenhuma venda encontrada</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Telefone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tipo Pagamento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Faturamento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Origem</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vendas.map((venda) => (
                      <tr key={venda.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{venda.nome}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{venda.email || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{venda.telefone || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{venda.tipo_pagamento || '-'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-600">
                          {formatarMoeda(venda.faturamento_liquido)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{venda.origem_checkout || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => abrirModal(venda)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            ✏️ Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                      disabled={paginaAtual === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                      disabled={paginaAtual === totalPaginas}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Próximo
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Página <span className="font-medium">{paginaAtual}</span> de{' '}
                        <span className="font-medium">{totalPaginas}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                          disabled={paginaAtual === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          ‹
                        </button>
                        <button
                          onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                          disabled={paginaAtual === totalPaginas}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          ›
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Criar/Editar */}
      <Modal
        isOpen={modalAberto}
        onClose={fecharModal}
        title={vendaSelecionada ? 'Editar Venda' : 'Nova Venda'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              name="nome"
              required
              value={formData.nome}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <input
              type="text"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              placeholder="(11) 99999-9999"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Pagamento
            </label>
            <input
              type="text"
              name="tipo_pagamento"
              value={formData.tipo_pagamento}
              onChange={handleChange}
              placeholder="Ex: Cartão de Crédito, Pix"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Faturamento Líquido
            </label>
            <input
              type="number"
              step="0.01"
              name="faturamento_liquido"
              value={formData.faturamento_liquido}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Origem Checkout
            </label>
            <textarea
              name="origem_checkout"
              value={formData.origem_checkout}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={fecharModal}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {vendaSelecionada ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Upload */}
      <Modal
        isOpen={modalUploadAberto}
        onClose={() => setModalUploadAberto(false)}
        title="Upload de CSV"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o arquivo CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setArquivo(e.target.files[0])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Formato esperado:</strong> CSV com separador <code>;</code>
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <strong>Colunas necessárias:</strong>
            </p>
            <ul className="text-sm text-gray-600 ml-4 mt-1 list-disc">
              <li>Nome</li>
              <li>Email</li>
              <li>DDD</li>
              <li>Telefone</li>
              <li>Tipo de Pagamento</li>
              <li>Faturamento líquido</li>
              <li>Origem de Checkout</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setModalUploadAberto(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!arquivo}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fazer Upload
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Vendas;
