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
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [estatisticas, setEstatisticas] = useState({
    totalVendas: 0,
    vendasAtivas: 0,
    vendasCanceladas: 0,
    faturamentoTotal: 0
  });
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    produto: '',
    tipo_pagamento: '',
    faturamento_liquido: '',
    origem_checkout: ''
  });

  useEffect(() => {
    carregarVendas();
    carregarEstatisticas();
  }, [paginaAtual, busca, filtroStatus]);

  const carregarEstatisticas = async () => {
    try {
      // Simulando estatísticas - você pode conectar com sua API
      setEstatisticas({
        totalVendas: 1247,
        vendasAtivas: 1189,
        vendasCanceladas: 58,
        faturamentoTotal: 127849.90
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const carregarVendas = async () => {
    try {
      setCarregando(true);
      let response;
      
      if (filtroStatus === 'ativas') {
        response = await vendasService.listarAtivas(paginaAtual, 20, busca);
      } else if (filtroStatus === 'canceladas') {
        response = await vendasService.listarCancelamentos(paginaAtual, 20, busca);
      } else {
        response = await vendasService.listar(paginaAtual, 20, busca);
      }
      
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
        produto: venda.produto || '',
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
        produto: '',
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
    setCarregando(true);

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
    } finally {
      setCarregando(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta venda?')) {
      try {
        await vendasService.deletar(id);
        mostrarMensagem('sucesso', 'Venda excluída com sucesso!');
        carregarVendas();
      } catch (error) {
        mostrarMensagem('erro', 'Erro ao excluir venda');
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!arquivo) {
      mostrarMensagem('erro', 'Selecione um arquivo');
      return;
    }

    setCarregando(true);
    try {
      const response = await vendasService.uploadCSV(arquivo);
      mostrarMensagem('sucesso', `Upload realizado! ${response.data.totalSucesso} vendas importadas.`);
      setModalUploadAberto(false);
      setArquivo(null);
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

  const renderStatusBadge = (status) => {
    const statusConfig = {
      'aprovado': { 
        bg: 'bg-gradient-to-r from-green-500 to-emerald-500', 
        text: 'text-white', 
        icon: '✅',
        label: 'Aprovado' 
      },
      'cancelado': { 
        bg: 'bg-gradient-to-r from-red-500 to-pink-500', 
        text: 'text-white',
        icon: '❌', 
        label: 'Cancelado' 
      },
      'reembolso': { 
        bg: 'bg-gradient-to-r from-yellow-500 to-orange-500', 
        text: 'text-white',
        icon: '💸', 
        label: 'Reembolso' 
      },
      'chargeback': { 
        bg: 'bg-gradient-to-r from-purple-500 to-indigo-500', 
        text: 'text-white',
        icon: '⚠️', 
        label: 'Chargeback' 
      }
    };

    const config = statusConfig[status] || statusConfig['aprovado'];

    return (
      <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${config.bg} ${config.text} shadow-lg`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  if (carregando && vendas.length === 0) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-blue-500 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total de Vendas</p>
                <p className="text-3xl font-black text-gray-800">{estatisticas.totalVendas}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 font-semibold">+12.5%</span>
              <span className="text-gray-500 ml-2">vs mês anterior</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-green-500 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Vendas Ativas</p>
                <p className="text-3xl font-black text-gray-800">{estatisticas.vendasAtivas}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 font-semibold">95.4%</span>
              <span className="text-gray-500 ml-2">taxa de aprovação</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-red-500 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Cancelamentos</p>
                <p className="text-3xl font-black text-gray-800">{estatisticas.vendasCanceladas}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-red-500 font-semibold">4.6%</span>
              <span className="text-gray-500 ml-2">taxa de cancelamento</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Faturamento Total</p>
                <p className="text-3xl font-black">{formatarMoeda(estatisticas.faturamentoTotal)}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-white font-semibold">+28.7%</span>
              <span className="text-white/80 ml-2">crescimento mensal</span>
            </div>
          </div>
        </div>
        {/* Mensagem de feedback */}
        {mensagem.texto && (
          <div className={`mb-6 p-4 rounded-xl flex items-center shadow-lg animate-slideIn ${
            mensagem.tipo === 'sucesso' 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
              : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
          }`}>
            {mensagem.tipo === 'sucesso' ? (
              <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-semibold">{mensagem.texto}</span>
          </div>
        )}

        {/* Barra de Pesquisa e Filtros */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Barra de Pesquisa */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nome, email, produto, tipo de pagamento..."
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>

            {/* Filtros de Status */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFiltroStatus('todos');
                  setPaginaAtual(1);
                }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  filtroStatus === 'todos'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                  </svg>
                  Todas
                </span>
              </button>
              <button
                onClick={() => {
                  setFiltroStatus('ativas');
                  setPaginaAtual(1);
                }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  filtroStatus === 'ativas'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Ativas
                </span>
              </button>
              <button
                onClick={() => {
                  setFiltroStatus('canceladas');
                  setPaginaAtual(1);
                }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  filtroStatus === 'canceladas'
                    ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Canceladas
                </span>
              </button>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2">
              <button
                onClick={() => setModalUploadAberto(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                Upload CSV
              </button>
              <button
                onClick={() => abrirModal()}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Nova Venda
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Vendas */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Pagamento
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    HP Code
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vendas.map((venda) => (
                  <tr key={venda.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                          {venda.nome?.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">{venda.nome}</div>
                          <div className="text-xs text-gray-500">{venda.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{venda.produto || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                        {venda.tipo_pagamento || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{formatarMoeda(venda.faturamento_liquido)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(venda.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                        {venda.hotmart_transaction_id || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => abrirModal(venda)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(venda.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          title="Excluir"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Página <span className="font-semibold">{paginaAtual}</span> de <span className="font-semibold">{totalPaginas}</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPaginaAtual(paginaAtual - 1)}
                  disabled={paginaAtual === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                {[...Array(Math.min(5, totalPaginas))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setPaginaAtual(page)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        paginaAtual === page
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                          : 'bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPaginaAtual(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Modal de Criar/Editar Venda */}
        <Modal isOpen={modalAberto} onClose={fecharModal}>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-2 rounded-t-xl">
            <h2 className="text-2xl font-bold text-gray-800 text-center">
              {vendaSelecionada ? '✏️ Editar Venda' : '➕ Nova Venda'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="João da Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="joao@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Produto
                </label>
                <input
                  type="text"
                  name="produto"
                  value={formData.produto}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Nome do Produto"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Pagamento
                </label>
                <select
                  name="tipo_pagamento"
                  value={formData.tipo_pagamento}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Boleto">Boleto</option>
                  <option value="PIX">PIX</option>
                  <option value="PayPal">PayPal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Valor
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="faturamento_liquido"
                  value={formData.faturamento_liquido}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="197.00"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Origem do Checkout
                </label>
                <input
                  type="text"
                  name="origem_checkout"
                  value={formData.origem_checkout}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Hotmart, Site, etc..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={fecharModal}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={carregando}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg disabled:opacity-50"
              >
                {carregando ? 'Salvando...' : vendaSelecionada ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal de Upload CSV */}
        <Modal isOpen={modalUploadAberto} onClose={() => setModalUploadAberto(false)}>
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-2 rounded-t-xl">
            <h2 className="text-2xl font-bold text-gray-800 text-center">
              📤 Upload de CSV
            </h2>
          </div>
          <form onSubmit={handleUpload} className="p-6">
            <div className="mb-6">
              <div className="border-4 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"></path>
                </svg>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setArquivo(e.target.files[0])}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold shadow-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  Escolher Arquivo
                </label>
                {arquivo && (
                  <p className="mt-3 text-sm text-gray-600">
                    Arquivo selecionado: <span className="font-semibold">{arquivo.name}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Formato Esperado</h3>
              <p className="text-sm text-blue-700">
                O sistema aceita automaticamente CSV da Hotmart ou formato simples com as colunas:
              </p>
              <ul className="mt-2 text-xs text-blue-600 space-y-1">
                <li>• Nome, Email, Telefone, Produto</li>
                <li>• Tipo de Pagamento, Faturamento líquido</li>
                <li>• Origem de Checkout, Status</li>
                <li>• Separador: ponto e vírgula (;)</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setModalUploadAberto(false);
                  setArquivo(null);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!arquivo || carregando}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {carregando ? 'Enviando...' : 'Fazer Upload'}
              </button>
            </div>
          </form>
        </Modal>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Vendas;