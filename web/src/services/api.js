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

// Serviços de autenticação
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

// Serviços de vendas
export const vendasService = {
  listar: async (page = 1, limit = 20, search = '') => {
    const response = await api.get('/vendas', {
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
  obterEstatisticas: async () => {
    const response = await api.get('/vendas/estatisticas');
    return response.data;
  }
};

// Serviços de admin
export const adminService = {
  deletarTodos: async () => {
    const response = await api.delete('/admin/deletar-todos');
    return response.data;
  }
};

export default api;
