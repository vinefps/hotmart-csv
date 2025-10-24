import { createContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [carregandoAuth, setCarregandoAuth] = useState(false);

  // Verifica se tem token salvo ao iniciar
  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioSalvo = localStorage.getItem('usuario');
    
    if (token && usuarioSalvo) {
      try {
        setUsuario(JSON.parse(usuarioSalvo));
      } catch (error) {
        console.error('Erro ao recuperar usuário:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
      }
    }
  }, []);

  const login = async (email, senha) => {
    setCarregandoAuth(true);
    try {
      const response = await authService.login(email, senha);
      
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('usuario', JSON.stringify(response.usuario));
        setUsuario(response.usuario);
        setCarregandoAuth(false);
        return { success: true };
      }
      
      setCarregandoAuth(false);
      return { 
        success: false, 
        message: response.message || 'Erro ao fazer login' 
      };
    } catch (error) {
      console.error('Erro no login:', error);
      setCarregandoAuth(false);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao conectar com o servidor' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{
      usuario,
      login,
      logout,
      carregandoAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};