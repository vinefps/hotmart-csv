import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========================================
// SERVIÇOS DE AUTENTICAÇÃO
// ========================================
export const authService = {
  login: async (email, senha) => {
    const response = await api.post('/auth/login', { email, senha });
    return response.data;
  },
  verificarToken: async () => {
    const response = await api.get('/auth/verificar');
    return response.data;
  }
};

// ========================================
// SERVIÇOS DE VENDAS
// ========================================
export const vendasService = {
  // ✅ CORRIGIDO: Adicionar suporte para filtro de status
  listar: async (page = 1, limit = 20, search = '', status = null) => {
    const params = { page, limit, search };
    if (status) params.status = status;
    
    const response = await api.get('/vendas', { params });
    return response.data;
  },

  // ✅ NOVO: Listar apenas vendas ativas (aprovadas)
  listarAtivas: async (page = 1, limit = 20, search = '') => {
    const response = await api.get('/vendas/ativas', {
      params: { page, limit, search }
    });
    return response.data;
  },

  // ✅ NOVO: Listar apenas cancelamentos (cancelado, reembolso, chargeback)
  listarCancelamentos: async (page = 1, limit = 20, search = '') => {
    const response = await api.get('/vendas/cancelamentos', {
      params: { page, limit, search }
    });
    return response.data;
  },

  buscarPorId: async (id) => {
    const response = await api.get(`/vendas/${id}`);
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/vendas', dados);
    return response.data;
  },

  atualizar: async (id, dados) => {
    const response = await api.put(`/vendas/${id}`, dados);
    return response.data;
  },

  // Soft delete - marca como cancelado
  deletar: async (id) => {
    const response = await api.delete(`/vendas/${id}`);
    return response.data;
  },

  uploadCSV: async (arquivo) => {
    const formData = new FormData();
    formData.append('file', arquivo);
    const response = await api.post('/vendas/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // ✅ CORRIGIDO: Endpoint correto de estatísticas gerais
  obterEstatisticas: async () => {
    const response = await api.get('/vendas/stats/geral');
    return response.data;
  },

  // ✅ NOVO: Estatísticas por período (últimos X dias)
  obterEstatisticasPeriodo: async (dias = 30) => {
    const response = await api.get('/vendas/stats/periodo', {
      params: { dias }
    });
    return response.data;
  },

  // ✅ NOVO: Obter formato esperado do CSV
  obterFormatoCSV: async () => {
    const response = await api.get('/vendas/upload/formato');
    return response.data;
  }
};

// ========================================
// SERVIÇOS DE ADMIN
// ========================================
export const adminService = {
  deletarTodos: async () => {
    const response = await api.delete('/admin/deletar-todos');
    return response.data;
  }
};

export default api;