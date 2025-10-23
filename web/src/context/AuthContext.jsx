import { createContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioSalvo = localStorage.getItem('usuario');

    if (token && usuarioSalvo) {
      setUsuario(JSON.parse(usuarioSalvo));
      verificarToken();
    } else {
      setCarregando(false);
    }
  }, []);

  const verificarToken = async () => {
    try {
      const response = await authService.verificarToken();
      setUsuario(response.data);
    } catch (error) {
      logout();
    } finally {
      setCarregando(false);
    }
  };

  const login = async (email, senha) => {
    try {
      const response = await authService.login(email, senha);
      const { token, usuario } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));

      setUsuario(usuario);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao fazer login'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  const estaAutenticado = () => {
    return !!usuario;
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        carregando,
        login,
        logout,
        estaAutenticado
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
