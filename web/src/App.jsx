import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Vendas from './pages/Vendas';

// Componente para proteger rotas
const PrivateRoute = ({ children }) => {
  const { usuario } = useContext(AuthContext);
  
  // Se não estiver autenticado, redireciona para login
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Componente para rota pública (login)
const PublicRoute = ({ children }) => {
  const { usuario } = useContext(AuthContext);
  
  // Se já estiver autenticado, redireciona para home
  if (usuario) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rota pública - Login */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          
          {/* Rota protegida - Vendas */}
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <Vendas />
              </PrivateRoute>
            } 
          />
          
          {/* Redireciona qualquer rota não encontrada para home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;